import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { 
  useListDailyWork, 
  getListDailyWorkQueryKey, 
  useCreateDailyWork, 
  useUpdateDailyWork,
  useDeleteDailyWork,
  getListTasksQueryKey,
  useListUsers,
  getListUsersQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { exportToCsv } from "@/lib/export-csv";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Download, Plus, Edit2, Trash2, Filter, Copy, CheckCircle, XCircle } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const dailyWorkSchema = z.object({
  action: z.string().min(1, "Action is required"),
  how: z.string().optional(),
  who: z.string().optional(),
  assignedBy: z.string().optional(),
  date: z.string().min(1, "Date is required"),
  startDate: z.string().optional(),
  completionDate: z.string().optional(),
  status: z.string().min(1, "Status is required"),
  completionPct: z.coerce.number().min(0).max(100).optional(),
  remarks: z.string().optional(),
});

type DailyWorkFormData = z.infer<typeof dailyWorkSchema>;

// Helper function to calculate progress based on status
const getProgressFromStatus = (status: string, currentProgress?: number): number => {
  switch(status) {
    case "yts": return 0;
    case "completed": return 100;
    case "cancelled": return 0;
    case "hold": return currentProgress ?? 0; // Keep existing progress
    default: return currentProgress ?? 0; // WIP - user can edit
  }
};

// Helper function to check if progress field should be disabled
const isProgressDisabled = (status: string): boolean => {
  return status === "yts" || status === "completed" || status === "hold" || status === "cancelled";
};

