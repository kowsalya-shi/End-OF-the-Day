import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { 
  useListTasks, 
  getListTasksQueryKey, 
  useCreateTask, 
  useUpdateTask,
  useDeleteTask,
  useListUsers,
  getListUsersQueryKey,
  useListTeams,
  getListTeamsQueryKey
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
import { useToast } from "@/hooks/use-toast";
import { Download, Plus, Edit2, Trash2, Filter } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const taskSchema = z.object({
  taskCode: z.string().optional(),
  taskName: z.string().min(1, "Task name is required"),
  assignedBy: z.string().optional(),
  priority: z.string().optional(),
  plannedStartDate: z.string().optional(),
  plannedEndDate: z.string().optional(),
  status: z.string().min(1, "Status is required"),
  completionPct: z.coerce.number().min(0).max(100).optional(),
  remarks: z.string().optional(),
  userId: z.coerce.number().optional(),
  teamId: z.coerce.number().optional(),
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

export default function ManagerTasks() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);

  // Get all employees (no team filter)
  const { data: allEmployees } = useListUsers(
    {},
    { query: { queryKey: getListUsersQueryKey({}) } }
  );

  // Get all teams for filtering
  const { data: teams } = useListTeams({ query: { queryKey: getListTeamsQueryKey() } });

  const { data: tasks, isLoading } = useListTasks(
    { 
      status: statusFilter !== "all" ? statusFilter : undefined,
      teamId: teamFilter !== "all" ? parseInt(teamFilter) : undefined,
    } as any,
    { query: { 
      queryKey: getListTasksQueryKey({ 
        status: statusFilter !== "all" ? statusFilter : undefined,
        teamId: teamFilter !== "all" ? parseInt(teamFilter) : undefined,
      } as any)
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
      assignedBy: user?.name || "",
      priority: "medium",
      status: "yts",
      completionPct: 0,
      remarks: "",
      plannedStartDate: format(new Date(), "yyyy-MM-dd"),
      plannedEndDate: format(new Date(), "yyyy-MM-dd"),
      userId: undefined,
      teamId: undefined,
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

  const handleExport = () => {
    if (tasks) {
      exportToCsv("all_tasks_export.csv", tasks.map(t => ({
        ID: t.id,
        Team: t.teamName || '',
        'Assigned To': t.userName || '',
        Code: t.taskCode || '',
        Name: t.taskName,
        Priority: t.priority || '',
        Status: t.status,
        Progress: `${t.completionPct || 0}%`,
        'Assigned By': t.assignedBy || '',
        'Planned Start': t.plannedStartDate || '',
        'Planned End': t.plannedEndDate || '',
      })));
      toast({ title: "Export successful", description: "Tasks exported to CSV" });
    }
  };

  const onSubmit = (values: TaskFormData) => {
    // Find the selected employee's team if user is selected
    let teamId = values.teamId;
    if (values.userId && allEmployees) {
      const assignedUser = allEmployees.find(e => e.id === values.userId);
      if (assignedUser) teamId = assignedUser.teamId || undefined;
    }

    if (selectedTask) {
      updateMutation.mutate(
        { id: selectedTask.id, data: { ...values, teamId } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
            setIsEditOpen(false);
            toast({ title: "Success", description: "Task updated successfully" });
          }
        }
      );
    } else {
      createMutation.mutate(
        { data: { ...values, teamId } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
            setIsCreateOpen(false);
            form.reset();
            toast({ title: "Success", description: "Task assigned successfully" });
          }
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
      assignedBy: task.assignedBy || "",
      priority: task.priority || "medium",
      status: task.status,
      completionPct: task.completionPct || 0,
      remarks: task.remarks || "",
      plannedStartDate: task.plannedStartDate || "",
      plannedEndDate: task.plannedEndDate || "",
      userId: task.userId || undefined,
      teamId: task.teamId || undefined,
    });
    setIsEditOpen(true);
  };

  const openDelete = (task: any) => {
    setSelectedTask(task);
    setIsDeleteOpen(true);
  };

  const TaskFormFields = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
      <FormField control={form.control} name="taskName" render={({ field }) => (
        <FormItem className="md:col-span-2">
          <FormLabel>Task Name *</FormLabel>
          <FormControl><Input {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
      
      <FormField control={form.control} name="userId" render={({ field }) => (
        <FormItem>
          <FormLabel>Assign To</FormLabel>
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
            <FormControl><SelectTrigger><SelectValue placeholder="Select person" /></SelectTrigger></FormControl>
            <SelectContent className="max-h-[300px] overflow-y-auto">
              <SelectItem value="none">-- Select Person --</SelectItem>
              {allEmployees?.filter(e => user?.role === "it_manager" ? (e.role === "employee" || e.role === "tl") : (e.role === "employee" || e.role === "tl" || e.role === "it_manager")).map(emp => (
                <SelectItem key={emp.id} value={emp.id.toString()}>
                  {emp.name} ({emp.role === "it_manager" ? "IT Manager" : emp.role === "tl" ? "Team Lead" : emp.department || "Employee"})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{user?.role === "it_manager" ? "Tasks" : "All Company Tasks"}</h1>
          <p className="text-gray-500 mt-1">{user?.role === "it_manager" ? "Assign tasks to a Team Lead or employee, then monitor progress." : "Manage and assign tasks for all employees."}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport}>
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
                    <TaskFormFields />
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
          <Select value={statusFilter} onValueChange={setStatusFilter}>
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
          <Select value={teamFilter} onValueChange={setTeamFilter}>
            <SelectTrigger><SelectValue placeholder="Team" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teams</SelectItem>
              {teams?.map(team => (
                <SelectItem key={team.id} value={team.id.toString()}>{team.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {(statusFilter !== "all" || teamFilter !== "all") && (
          <Button variant="ghost" onClick={() => { setStatusFilter("all"); setTeamFilter("all"); }}>
            Clear Filters
          </Button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Team</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead>Code</TableHead>
                <TableHead className="min-w-[200px]">Task Name</TableHead>
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
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-gray-500">
                    Loading company tasks...
                  </TableCell>
                </TableRow>
              ) : tasks && tasks.length > 0 ? (
                tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="text-xs text-gray-500">{task.teamName || "-"}</TableCell>
                    <TableCell className="font-medium">{task.userName || "-"}</TableCell>
                    <TableCell className="font-mono text-xs text-gray-500">{task.taskCode || "-"}</TableCell>
                    <TableCell className="font-medium">{task.taskName}</TableCell>
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

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Reassign / Edit Task</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 pr-2">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <TaskFormFields />
                <div className="flex justify-end pt-4 border-t mt-4">
                  <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} className="mr-2">Cancel</Button>
                  <Button type="submit" disabled={updateMutation.isPending}>Update / Reassign Task</Button>
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
