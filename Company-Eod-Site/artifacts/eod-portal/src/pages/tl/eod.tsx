import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, subDays } from "date-fns";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListEod,
  getListEodQueryKey,
  useCreateEod,
  useUpdateEod,
  useListUsers,
  getListUsersQueryKey
} from "@workspace/api-client-react";
import { exportToCsv } from "@/lib/export-csv";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AttendanceBadge } from "@/components/ui/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, CheckCircle2, AlertCircle, Download, Filter, Eye, CheckCircle, XCircle, RotateCcw } from "lucide-react";

const eodSchema = z.object({
  date: z.string(),
  attendanceStatus: z.string().min(1, "Attendance is required"),
  tasksCompleted: z.coerce.number().min(0).optional(),
  trainingAttended: z.boolean().default(false).optional(),
  trainingTopic: z.string().optional(),
  internalWork: z.string().optional(),
  challenges: z.string().optional(),
  tomorrowPlan: z.string().optional(),
  remarks: z.string().optional(),
});

type EodFormData = z.infer<typeof eodSchema>;

const ABSENT_STATUSES = ["absent", "leave", "half-day"];

export default function TLEod() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");

  // ── My EOD state ──
  const [showReminder, setShowReminder] = useState(false);
  const [reminderDismissed, setReminderDismissed] = useState(false);

  const { data: myEods, isLoading: myLoading } = useListEod(
    { date: today, userId: user?.id },
    { query: { queryKey: getListEodQueryKey({ date: today, userId: user?.id }) } },
  );
  const existingEod = myEods?.[0];
  const createMutation = useCreateEod();
  const updateMutation = useUpdateEod();

  const form = useForm<EodFormData>({
    resolver: zodResolver(eodSchema),
    defaultValues: {
      date: today,
      attendanceStatus: "present",
      tasksCompleted: 0,
      trainingAttended: false,
      trainingTopic: "",
      internalWork: "",
      challenges: "",
      tomorrowPlan: "",
      remarks: "",
    },
  });

  useEffect(() => {
    if (existingEod) {
      form.reset({
        date: existingEod.date,
        attendanceStatus: existingEod.attendanceStatus,
        tasksCompleted: existingEod.tasksCompleted || 0,
        trainingAttended: existingEod.trainingAttended || false,
        trainingTopic: existingEod.trainingTopic || "",
        internalWork: existingEod.internalWork || "",
        challenges: existingEod.challenges || "",
        tomorrowPlan: existingEod.tomorrowPlan || "",
        remarks: existingEod.remarks || "",
      });
    }
  }, [existingEod, form]);

  useEffect(() => {
    const checkReminder = () => {
      const now = new Date();
      const h = now.getHours();
      const m = now.getMinutes();
      if (h === 17 && m >= 30 && m <= 45 && !existingEod && !reminderDismissed) {
        setShowReminder(true);
      }
    };
    checkReminder();
    const interval = setInterval(checkReminder, 60_000);
    return () => clearInterval(interval);
  }, [existingEod, reminderDismissed]);

  const attendanceStatus = form.watch("attendanceStatus");
  const trainingAttended = form.watch("trainingAttended");
  const isAbsent = ABSENT_STATUSES.includes(attendanceStatus);

  function onSubmit(values: EodFormData) {
    if (existingEod) {
      updateMutation.mutate(
        { id: existingEod.id, data: values },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListEodQueryKey({ date: today, userId: user?.id }) });
            toast({ title: "EOD Updated", description: "Your EOD report has been updated." });
          },
          onError: () => toast({ title: "Error", description: "Failed to update EOD report.", variant: "destructive" }),
        },
      );
    } else {
      createMutation.mutate(
        { data: values },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListEodQueryKey({ date: today, userId: user?.id }) });
            toast({ title: "EOD Submitted", description: "Your EOD report has been submitted." });
            setShowReminder(false);
            setReminderDismissed(true);
          },
          onError: () => toast({ title: "Error", description: "Failed to submit EOD report.", variant: "destructive" }),
        },
      );
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  // ── Team EODs state ──
  const [dateFilter, setDateFilter] = useState<string>(today);
  const [userFilter, setUserFilter] = useState<string>("all");
  const [selectedEod, setSelectedEod] = useState<any>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  
  // Approval dialog states
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [sendBackDialogOpen, setSendBackDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [sendBackReason, setSendBackReason] = useState("");
  const [approvalComments, setApprovalComments] = useState("");

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

  const { data: teamEods, isLoading: teamLoading } = useListEod(
    { 
      tlId: user?.id, 
      date: dateFilter || undefined,
      userId: userFilter !== "all" ? parseInt(userFilter) : undefined
    },
    {
      query: {
        queryKey: getListEodQueryKey({ 
          tlId: user?.id, 
          date: dateFilter || undefined,
          userId: userFilter !== "all" ? parseInt(userFilter) : undefined
        }),
        enabled: !!user?.id,
      },
    },
  );

  const handleExport = () => {
    if (teamEods) {
      exportToCsv("team_eod_export.csv", teamEods.map(e => ({
        ID: e.id,
        Date: e.date,
        "Team Member": e.userName || "",
        Attendance: e.attendanceStatus,
        "Submitted At": new Date(e.submittedAt).toLocaleString(),
        "Tasks Completed": e.tasksCompleted || 0,
        "Training Attended": e.trainingAttended ? "Yes" : "No",
        "Training Topic": e.trainingTopic || "",
        "Internal Work": e.internalWork || "",
        Challenges: e.challenges || "",
        "Tomorrow Plan": e.tomorrowPlan || "",
        Remarks: e.remarks || "",
      })));
      toast({ title: "Export successful", description: "Team EODs exported to CSV" });
    }
  };

  // Approve EOD
  const handleApprove = async (eod: any) => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`http://localhost:8080/api/eod/${eod.id}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          approvedBy: user?.id,
          comments: approvalComments || null,
        }),
      });

      if (response.ok) {
        toast({
          title: "✅ Approved",
          description: `EOD from ${eod.userName} has been approved`,
        });
        setApprovalComments("");
        // Refresh the list
        queryClient.invalidateQueries({ 
          queryKey: getListEodQueryKey({ 
            tlId: user?.id, 
            date: dateFilter || undefined,
            userId: userFilter !== "all" ? parseInt(userFilter) : undefined
          })
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to approve EOD",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve EOD",
        variant: "destructive",
      });
    }
  };

  // Reject EOD
  const handleReject = async () => {
    if (!selectedEod || !rejectionReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for rejection",
        variant: "destructive",
      });
      return;
    }

    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`http://localhost:8080/api/eod/${selectedEod.id}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          approvedBy: user?.id,
          reason: rejectionReason,
          comments: approvalComments || null,
        }),
      });

      if (response.ok) {
        toast({
          title: "❌ Rejected",
          description: `EOD from ${selectedEod.userName} has been rejected`,
          variant: "destructive",
        });
        setRejectDialogOpen(false);
        setRejectionReason("");
        setApprovalComments("");
        // Refresh the list
        queryClient.invalidateQueries({ 
          queryKey: getListEodQueryKey({ 
            tlId: user?.id, 
            date: dateFilter || undefined,
            userId: userFilter !== "all" ? parseInt(userFilter) : undefined
          })
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to reject EOD",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject EOD",
        variant: "destructive",
      });
    }
  };

  // Send Back for Correction
  const handleSendBack = async () => {
    if (!selectedEod || !sendBackReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for sending back",
        variant: "destructive",
      });
      return;
    }

    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`http://localhost:8080/api/eod/${selectedEod.id}/send-back`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          approvedBy: user?.id,
          reason: sendBackReason,
          comments: approvalComments || null,
        }),
      });

      if (response.ok) {
        toast({
          title: "🔄 Sent Back",
          description: `EOD from ${selectedEod.userName} has been sent back for correction`,
        });
        setSendBackDialogOpen(false);
        setSendBackReason("");
        setApprovalComments("");
        // Refresh the list
        queryClient.invalidateQueries({ 
          queryKey: getListEodQueryKey({ 
            tlId: user?.id, 
            date: dateFilter || undefined,
            userId: userFilter !== "all" ? parseInt(userFilter) : undefined
          })
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to send back EOD",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send back EOD",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Daily EOD</h1>
        <p className="text-gray-500 mt-1">Submit your own EOD report and review your team's submissions.</p>
      </div>

      {/* Reminder Dialog */}
      <Dialog open={showReminder} onOpenChange={open => { setShowReminder(open); if (!open) setReminderDismissed(true); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center text-amber-600">
              <Clock className="w-5 h-5 mr-2" /> EOD Reminder
            </DialogTitle>
            <DialogDescription className="text-base pt-3 pb-2">
              ⏰ Please submit your EOD before <strong>5:45 PM</strong>!
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end pt-2">
            <Button onClick={() => { setShowReminder(false); setReminderDismissed(true); }}>
              I&apos;m on it
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="my-eod">
        <TabsList className="mb-4">
          <TabsTrigger value="my-eod" className="relative">
            My EOD
            {!existingEod && !myLoading && (
              <span className="ml-2 inline-flex h-2 w-2 rounded-full bg-amber-500" title="Not submitted yet" />
            )}
            {existingEod && (
              <span className="ml-2 inline-flex h-2 w-2 rounded-full bg-green-500" title="Submitted" />
            )}
          </TabsTrigger>
          <TabsTrigger value="team-eods">Team EODs</TabsTrigger>
        </TabsList>

        {/* ── My EOD Tab ── */}
        <TabsContent value="my-eod">
          <div className="space-y-4 max-w-4xl">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {format(new Date(), "EEEE, MMMM d, yyyy")}
              </p>
              {existingEod && (
                <div className="flex items-center bg-green-50 text-green-700 px-3 py-1.5 rounded-md border border-green-200 text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  Submitted at{" "}
                  {new Date(existingEod.submittedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              )}
            </div>

            {myLoading ? (
              <Card className="animate-pulse"><CardContent className="h-64" /></Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>{existingEod ? "Update Your EOD Report" : "Submit Your EOD Report"}</CardTitle>
                  <CardDescription>
                    {isAbsent
                      ? "Mark your attendance. EOD details are not required when absent or on leave."
                      : "Fill out the details below to log your daily work."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="date"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Date</FormLabel>
                              <FormControl>
                                <Input {...field} readOnly className="bg-gray-50" />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="attendanceStatus"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Attendance Status *</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="present">✅ Present</SelectItem>
                                  <SelectItem value="absent">❌ Absent</SelectItem>
                                  <SelectItem value="leave">🏖️ Leave</SelectItem>
                                  <SelectItem value="half-day">⏰ Half Day</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {isAbsent && (
                        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-semibold text-amber-800">EOD Not Required</p>
                            <p className="text-sm text-amber-700 mt-0.5">
                              Since you are marked as <strong>{attendanceStatus}</strong>, detailed EOD submission is not required.
                              You can add optional remarks below.
                            </p>
                          </div>
                        </div>
                      )}

                      <FormField
                        control={form.control}
                        name="remarks"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Remarks {isAbsent ? "(Optional)" : ""}</FormLabel>
                            <FormControl>
                              <Input
                                placeholder={isAbsent ? "Reason for absence / leave notes..." : "Any other notes..."}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {!isAbsent && (
                        <div className="border-t pt-4 space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField
                              control={form.control}
                              name="tasksCompleted"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Tasks Completed</FormLabel>
                                  <FormControl>
                                    <Input type="number" min="0" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="trainingAttended"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 border rounded-md shadow-sm">
                                  <FormControl>
                                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                  </FormControl>
                                  <div className="space-y-1 leading-none">
                                    <FormLabel>Attended Training Today?</FormLabel>
                                  </div>
                                </FormItem>
                              )}
                            />
                          </div>

                          {trainingAttended && (
                            <FormField
                              control={form.control}
                              name="trainingTopic"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Training Topic</FormLabel>
                                  <FormControl>
                                    <Input placeholder="What did you learn today?" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}

                          <FormField
                            control={form.control}
                            name="internalWork"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Internal Work / Details</FormLabel>
                                <FormControl>
                                  <Textarea placeholder="Describe the work you completed today..." className="min-h-24" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="challenges"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Challenges / Blockers</FormLabel>
                                <FormControl>
                                  <Textarea placeholder="Any challenges or blockers faced?" className="min-h-20" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="tomorrowPlan"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Plan for Tomorrow</FormLabel>
                                <FormControl>
                                  <Textarea placeholder="What will you work on tomorrow?" className="min-h-20" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}

                      <div className="flex justify-end pt-2">
                        <Button type="submit" size="lg" disabled={isPending}>
                          {isPending
                            ? "Submitting..."
                            : existingEod
                              ? isAbsent ? "Update Attendance" : "Update EOD Report"
                              : isAbsent ? "Submit Attendance" : "Submit EOD Report"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ── Team EODs Tab ── */}
        <TabsContent value="team-eods">
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <p className="text-sm text-gray-500">End-of-Day reports submitted by your team members.</p>
              <Button variant="outline" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" /> Export CSV
              </Button>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border flex flex-wrap gap-4 items-center">
              <div className="flex items-center text-sm font-medium text-gray-500">
                <Filter className="w-4 h-4 mr-2" /> Filters
              </div>
              <div className="w-48">
                <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
              </div>
              <div className="w-48">
                <Select value={userFilter} onValueChange={setUserFilter}>
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
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setDateFilter(today)}>Today</Button>
                <Button variant="outline" size="sm" onClick={() => setDateFilter(format(subDays(new Date(), 1), "yyyy-MM-dd"))}>Yesterday</Button>
              </div>
              {(dateFilter !== "" || userFilter !== "all") && (
                <Button variant="ghost" size="sm" onClick={() => { setDateFilter(""); setUserFilter("all"); }}>Clear</Button>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead>Date</TableHead>
                      <TableHead>Team Member</TableHead>
                      <TableHead>Attendance</TableHead>
                      <TableHead>Tasks Done</TableHead>
                      <TableHead>Training</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teamLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-32 text-center text-gray-500">Loading team submissions…</TableCell>
                      </TableRow>
                    ) : teamEods && teamEods.length > 0 ? (
                      teamEods.map((eod) => (
                        <TableRow key={eod.id}>
                          <TableCell className="whitespace-nowrap">{eod.date}</TableCell>
                          <TableCell className="font-medium">{eod.userName}</TableCell>
                          <TableCell><AttendanceBadge status={eod.attendanceStatus} /></TableCell>
                          <TableCell>{eod.tasksCompleted || 0}</TableCell>
                          <TableCell>
                            {eod.trainingAttended ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">Yes</span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">No</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {new Date(eod.submittedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </TableCell>
                          <TableCell>
                            {eod.approvalStatus === "pending" ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                Pending
                              </span>
                            ) : eod.approvalStatus === "approved" ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                ✅ Approved
                              </span>
                            ) : eod.approvalStatus === "rejected" ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                ❌ Rejected
                              </span>
                            ) : eod.approvalStatus === "resubmitted" ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                Resubmitted
                              </span>
                            ) : eod.approvalStatus === "sent_back" ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                                🔄 Sent Back
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                Unknown
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => { setSelectedEod(eod); setIsViewOpen(true); }}
                                className="h-8 px-2"
                              >
                                <Eye className="h-4 w-4 mr-1" /> View
                              </Button>
                              {(eod.approvalStatus === "pending" || eod.approvalStatus === "resubmitted") && (
                                <>
                                  <Button 
                                    variant="default"
                                    size="sm"
                                    className="h-8 px-2 bg-green-600 hover:bg-green-700"
                                    onClick={() => handleApprove(eod)}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" /> Approve
                                  </Button>
                                  <Button 
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-2 text-yellow-600 border-yellow-600 hover:bg-yellow-50"
                                    onClick={() => { setSelectedEod(eod); setSendBackDialogOpen(true); }}
                                  >
                                    <RotateCcw className="h-4 w-4 mr-1" /> Send Back
                                  </Button>
                                  <Button 
                                    variant="destructive"
                                    size="sm"
                                    className="h-8 px-2"
                                    onClick={() => { setSelectedEod(eod); setRejectDialogOpen(true); }}
                                  >
                                    <XCircle className="h-4 w-4 mr-1" /> Reject
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="h-32 text-center text-gray-500">
                          No EOD submissions found for the selected criteria.
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

      {/* View Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>EOD Report Details</DialogTitle>
          </DialogHeader>
          {selectedEod && (
            <div className="space-y-6 pt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg border">
                <div>
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Team Member</div>
                  <div className="font-medium text-gray-900">{selectedEod.userName}</div>
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Date</div>
                  <div className="font-medium text-gray-900">{selectedEod.date}</div>
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Attendance</div>
                  <AttendanceBadge status={selectedEod.attendanceStatus} />
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Submitted At</div>
                  <div className="font-medium text-gray-900">{new Date(selectedEod.submittedAt).toLocaleTimeString()}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 border-b pb-2 mb-3">Work Summary</h3>
                  <div className="space-y-4">
                    <div>
                      <span className="text-sm text-gray-500 block mb-1">Tasks Completed</span>
                      <span className="font-medium">{selectedEod.tasksCompleted || 0}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500 block mb-1">Internal Work Details</span>
                      <div className="text-sm whitespace-pre-wrap bg-gray-50 p-3 rounded-md min-h-20 border border-gray-100">
                        {selectedEod.internalWork || "No details provided."}
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 border-b pb-2 mb-3">Training & Challenges</h3>
                  <div className="space-y-4">
                    <div>
                      <span className="text-sm text-gray-500 block mb-1">Training Attended</span>
                      <div className="font-medium">
                        {selectedEod.trainingAttended ? `Yes — ${selectedEod.trainingTopic || "Topic not specified"}` : "No"}
                      </div>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500 block mb-1">Challenges / Blockers</span>
                      <div className="text-sm whitespace-pre-wrap bg-gray-50 p-3 rounded-md min-h-20 border border-gray-100 text-amber-900">
                        {selectedEod.challenges || "None reported."}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900 border-b pb-2 mb-3">Planning & Remarks</h3>
                <div className="space-y-4">
                  <div>
                    <span className="text-sm text-gray-500 block mb-1">Plan for Tomorrow</span>
                    <div className="text-sm whitespace-pre-wrap bg-gray-50 p-3 rounded-md min-h-16 border border-gray-100">
                      {selectedEod.tomorrowPlan || "No plan provided."}
                    </div>
                  </div>
                  {selectedEod.remarks && (
                    <div>
                      <span className="text-sm text-gray-500 block mb-1">Remarks</span>
                      <div className="text-sm whitespace-pre-wrap bg-gray-50 p-3 rounded-md border border-gray-100">
                        {selectedEod.remarks}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end pt-4 border-t mt-4">
            <Button onClick={() => setIsViewOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>❌ Reject EOD</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this EOD submission from {selectedEod?.userName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Reason for Rejection *</label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g., Incomplete information, tasks not properly documented..."
                rows={3}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Additional Comments (Optional)</label>
              <Textarea
                value={approvalComments}
                onChange={(e) => setApprovalComments(e.target.value)}
                placeholder="Any additional feedback..."
                rows={2}
                className="mt-1"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => { setRejectDialogOpen(false); setRejectionReason(""); setApprovalComments(""); }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              Reject EOD
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Back Dialog */}
      <Dialog open={sendBackDialogOpen} onOpenChange={setSendBackDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>🔄 Send Back for Correction</DialogTitle>
            <DialogDescription>
              Provide feedback for {selectedEod?.userName} to improve their EOD
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Corrections Needed *</label>
              <Textarea
                value={sendBackReason}
                onChange={(e) => setSendBackReason(e.target.value)}
                placeholder="e.g., Please add more details about task completion, clarify the challenges faced..."
                rows={3}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Additional Feedback (Optional)</label>
              <Textarea
                value={approvalComments}
                onChange={(e) => setApprovalComments(e.target.value)}
                placeholder="Any helpful suggestions..."
                rows={2}
                className="mt-1"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => { setSendBackDialogOpen(false); setSendBackReason(""); setApprovalComments(""); }}>
              Cancel
            </Button>
            <Button className="bg-yellow-600 hover:bg-yellow-700" onClick={handleSendBack}>
              Send Back
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