export default function TLDailyWork() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");
  
  // ── My Work State ──
  const [myDateFilter, setMyDateFilter] = useState<string>(today);
  const [myStatusFilter, setMyStatusFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedWork, setSelectedWork] = useState<any>(null);
  const [approvalTarget, setApprovalTarget] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: myWork, isLoading: myLoading } = useListDailyWork(
    { 
      userId: user?.id,
      date: myDateFilter || undefined,
      status: myStatusFilter !== "all" ? myStatusFilter : undefined,
    },
    { query: { queryKey: getListDailyWorkQueryKey({ 
      userId: user?.id,
      date: myDateFilter || undefined,
      status: myStatusFilter !== "all" ? myStatusFilter : undefined,
    }) } }
  );

  // ── Team Work State ──
  const [teamDateFilter, setTeamDateFilter] = useState<string>("");
  const [teamStatusFilter, setTeamStatusFilter] = useState<string>("all");
  const [teamUserFilter, setTeamUserFilter] = useState<string>("all");

  // Fetch team members using tlId to get ALL members from ALL teams managed by this TL
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  
  useEffect(() => {
    if (user?.id) {
      const token = localStorage.getItem("auth_token");
      fetch(`http://localhost:8080/api/users?tlId=${user.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => setTeamMembers(data))
        .catch((err) => console.error("Error fetching team members:", err));
    }
  }, [user?.id]);

  const { data: teamWork, isLoading: teamLoading } = useListDailyWork(
    { 
      tlId: user?.id,
      date: teamDateFilter || undefined,
      status: teamStatusFilter !== "all" ? teamStatusFilter : undefined,
      userId: teamUserFilter !== "all" ? parseInt(teamUserFilter) : undefined
    },
    { query: { 
      queryKey: getListDailyWorkQueryKey({ 
        tlId: user?.id,
        date: teamDateFilter || undefined,
        status: teamStatusFilter !== "all" ? teamStatusFilter : undefined,
        userId: teamUserFilter !== "all" ? parseInt(teamUserFilter) : undefined
      }),
      enabled: !!user?.id
    } }
  );

  const createMutation = useCreateDailyWork();
  const updateMutation = useUpdateDailyWork();
  const deleteMutation = useDeleteDailyWork();

  const form = useForm<DailyWorkFormData>({
    resolver: zodResolver(dailyWorkSchema),
    defaultValues: {
      action: "",
      how: "",
      who: user?.name || "",
      assignedBy: user?.name || "",
      date: today,
      startDate: today,
      completionDate: "",
      status: "wip",
      completionPct: 0,
      remarks: "",
    },
  });

  // Watch status changes to automatically update progress
  const watchStatus = form.watch("status");
  const watchProgress = form.watch("completionPct");
  
  useEffect(() => {
    if (watchStatus) {
      const newProgress = getProgressFromStatus(watchStatus, watchProgress);
      if (newProgress !== watchProgress) {
        form.setValue("completionPct", newProgress);
      }
    }
  }, [watchStatus]);

  const handleMyExport = () => {
    if (myWork) {
      exportToCsv("my_daily_work.csv", myWork.map(w => ({
        ID: w.id,
        Date: w.date,
        Action: w.action,
        How: w.how || '',
        Who: w.who || '',
        'Assigned By': w.assignedBy || '',
        Status: w.status,
        Progress: `${w.completionPct || 0}%`,
        'Start Date': w.startDate || '',
        'Completion Date': w.completionDate || '',
        Remarks: w.remarks || '',
      })));
      toast({ title: "Export successful", description: "My daily work exported to CSV" });
    }
  };

  const handleTeamExport = () => {
    if (teamWork) {
      exportToCsv("team_daily_work.csv", teamWork.map(w => ({
        ID: w.id,
        Date: w.date,
        'Team Member': w.userName || '',
        Action: w.action,
        How: w.how || '',
        Who: w.who || '',
        'Assigned By': w.assignedBy || '',
        Status: w.status,
        Progress: `${w.completionPct || 0}%`,
        'Start Date': w.startDate || '',
        'Completion Date': w.completionDate || '',
        Remarks: w.remarks || '',
      })));
      toast({ title: "Export successful", description: "Team daily work exported to CSV" });
    }
  };

  const onSubmit = (values: DailyWorkFormData) => {
    const workData = { ...values, assignedBy: values.assignedBy || user?.name || "Self" };
    if (selectedWork) {
      updateMutation.mutate(
        { id: selectedWork.id, data: workData },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListDailyWorkQueryKey() });
            queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
            setIsEditOpen(false);
            toast({ title: "Success", description: "Daily work updated successfully" });
          }
        }
      );
    } else {
      createMutation.mutate(
        { data: { ...workData, userId: user?.id, teamId: user?.teamId } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListDailyWorkQueryKey() });
            queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
            setIsCreateOpen(false);
            form.reset();
            toast({ title: "Success", description: "Daily work added successfully" });
          }
        }
      );
    }
  };

  const handleDelete = () => {
    if (selectedWork) {
      deleteMutation.mutate(
        { id: selectedWork.id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListDailyWorkQueryKey() });
            queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
            setIsDeleteOpen(false);
            toast({ title: "Success", description: "Daily work deleted successfully" });
          }
        }
      );
    }
  };

  const refreshWorkLists = () => queryClient.invalidateQueries({ queryKey: getListDailyWorkQueryKey() });
  const handleApprove = async (work: any) => {
    try {
      const response = await fetch(`http://localhost:8080/api/daily-work/${work.id}/approve`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("auth_token")}` }, body: JSON.stringify({ approvedBy: user?.id }) });
      if (!response.ok) throw new Error();
      refreshWorkLists(); queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
      toast({ title: "Daily work approved" });
    } catch { toast({ title: "Unable to approve daily work", variant: "destructive" }); }
  };
  const handleReject = async () => {
    if (!approvalTarget || !rejectionReason.trim()) return;
    try {
      const response = await fetch(`http://localhost:8080/api/daily-work/${approvalTarget.id}/reject`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("auth_token")}` }, body: JSON.stringify({ approvedBy: user?.id, reason: rejectionReason.trim() }) });
      if (!response.ok) throw new Error();
      refreshWorkLists(); queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
      setApprovalTarget(null); setRejectionReason("");
      toast({ title: "Daily work rejected" });
    } catch { toast({ title: "Unable to reject daily work", variant: "destructive" }); }
  };

  const openEdit = (work: any) => {
    setSelectedWork(work);
    form.reset({
      action: work.action,
      how: work.how || "",
      who: work.who || "",
      assignedBy: work.assignedBy || "",
      date: work.date,
      startDate: work.startDate || "",
      completionDate: work.completionDate || "",
      status: work.status,
      completionPct: work.completionPct || 0,
      remarks: work.remarks || "",
    });
    setIsEditOpen(true);
  };

  const openDelete = (work: any) => {
    setSelectedWork(work);
    setIsDeleteOpen(true);
  };

  const WorkFormFields = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
      <FormField control={form.control} name="date" render={({ field }) => (
        <FormItem>
          <FormLabel>Date *</FormLabel>
          <FormControl><Input type="date" {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
      
      <FormField control={form.control} name="action" render={({ field }) => (
        <FormItem className="md:col-span-2">
          <FormLabel>Action / Task *</FormLabel>
          <FormControl><Input placeholder="What did you do?" {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />

      <FormField control={form.control} name="how" render={({ field }) => (
        <FormItem className="md:col-span-2">
          <FormLabel>How (Method/Tool)</FormLabel>
          <FormControl><Input {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />

      <FormField control={form.control} name="who" render={({ field }) => (
        <FormItem>
          <FormLabel>Who</FormLabel>
          <FormControl><Input {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />

      <FormField control={form.control} name="assignedBy" render={({ field }) => (
        <FormItem>
          <FormLabel>Assigned By</FormLabel>
          <FormControl><Input placeholder="Name of person who assigned this work" {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />

      <FormField control={form.control} name="status" render={({ field }) => (
        <FormItem>
          <FormLabel>Status *</FormLabel>
          <Select onValueChange={field.onChange} defaultValue={field.value}>
            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
            <SelectContent>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="wip">WIP</SelectItem>
              <SelectItem value="yts">YTS</SelectItem>
              <SelectItem value="hold">Hold</SelectItem>
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )} />

      <FormField control={form.control} name="completionPct" render={({ field }) => (
        <FormItem>
          <FormLabel>Progress %</FormLabel>
          <FormControl>
            <Input 
              type="number" 
              min="0" 
              max="100" 
              {...field} 
              disabled={isProgressDisabled(watchStatus)}
              className={isProgressDisabled(watchStatus) ? "bg-gray-100 cursor-not-allowed" : ""}
            />
          </FormControl>
          <FormMessage />
          {isProgressDisabled(watchStatus) && (
            <p className="text-xs text-muted-foreground mt-1">
              Progress is auto-managed for this status
            </p>
          )}
        </FormItem>
      )} />

      <FormField control={form.control} name="startDate" render={({ field }) => (
        <FormItem>
          <FormLabel>Start Date</FormLabel>
          <FormControl><Input type="date" {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />

      <FormField control={form.control} name="completionDate" render={({ field }) => (
        <FormItem>
          <FormLabel>Completion Date</FormLabel>
          <FormControl><Input type="date" {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />

      <FormField control={form.control} name="remarks" render={({ field }) => (
        <FormItem className="md:col-span-2">
          <FormLabel>Remarks</FormLabel>
          <FormControl><Input {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Daily Work Log</h1>
        <p className="text-gray-500 mt-1">Track your own daily work and view your team's progress.</p>
      </div>

      <Tabs defaultValue="my-work">
        <TabsList className="mb-4">
          <TabsTrigger value="my-work">My Work</TabsTrigger>
          <TabsTrigger value="team-work">Team Work</TabsTrigger>
        </TabsList>

        {/* ── My Work Tab ── */}
        <TabsContent value="my-work">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <p className="text-sm text-gray-500">Log and track your daily actions</p>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" onClick={handleMyExport}>
                  <Download className="mr-2 h-4 w-4" /> Export
                </Button>
                <Dialog open={isCreateOpen} onOpenChange={(open) => {
                  if (open) {
                    form.reset({ ...form.getValues(), date: myDateFilter || today });
                    setSelectedWork(null);
                  }
                  setIsCreateOpen(open);
                }}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" /> Add Work
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Add Daily Work</DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)}>
                        <WorkFormFields />
                        <div className="flex justify-end pt-4 border-t">
                          <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} className="mr-2">Cancel</Button>
                          <Button type="submit" disabled={createMutation.isPending}>Save Work</Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border flex flex-wrap gap-4 items-center">
              <div className="flex items-center text-sm font-medium text-gray-500">
                <Filter className="w-4 h-4 mr-2" /> Filters
              </div>
              <div className="w-48">
                <Input 
                  type="date" 
                  value={myDateFilter} 
                  onChange={(e) => setMyDateFilter(e.target.value)} 
                  placeholder="Filter by Date"
                />
              </div>
              <div className="w-48">
                <Select value={myStatusFilter} onValueChange={setMyStatusFilter}>
                  <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="wip">WIP</SelectItem>
                    <SelectItem value="yts">YTS</SelectItem>
                    <SelectItem value="hold">Hold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(myDateFilter !== "" || myStatusFilter !== "all") && (
                <Button variant="ghost" onClick={() => { setMyDateFilter(""); setMyStatusFilter("all"); }}>
                  Clear Filters
                </Button>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead>Date</TableHead>
                      <TableHead className="min-w-[200px]">Action</TableHead>
                      <TableHead>Who</TableHead>
                      <TableHead>Assigned By</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Approval</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Remarks</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myLoading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="h-32 text-center text-gray-500">
                          Loading daily work...
                        </TableCell>
                      </TableRow>
                    ) : myWork && myWork.length > 0 ? (
                      myWork.map((work) => (
                        <TableRow key={work.id}>
                          <TableCell className="whitespace-nowrap">{work.date}</TableCell>
                          <TableCell className="font-medium">
                            <div>{work.action}</div>
                            {work.how && <div className="text-xs text-gray-500 font-normal mt-1">via {work.how}</div>}
                          </TableCell>
                          <TableCell>{work.who || "-"}</TableCell>
                          <TableCell>{work.assignedBy || "-"}</TableCell>
                          <TableCell>
                            <StatusBadge status={work.status} />
                          </TableCell>
                          <TableCell><StatusBadge status={(work as any).approvalStatus || "pending"} /></TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-primary" 
                                  style={{ width: `${work.completionPct || 0}%` }} 
                                />
                              </div>
                              <span className="text-xs text-gray-500">{work.completionPct || 0}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm max-w-[200px] truncate" title={work.remarks || ""}>
                            {work.remarks || "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" onClick={() => openEdit(work)} className="h-8 w-8 text-gray-500 hover:text-primary">
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => openDelete(work)} className="h-8 w-8 text-gray-500 hover:text-red-600">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9} className="h-32 text-center text-gray-500">
                          No daily work records found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── Team Work Tab ── */}
        <TabsContent value="team-work">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <p className="text-sm text-gray-500">View daily work logs from your team members</p>
              <Button variant="outline" onClick={handleTeamExport}>
                <Download className="mr-2 h-4 w-4" /> Export
              </Button>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border flex flex-wrap gap-4 items-center">
              <div className="flex items-center text-sm font-medium text-gray-500">
                <Filter className="w-4 h-4 mr-2" /> Filters
              </div>
              <div className="w-48">
                <Input 
                  type="date" 
                  value={teamDateFilter} 
                  onChange={(e) => setTeamDateFilter(e.target.value)} 
                />
              </div>
              <div className="w-48">
                <Select value={teamStatusFilter} onValueChange={setTeamStatusFilter}>
                  <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="wip">WIP</SelectItem>
                    <SelectItem value="yts">YTS</SelectItem>
                    <SelectItem value="hold">Hold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-48">
                <Select value={teamUserFilter} onValueChange={setTeamUserFilter}>
                  <SelectTrigger><SelectValue placeholder="Team Member" /></SelectTrigger>
                  <SelectContent className="max-h-[300px] overflow-y-auto">
                    <SelectItem value="all">All Members</SelectItem>
                    {teamMembers && teamMembers.map(member => (
                      <SelectItem key={member.id} value={member.id.toString()}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {(teamDateFilter !== "" || teamStatusFilter !== "all" || teamUserFilter !== "all") && (
                <Button variant="ghost" onClick={() => { setTeamDateFilter(""); setTeamStatusFilter("all"); setTeamUserFilter("all"); }}>
                  Clear Filters
                </Button>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead>Date</TableHead>
                      <TableHead>Member</TableHead>
                      <TableHead>Assigned By</TableHead>
                      <TableHead className="min-w-[200px]">Action</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Approval</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Remarks</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teamLoading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="h-32 text-center text-gray-500">
                          Loading daily work...
                        </TableCell>
                      </TableRow>
                    ) : teamWork && teamWork.length > 0 ? (
                      teamWork.map((work) => (
                        <TableRow key={work.id}>
                          <TableCell className="whitespace-nowrap">{work.date}</TableCell>
                          <TableCell className="font-medium">{work.userName || "-"}</TableCell>
                          <TableCell>{work.assignedBy || "-"}</TableCell>
                          <TableCell className="font-medium">
                            <div>{work.action}</div>
                            {work.how && <div className="text-xs text-gray-500 font-normal mt-1">via {work.how}</div>}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={work.status} />
                          </TableCell>
                          <TableCell><StatusBadge status={(work as any).approvalStatus || "pending"} /></TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div className="h-full bg-primary" style={{ width: `${work.completionPct || 0}%` }} />
                              </div>
                              <span className="text-xs text-gray-500">{work.completionPct || 0}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm max-w-[200px] truncate" title={work.remarks || ""}>
                            {work.remarks || "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            {work.status === "completed" && (["pending", "resubmitted"].includes((work as any).approvalStatus || "pending")) && <div className="flex justify-end gap-1">
                              <Button title="Approve daily work" variant="ghost" size="icon" onClick={() => handleApprove(work)} className="h-8 w-8 text-green-600 hover:text-green-700"><CheckCircle className="h-4 w-4" /></Button>
                              <Button title="Reject daily work" variant="ghost" size="icon" onClick={() => { setApprovalTarget(work); setRejectionReason(""); }} className="h-8 w-8 text-red-600 hover:text-red-700"><XCircle className="h-4 w-4" /></Button>
                            </div>}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9} className="h-32 text-center text-gray-500">
                          No daily work records found matching filters.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Daily Work</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <WorkFormFields />
              <div className="flex justify-end pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} className="mr-2">Cancel</Button>
                <Button type="submit" disabled={updateMutation.isPending}>Update Work</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this daily work record. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 focus:ring-red-600">
              {deleteMutation.isPending ? "Deleting..." : "Delete Record"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!approvalTarget} onOpenChange={(open) => { if (!open) { setApprovalTarget(null); setRejectionReason(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Daily Work</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Give the employee a reason so they can correct and resubmit the work.</p>
          <Input value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} placeholder="Rejection reason" />
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setApprovalTarget(null)}>Cancel</Button><Button variant="destructive" disabled={!rejectionReason.trim()} onClick={handleReject}>Reject Daily Work</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
