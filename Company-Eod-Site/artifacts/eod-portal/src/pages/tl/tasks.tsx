import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { 
  useListTasks, 
  getListTasksQueryKey, 
  useCreateTask, 
  useUpdateTask,
  useDeleteTask,
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
import { Download, Plus, Edit2, Trash2, Filter } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const taskSchema = z.object({
  taskCode: z.string().optional(),
  taskName: z.string().min(1, "Task name is required"),
  how: z.string().optional(),
  who: z.string().optional(),
  assignedBy: z.string().optional(),
  priority: z.string().optional(),
  plannedStartDate: z.string().optional(),
  plannedEndDate: z.string().optional(),
  actualStartDate: z.string().optional(),
  actualEndDate: z.string().optional(),
  status: z.string().min(1, "Status is required"),
  completionPct: z.coerce.number().min(0).max(100).optional(),
  dependency: z.string().optional(),
  remarks: z.string().optional(),
  etc: z.string().optional(),
  userId: z.coerce.number().optional(), // Specific for TL to assign to users
});

type TaskFormData = z.infer<typeof taskSchema>;

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

export default function TLTasks() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // ── My Tasks State ──
  const [myStatusFilter, setMyStatusFilter] = useState<string>("all");
  const [myPriorityFilter, setMyPriorityFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [isMyTask, setIsMyTask] = useState(true); // Track which tab context we're in

  const { data: myTasks, isLoading: myLoading } = useListTasks(
    { 
      userId: user?.id,
      status: myStatusFilter !== "all" ? myStatusFilter : undefined,
    },
    { query: { 
      queryKey: getListTasksQueryKey({ 
        userId: user?.id,
        status: myStatusFilter !== "all" ? myStatusFilter : undefined,
      }),
      enabled: !!user?.id
    } }
  );

  // ── Team Tasks State ──
  const [teamStatusFilter, setTeamStatusFilter] = useState<string>("all");
  const [teamPriorityFilter, setTeamPriorityFilter] = useState<string>("all");
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

  const { data: teamTasks, isLoading: teamLoading } = useListTasks(
    { 
      tlId: user?.id,
      status: teamStatusFilter !== "all" ? teamStatusFilter : undefined,
      userId: teamUserFilter !== "all" ? parseInt(teamUserFilter) : undefined
    },
    { query: { 
      queryKey: getListTasksQueryKey({ 
        tlId: user?.id,
        status: teamStatusFilter !== "all" ? teamStatusFilter : undefined,
        userId: teamUserFilter !== "all" ? parseInt(teamUserFilter) : undefined
      }),
      enabled: !!user?.id
    } }
  );

  const createMutation = useCreateTask();
  const updateMutation = useUpdateTask();
  const deleteMutation = useDeleteTask();

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      taskName: "",
      taskCode: "",
      how: "",
      who: "",
      assignedBy: user?.name || "",
      priority: "medium",
      status: "yts",
      completionPct: 0,
      dependency: "",
      remarks: "",
      etc: "",
      plannedStartDate: format(new Date(), "yyyy-MM-dd"),
      plannedEndDate: format(new Date(), "yyyy-MM-dd"),
      userId: undefined,
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
    if (myTasks) {
      exportToCsv("my_tasks_export.csv", myTasks.map(t => ({
        ID: t.id,
        Code: t.taskCode || '',
        Name: t.taskName,
        Priority: t.priority || '',
        Status: t.status,
        Progress: `${t.completionPct || 0}%`,
        'Assigned By': t.assignedBy || '',
        'Planned Start': t.plannedStartDate || '',
        'Planned End': t.plannedEndDate || '',
      })));
      toast({ title: "Export successful", description: "My tasks exported to CSV" });
    }
  };

  const handleTeamExport = () => {
    if (teamTasks) {
      exportToCsv("team_tasks_export.csv", teamTasks.map(t => ({
        ID: t.id,
        'Team Member': t.userName || '',
        Code: t.taskCode || '',
        Name: t.taskName,
        Priority: t.priority || '',
        Status: t.status,
        Progress: `${t.completionPct || 0}%`,
        'Assigned By': t.assignedBy || '',
        'Planned Start': t.plannedStartDate || '',
        'Planned End': t.plannedEndDate || '',
      })));
      toast({ title: "Export successful", description: "Team tasks exported to CSV" });
    }
  };

  const onSubmit = (values: TaskFormData) => {
    if (!isMyTask && !values.userId) {
      form.setError("userId", { message: "Select a team member before assigning the task." });
      return;
    }

    // Assignment must always use the selected employee's name and team.
    let who = values.who;
    let assignedTeamId: number | undefined;
    if (values.userId && teamMembers) {
      const assignedUser = teamMembers.find(m => m.id === values.userId);
      if (assignedUser) {
        who = assignedUser.name;
        assignedTeamId = assignedUser.teamId || undefined;
      }
    }

    if (selectedTask) {
      updateMutation.mutate(
        { id: selectedTask.id, data: { ...values, who, assignedBy: values.assignedBy || user?.name || "", teamId: assignedTeamId ?? selectedTask.teamId } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
            setIsEditOpen(false);
            toast({ title: "Success", description: "Task updated successfully" });
          },
          onError: () => toast({ title: "Unable to update task", description: "Please try again.", variant: "destructive" }),
        }
      );
    } else {
      // Create task for My Tasks or Team Tasks based on context
      const taskData = isMyTask 
        ? { ...values, who, assignedBy: values.assignedBy || user?.name || "", userId: user?.id, teamId: user?.teamId } 
        : { ...values, who, assignedBy: values.assignedBy || user?.name || "", teamId: assignedTeamId ?? user?.teamId };
      
      createMutation.mutate(
        { data: taskData },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
            setIsCreateOpen(false);
            form.reset();
            toast({ title: "Success", description: isMyTask ? "Task created successfully" : "Task assigned successfully" });
          },
          onError: () => toast({ title: "Unable to assign task", description: "Please try again.", variant: "destructive" }),
        }
      );
    }
  };

  const handleDelete = () => {
    if (selectedTask) {
      deleteMutation.mutate(
        { id: selectedTask.id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
            setIsDeleteOpen(false);
            toast({ title: "Success", description: "Task deleted successfully" });
          }
        }
      );
    }
  };

  const openEdit = (task: any) => {
    setSelectedTask(task);
    form.reset({
      taskName: task.taskName,
      taskCode: task.taskCode || "",
      how: task.how || "",
      who: task.who || "",
      assignedBy: task.assignedBy || "",
      priority: task.priority || "medium",
      status: task.status,
      completionPct: task.completionPct || 0,
      dependency: task.dependency || "",
      remarks: task.remarks || "",
      etc: task.etc || "",
      plannedStartDate: task.plannedStartDate || "",
      plannedEndDate: task.plannedEndDate || "",
      actualStartDate: task.actualStartDate || "",
      actualEndDate: task.actualEndDate || "",
      userId: task.userId || undefined,
    });
    setIsEditOpen(true);
  };

  const openDelete = (task: any) => {
    setSelectedTask(task);
    setIsDeleteOpen(true);
  };

  const TaskFormFields = ({ showUserSelect }: { showUserSelect: boolean }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
      <FormField control={form.control} name="taskName" render={({ field }) => (
        <FormItem className="md:col-span-2">
          <FormLabel>Task Name *</FormLabel>
          <FormControl><Input {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
      
      {showUserSelect && (
        <FormField control={form.control} name="userId" render={({ field }) => (
          <FormItem>
            <FormLabel>Assign To Team Member</FormLabel>
            <Select 
              onValueChange={(val) => {
                if (val === "none") {
                  field.onChange(undefined);
                } else {
                  field.onChange(parseInt(val));
                }
              }} 
              value={field.value ? field.value.toString() : "none"}
            >
              <FormControl><SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger></FormControl>
              <SelectContent className="max-h-[300px] overflow-y-auto">
                <SelectItem value="none">-- Select Team Member --</SelectItem>
                {teamMembers?.map(member => (
                  <SelectItem key={member.id} value={member.id.toString()}>{member.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
      )}

      <FormField control={form.control} name="assignedBy" render={({ field }) => (
        <FormItem>
          <FormLabel>Assigned By</FormLabel>
          <FormControl><Input placeholder="Person assigning this task" {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />

      <FormField control={form.control} name="priority" render={({ field }) => (
        <FormItem>
          <FormLabel>Priority</FormLabel>
          <Select onValueChange={field.onChange} value={field.value}>
            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
            <SelectContent>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )} />

      <FormField control={form.control} name="taskCode" render={({ field }) => (
        <FormItem>
          <FormLabel>Task Code</FormLabel>
          <FormControl><Input {...field} /></FormControl>
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
              <SelectItem value="cancelled">Cancelled</SelectItem>
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

      <FormField control={form.control} name="plannedStartDate" render={({ field }) => (
        <FormItem>
          <FormLabel>Planned Start Date</FormLabel>
          <FormControl><Input type="date" {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />

      <FormField control={form.control} name="plannedEndDate" render={({ field }) => (
        <FormItem>
          <FormLabel>Planned End Date</FormLabel>
          <FormControl><Input type="date" {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tasks Management</h1>
        <p className="text-gray-500 mt-1">Manage your own tasks and assign tasks to your team.</p>
      </div>

      <Tabs defaultValue="my-tasks" onValueChange={(val) => setIsMyTask(val === "my-tasks")}>
        <TabsList className="mb-4">
          <TabsTrigger value="my-tasks">My Tasks</TabsTrigger>
          <TabsTrigger value="team-tasks">Team Tasks</TabsTrigger>
        </TabsList>

        {/* ── My Tasks Tab ── */}
        <TabsContent value="my-tasks">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <p className="text-sm text-gray-500">Create and manage your personal tasks</p>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" onClick={handleMyExport}>
                  <Download className="mr-2 h-4 w-4" /> Export
                </Button>
                <Dialog open={isCreateOpen} onOpenChange={(open) => {
                  if (open) {
                    form.reset();
                    setSelectedTask(null);
                  }
                  setIsCreateOpen(open);
                }}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" /> Add Task
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                      <DialogTitle>Add New Task</DialogTitle>
                    </DialogHeader>
                    <div className="overflow-y-auto flex-1 pr-2">
                      <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)}>
                          <TaskFormFields showUserSelect={false} />
                          <div className="flex justify-end pt-4 border-t mt-4">
                            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} className="mr-2">Cancel</Button>
                            <Button type="submit" disabled={createMutation.isPending}>Add Task</Button>
                          </div>
                        </form>
                      </Form>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border flex flex-wrap gap-4 items-center">
              <div className="flex items-center text-sm font-medium text-gray-500">
                <Filter className="w-4 h-4 mr-2" /> Filters
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
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-48">
                <Select value={myPriorityFilter} onValueChange={setMyPriorityFilter}>
                  <SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(myStatusFilter !== "all" || myPriorityFilter !== "all") && (
                <Button variant="ghost" onClick={() => { setMyStatusFilter("all"); setMyPriorityFilter("all"); }}>
                  Clear Filters
                </Button>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead>Code</TableHead>
                      <TableHead className="min-w-[200px]">Task Name</TableHead>
                      <TableHead>Assigned By</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Remarks</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myLoading ? (
                      <TableRow>
                        <TableCell colSpan={10} className="h-32 text-center text-gray-500">
                          Loading your tasks...
                        </TableCell>
                      </TableRow>
                    ) : myTasks && myTasks.length > 0 ? (
                      myTasks
                        .filter(task => myPriorityFilter === "all" || task.priority === myPriorityFilter)
                        .map((task) => (
                        <TableRow key={task.id}>
                          <TableCell className="font-mono text-xs text-gray-500">{task.taskCode || "-"}</TableCell>
                          <TableCell className="font-medium">{task.taskName}</TableCell>
                          <TableCell>{task.assignedBy || "-"}</TableCell>
                          <TableCell>
                            <span className={`text-xs uppercase font-medium ${
                              task.priority === 'high' ? 'text-red-600' : 
                              task.priority === 'medium' ? 'text-amber-600' : 'text-blue-600'
                            }`}>
                              {task.priority || "-"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={task.status} />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-primary" 
                                  style={{ width: `${task.completionPct || 0}%` }} 
                                />
                              </div>
                              <span className="text-xs text-gray-500">{task.completionPct || 0}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">{task.plannedStartDate || "-"}</TableCell>
                          <TableCell className="text-sm text-gray-600">{task.plannedEndDate || "-"}</TableCell>
                          <TableCell className="text-sm text-gray-600 max-w-[200px] truncate" title={task.remarks || ""}>
                            {task.remarks || "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" onClick={() => openEdit(task)} className="h-8 w-8 text-gray-500 hover:text-primary">
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => openDelete(task)} className="h-8 w-8 text-gray-500 hover:text-red-600">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={10} className="h-32 text-center text-gray-500">
                          No tasks found. Create your first task!
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── Team Tasks Tab ── */}
        <TabsContent value="team-tasks">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <p className="text-sm text-gray-500">Assign and manage tasks for your team members</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handleTeamExport}>
                  <Download className="mr-2 h-4 w-4" /> Export
                </Button>
                <Dialog open={isCreateOpen} onOpenChange={(open) => {
                  if (open) {
                    form.reset();
                    setSelectedTask(null);
                  }
                  setIsCreateOpen(open);
                }}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" /> Assign Task
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                      <DialogTitle>Assign New Task</DialogTitle>
                    </DialogHeader>
                    <div className="overflow-y-auto flex-1 pr-2">
                      <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)}>
                          <TaskFormFields showUserSelect={true} />
                          <div className="flex justify-end pt-4 border-t mt-4">
                            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} className="mr-2">Cancel</Button>
                            <Button type="submit" disabled={createMutation.isPending}>Assign Task</Button>
                          </div>
                        </form>
                      </Form>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border flex flex-wrap gap-4 items-center">
              <div className="flex items-center text-sm font-medium text-gray-500">
                <Filter className="w-4 h-4 mr-2" /> Filters
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
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-48">
                <Select value={teamPriorityFilter} onValueChange={setTeamPriorityFilter}>
                  <SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-48">
                <Select value={teamUserFilter} onValueChange={setTeamUserFilter}>
                  <SelectTrigger><SelectValue placeholder="Team Member" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Members</SelectItem>
                    {teamMembers?.map(member => (
                      <SelectItem key={member.id} value={member.id.toString()}>{member.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {(teamStatusFilter !== "all" || teamPriorityFilter !== "all" || teamUserFilter !== "all") && (
                <Button variant="ghost" onClick={() => { setTeamStatusFilter("all"); setTeamPriorityFilter("all"); setTeamUserFilter("all"); }}>
                  Clear Filters
                </Button>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead>Member</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead className="min-w-[200px]">Task Name</TableHead>
                      <TableHead>Assigned By</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Remarks</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teamLoading ? (
                      <TableRow>
                        <TableCell colSpan={11} className="h-32 text-center text-gray-500">
                          Loading team tasks...
                        </TableCell>
                      </TableRow>
                    ) : teamTasks && teamTasks.length > 0 ? (
                      teamTasks
                        .filter(task => teamPriorityFilter === "all" || task.priority === teamPriorityFilter)
                        .map((task) => (
                        <TableRow key={task.id}>
                          <TableCell className="font-medium">{task.userName || "-"}</TableCell>
                          <TableCell className="font-mono text-xs text-gray-500">{task.taskCode || "-"}</TableCell>
                          <TableCell className="font-medium">{task.taskName}</TableCell>
                          <TableCell>{task.assignedBy || "-"}</TableCell>
                          <TableCell>
                            <span className={`text-xs uppercase font-medium ${
                              task.priority === 'high' ? 'text-red-600' : 
                              task.priority === 'medium' ? 'text-amber-600' : 'text-blue-600'
                            }`}>
                              {task.priority || "-"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={task.status} />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-primary" 
                                  style={{ width: `${task.completionPct || 0}%` }} 
                                />
                              </div>
                              <span className="text-xs text-gray-500">{task.completionPct || 0}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">{task.plannedStartDate || "-"}</TableCell>
                          <TableCell className="text-sm text-gray-600">{task.plannedEndDate || "-"}</TableCell>
                          <TableCell className="text-sm text-gray-600 max-w-[200px] truncate" title={task.remarks || ""}>
                            {task.remarks || "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" onClick={() => openEdit(task)} className="h-8 w-8 text-gray-500 hover:text-primary">
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => openDelete(task)} className="h-8 w-8 text-gray-500 hover:text-red-600">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={11} className="h-32 text-center text-gray-500">
                          No tasks found matching your filters.
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

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 pr-2">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <TaskFormFields showUserSelect={!isMyTask} />
                <div className="flex justify-end pt-4 border-t mt-4">
                  <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} className="mr-2">Cancel</Button>
                  <Button type="submit" disabled={updateMutation.isPending}>Update Task</Button>
                </div>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the task "{selectedTask?.taskName}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 focus:ring-red-600">
              {deleteMutation.isPending ? "Deleting..." : "Delete Task"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
