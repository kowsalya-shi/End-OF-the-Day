import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { format } from "date-fns";
import { 
  useGetTeamSummary, getGetTeamSummaryQueryKey,
  useGetTaskStatusSummary, getGetTaskStatusSummaryQueryKey,
  useListTeams, getListTeamsQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Users, FileText, CheckCircle, Clock, XCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { exportToCsv } from "@/lib/export-csv";

export default function TLDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const today = format(new Date(), "yyyy-MM-dd");
  const [pendingTaskApprovals, setPendingTaskApprovals] = useState<any[]>([]);
  const [taskApprovalLoading, setTaskApprovalLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [taskRejectionReason, setTaskRejectionReason] = useState("");
  const [ageingTasks, setAgeingTasks] = useState<any[]>([]);
  const [ageingLoading, setAgeingLoading] = useState(true);

  const { data: teamSummary, isLoading: summaryLoading } = useGetTeamSummary(
    { date: today },
    { query: { queryKey: getGetTeamSummaryQueryKey({ date: today }) } }
  );

  const { data: teams, isLoading: teamsLoading } = useListTeams(
    { query: { queryKey: getListTeamsQueryKey() } },
  );

  const loadPendingTaskApprovals = async () => {
    if (!user?.id) return;
    setTaskApprovalLoading(true);
    try {
      const response = await fetch(`http://localhost:8080/api/tasks?tlId=${user.id}&status=completed`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}` },
      });
      if (!response.ok) throw new Error("Unable to load completed task approvals");
      const tasks = await response.json();
      setPendingTaskApprovals(tasks.filter((task: any) => ["pending", "resubmitted"].includes(task.approvalStatus || "pending")));
    } catch {
      toast({ title: "Unable to load completed task approvals", variant: "destructive" });
    } finally {
      setTaskApprovalLoading(false);
    }
  };

  useEffect(() => {
    loadPendingTaskApprovals();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    setAgeingLoading(true);
    fetch(`http://localhost:8080/api/dashboard/task-ageing?tlId=${user.id}`, { headers: { Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}` } })
      .then((response) => response.ok ? response.json() : [])
      .then(setAgeingTasks)
      .catch(() => setAgeingTasks([]))
      .finally(() => setAgeingLoading(false));
  }, [user?.id]);

  const reviewCompletedTask = async (task: any, approved: boolean) => {
    if (!approved) {
      setSelectedTask(task);
      setTaskRejectionReason("");
      return;
    }
    try {
      const response = await fetch(`http://localhost:8080/api/tasks/${task.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}` },
        body: JSON.stringify({ approvedBy: user?.id }),
      });
      if (!response.ok) throw new Error("Unable to review task");
      toast({ title: "Task approved" });
      loadPendingTaskApprovals();
    } catch {
      toast({ title: "Task approval failed", variant: "destructive" });
    }
  };

  const handleTaskReject = async () => {
    if (!selectedTask || !taskRejectionReason.trim()) return;
    try {
      const response = await fetch(`http://localhost:8080/api/tasks/${selectedTask.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}` },
        body: JSON.stringify({ approvedBy: user?.id, reason: taskRejectionReason.trim() }),
      });
      if (!response.ok) throw new Error("Unable to reject task");
      toast({ title: "Task rejected" });
      setSelectedTask(null);
      setTaskRejectionReason("");
      loadPendingTaskApprovals();
    } catch {
      toast({ title: "Task rejection failed", variant: "destructive" });
    }
  };

  const { data: taskSummary, isLoading: tasksLoading } = useGetTaskStatusSummary(
    { tlId: user?.id },
    { query: { queryKey: getGetTaskStatusSummaryQueryKey({ tlId: user?.id }), enabled: !!user?.id } }
  );

  const myTeamIds = new Set(teams?.filter((team) => team.tlId === user?.id).map((team) => team.id) ?? []);
  const myTeams = teamSummary?.filter((team) => myTeamIds.has(team.teamId));
  
  const totalMembers = myTeams?.reduce((sum, team) => sum + (team.totalMembers || 0), 0) || 0;
  const totalSubmitted = myTeams?.reduce((sum, team) => sum + (team.submitted || 0), 0) || 0;
  const totalPending = myTeams?.reduce((sum, team) => sum + (team.pending || 0), 0) || 0;
  const totalAbsent = myTeams?.reduce((sum, team) => sum + (team.absent || 0), 0) || 0;
  const completionPct = totalMembers > 0 ? Math.round((totalSubmitted / totalMembers) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{user?.name}</h1>
        <p className="text-gray-500 mt-1">Team Leader dashboard overview for {format(new Date(), "MMMM d, yyyy")}</p>
      </div>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {summaryLoading || teamsLoading ? (
              <div className="h-7 bg-gray-200 rounded animate-pulse w-16"></div>
            ) : (
              <div className="text-2xl font-bold">{totalMembers}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">EODs Submitted</CardTitle>
            <FileText className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {summaryLoading || teamsLoading ? (
              <div className="h-7 bg-gray-200 rounded animate-pulse w-24"></div>
            ) : (
              <>
                <div className="text-2xl font-bold text-green-600">{totalSubmitted}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {completionPct}% completion rate
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending EODs</CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            {summaryLoading || teamsLoading ? (
              <div className="h-7 bg-gray-200 rounded animate-pulse w-16"></div>
            ) : (
              <div className="text-2xl font-bold text-amber-600">{totalPending}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Absent Today</CardTitle>
            <Users className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            {summaryLoading || teamsLoading ? (
              <div className="h-7 bg-gray-200 rounded animate-pulse w-16"></div>
            ) : (
              <div className="text-2xl font-bold text-red-600">{totalAbsent}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-amber-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div><CardTitle className="text-base">AGEING REPORT</CardTitle><p className="mt-1 text-sm text-muted-foreground">Tasks in YTS/WIP/Holding for 5 or more days. Take action to move them forward.</p></div>
          <Button variant="outline" size="sm" disabled={!ageingTasks.length} onClick={() => exportToCsv("ageing_report.csv", ageingTasks.map((task) => ({ Task: task.taskName, Code: task.taskCode || "", Employee: task.userName, Team: task.teamName, Priority: task.priority, "Planned Start": task.plannedStartDate || "", "Age (Days)": task.ageDays, Status: task.status })))}>Export CSV</Button>
        </CardHeader>
        <CardContent>{ageingLoading ? <div className="h-20 animate-pulse rounded bg-gray-100" /> : ageingTasks.length ? <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Task</TableHead><TableHead>Priority</TableHead><TableHead>Started</TableHead><TableHead>Age</TableHead></TableRow></TableHeader><TableBody>{ageingTasks.map((task) => <TableRow key={task.id}><TableCell>{task.userName}</TableCell><TableCell>{task.taskName}</TableCell><TableCell className="capitalize">{task.priority}</TableCell><TableCell>{task.plannedStartDate || "-"}</TableCell><TableCell className="font-semibold text-amber-700">{task.ageDays} days</TableCell></TableRow>)}</TableBody></Table></div> : <p className="py-3 text-sm text-green-700">No ageing tasks.</p>}</CardContent>
      </Card>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader><CardTitle>Awaiting Completed Task Approval</CardTitle></CardHeader>
          <CardContent>
            {taskApprovalLoading ? (
              <div className="space-y-3">{[1, 2].map((item) => <div key={item} className="h-12 animate-pulse rounded bg-gray-100" />)}</div>
            ) : pendingTaskApprovals.length > 0 ? (
              <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Team Member</TableHead><TableHead>Task</TableHead><TableHead>Progress</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{pendingTaskApprovals.map((task) => <TableRow key={task.id}><TableCell className="font-medium">{task.userName}</TableCell><TableCell>{task.taskName}</TableCell><TableCell>{task.completionPct || 100}%</TableCell><TableCell className="text-right"><div className="flex justify-end gap-2"><Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => reviewCompletedTask(task, true)}><CheckCircle className="mr-1 h-4 w-4" /> Approve</Button><Button size="sm" variant="destructive" onClick={() => reviewCompletedTask(task, false)}><XCircle className="mr-1 h-4 w-4" /> Reject</Button></div></TableCell></TableRow>)}</TableBody></Table></div>
            ) : (
              <div className="py-6 text-center font-medium text-green-600">No completed tasks are awaiting approval.</div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Team Tasks Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {tasksLoading ? (
              <div className="h-48 bg-gray-100 rounded animate-pulse"></div>
            ) : taskSummary ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium">Total Tasks</span>
                  <span className="text-xl font-bold">{taskSummary.total}</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                    <div className="text-sm text-green-800 font-medium mb-1">Completed</div>
                    <div className="text-2xl font-bold text-green-700">{taskSummary.completed}</div>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                    <div className="text-sm text-amber-800 font-medium mb-1">WIP</div>
                    <div className="text-2xl font-bold text-amber-700">{taskSummary.wip}</div>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <div className="text-sm text-blue-800 font-medium mb-1">YTS</div>
                    <div className="text-2xl font-bold text-blue-700">{taskSummary.yts}</div>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                    <div className="text-sm text-red-800 font-medium mb-1">Hold</div>
                    <div className="text-2xl font-bold text-red-700">{taskSummary.hold}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">No task data available</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selectedTask} onOpenChange={(open) => { if (!open) { setSelectedTask(null); setTaskRejectionReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Completed Task</DialogTitle>
          </DialogHeader>
          {selectedTask && <p className="text-sm text-muted-foreground">Rejecting: <span className="font-medium text-foreground">{selectedTask.taskName}</span> — {selectedTask.userName}</p>}
          <Textarea
            value={taskRejectionReason}
            onChange={(event) => setTaskRejectionReason(event.target.value)}
            placeholder="Enter the reason for rejection"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSelectedTask(null); setTaskRejectionReason(""); }}>Cancel</Button>
            <Button variant="destructive" disabled={!taskRejectionReason.trim()} onClick={handleTaskReject}>Reject Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

