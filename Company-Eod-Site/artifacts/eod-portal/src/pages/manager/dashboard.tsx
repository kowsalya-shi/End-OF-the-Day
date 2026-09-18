import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  useGetDashboardStats, getGetDashboardStatsQueryKey,
  useGetTeamSummary, getGetTeamSummaryQueryKey,
  useListTasks, getListTasksQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Users, FileText, CheckSquare, Clock, Download, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { exportToCsv } from "@/lib/export-csv";
import { useAuth } from "@/lib/auth";
import { StatusBadge } from "@/components/ui/status-badge";
import { EodEmployeeActivityDashboard } from "@/components/eod-employee-activity-dashboard";

export default function ManagerDashboard() {
  const { user } = useAuth();
  const today = format(new Date(), "yyyy-MM-dd");
  const [ageingTasks, setAgeingTasks] = useState<any[]>([]);
  const [pendingEods, setPendingEods] = useState<any[]>([]);
  const [pendingTaskApprovals, setPendingTaskApprovals] = useState<any[]>([]);
  const [reviewLoading, setReviewLoading] = useState(true);
  const [rejectionTarget, setRejectionTarget] = useState<{ kind: "eod" | "task"; item: any } | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const reviewPendingEod = async (eod: any, approved: boolean) => {
    if (!approved) { setRejectionTarget({ kind: "eod", item: eod }); setRejectionReason(""); return; }
    try {
      const response = await fetch(`http://localhost:8080/api/eod/${eod.id}/${approved ? "approve" : "reject"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}` },
        body: JSON.stringify({ approvedBy: user?.id }),
      });
      if (!response.ok) throw new Error();
      setPendingEods((items) => items.filter((item) => item.id !== eod.id));
    } catch {
      window.alert("Unable to review this EOD. Please try again.");
    }
  };

  const reviewPendingTask = async (task: any, approved: boolean) => {
    if (!approved) { setRejectionTarget({ kind: "task", item: task }); setRejectionReason(""); return; }
    try {
      const response = await fetch(`http://localhost:8080/api/tasks/${task.id}/${approved ? "approve" : "reject"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}` },
        body: JSON.stringify({ approvedBy: user?.id }),
      });
      if (!response.ok) throw new Error();
      setPendingTaskApprovals((items) => items.filter((item) => item.id !== task.id));
    } catch {
      window.alert("Unable to review this task. Please try again.");
    }
  };

  const submitRejection = async () => {
    if (!rejectionTarget || !rejectionReason.trim()) return;
    const { kind, item } = rejectionTarget;
    try {
      const response = await fetch(`http://localhost:8080/api/${kind === "eod" ? "eod" : "tasks"}/${item.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}` },
        body: JSON.stringify({ approvedBy: user?.id, reason: rejectionReason.trim() }),
      });
      if (!response.ok) throw new Error();
      if (kind === "eod") setPendingEods((items) => items.filter((entry) => entry.id !== item.id));
      else setPendingTaskApprovals((items) => items.filter((entry) => entry.id !== item.id));
      setRejectionTarget(null);
      setRejectionReason("");
    } catch {
      window.alert("Unable to reject this item. Please try again.");
    }
  };

  const { data: stats, isLoading: statsLoading } = useGetDashboardStats(
    { date: today },
    { query: { queryKey: getGetDashboardStatsQueryKey({ date: today }) } }
  );

  const { data: teamSummary, isLoading: summaryLoading } = useGetTeamSummary(
    { date: today },
    { query: { queryKey: getGetTeamSummaryQueryKey({ date: today }) } }
  );

  const { data: tasks, isLoading: tasksLoading } = useListTasks(
    {},
    { query: { queryKey: getListTasksQueryKey() } },
  );
  const activeTasks = tasks?.filter((task) => task.status !== "completed" && task.status !== "cancelled") ?? [];

  useEffect(() => {
    if (!user?.role) return;
    const roleToReview = user.role === "it_manager" ? "tl" : "it_manager";
    const token = localStorage.getItem("auth_token") || "";
    setReviewLoading(true);
    Promise.all([
      fetch("http://localhost:8080/api/dashboard/task-ageing", { headers: { Authorization: `Bearer ${token}` } }).then((response) => response.ok ? response.json() : []),
      fetch(`http://localhost:8080/api/eod?userRole=${roleToReview}`, { headers: { Authorization: `Bearer ${token}` } }).then((response) => response.ok ? response.json() : []),
      fetch(`http://localhost:8080/api/tasks?userRole=${roleToReview}&status=completed`, { headers: { Authorization: `Bearer ${token}` } }).then((response) => response.ok ? response.json() : []),
    ]).then(([ageing, eods, tasksForReview]) => {
      setAgeingTasks(ageing);
      setPendingEods(eods.filter((eod: any) => ["pending", "resubmitted"].includes(eod.approvalStatus || "pending")));
      setPendingTaskApprovals(tasksForReview.filter((task: any) => ["pending", "resubmitted"].includes(task.approvalStatus || "pending")));
    }).catch(() => { setAgeingTasks([]); setPendingEods([]); setPendingTaskApprovals([]); }).finally(() => setReviewLoading(false));
  }, [user?.role]);

  const handleExport = () => {
    if (!teamSummary) return;
    exportToCsv(`manager_team_summary_${today}.csv`, teamSummary.map(t => ({
      Team: t.teamName,
      "Total Members": t.totalMembers,
      Submitted: t.submitted,
      Pending: t.pending,
      Absent: t.absent,
      "Completion %": t.completionPct,
    })));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{user?.name}</h1>
          <p className="text-gray-500 mt-1">Manager dashboard overview for {format(new Date(), "MMMM d, yyyy")}</p>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" /> Export Summary
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-5 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="h-7 bg-gray-200 rounded animate-pulse w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats?.totalEmployees || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">EODs Submitted</CardTitle>
            <FileText className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="h-7 bg-gray-200 rounded animate-pulse w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold text-green-600">{stats?.submittedEod || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">{stats?.completionRate || 0}% completion</p>
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
            {statsLoading ? (
              <div className="h-7 bg-gray-200 rounded animate-pulse w-16" />
            ) : (
              <div className="text-2xl font-bold text-amber-600">{stats?.pendingEod || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Absent / On Leave</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="h-7 bg-gray-200 rounded animate-pulse w-16" />
            ) : (
              <div className="text-2xl font-bold text-red-600">
                {(stats?.absentEmployees || 0) + (stats?.onLeave || 0)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-amber-200">
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div><CardTitle className="text-base">AGEING REPORT</CardTitle><p className="mt-1 text-sm text-muted-foreground">Tasks in YTS/WIP/Holding for 5 or more days. Take action to move them forward.</p></div>
          <Button variant="outline" size="sm" disabled={!ageingTasks.length} onClick={() => exportToCsv("ageing_report.csv", ageingTasks.map((task) => ({ Employee: task.userName, Task: task.taskName, Priority: task.priority, Started: task.plannedStartDate || "", "Age (Days)": task.ageDays, Status: task.status })))}><Download className="mr-2 h-4 w-4" /> Export CSV</Button>
        </CardHeader>
        <CardContent>{reviewLoading ? <div className="h-24 animate-pulse rounded bg-gray-100" /> : ageingTasks.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-gray-500"><th className="px-2 py-2">Employee</th><th className="px-2 py-2">Task</th><th className="px-2 py-2">Priority</th><th className="px-2 py-2">Started</th><th className="px-2 py-2">Age</th></tr></thead><tbody>{ageingTasks.map((task) => <tr key={task.id} className="border-b"><td className="px-2 py-2 font-medium">{task.userName}</td><td className="px-2 py-2">{task.taskName}</td><td className="px-2 py-2 capitalize">{task.priority}</td><td className="px-2 py-2">{task.plannedStartDate || "-"}</td><td className="px-2 py-2 font-semibold text-amber-700">{task.ageDays} days</td></tr>)}</tbody></table></div> : <p className="py-6 text-center text-sm font-medium text-green-600">No tasks are ageing.</p>}</CardContent>
      </Card>

      {/* Task Overview */}
      <Card className="bg-gray-50 border-gray-200">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Task Overview</h3>
              <p className="text-sm text-gray-500">Company-wide task distribution</p>
            </div>
            {statsLoading ? (
              <div className="h-10 w-full max-w-md bg-gray-200 animate-pulse rounded" />
            ) : (
              <div className="flex flex-wrap gap-6 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-600">{stats?.completedTasks || 0}</div>
                  <div className="text-xs uppercase font-medium text-gray-500 tracking-wider">Completed</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-amber-600">{stats?.wipTasks || 0}</div>
                  <div className="text-xs uppercase font-medium text-gray-500 tracking-wider">WIP</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">{stats?.ytsTasks || 0}</div>
                  <div className="text-xs uppercase font-medium text-gray-500 tracking-wider">YTS</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">{stats?.holdTasks || 0}</div>
                  <div className="text-xs uppercase font-medium text-gray-500 tracking-wider">Hold</div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Who Is Working on What</CardTitle>
          <p className="text-sm text-muted-foreground">All active tasks across every team.</p>
        </CardHeader>
        <CardContent>
          {tasksLoading ? (
            <div className="h-32 bg-gray-100 animate-pulse rounded" />
          ) : activeTasks.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No active tasks are assigned.</p>
          ) : (
            <div className="max-h-96 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50">
                  <tr className="border-b">
                    <th className="px-3 py-3 text-left font-semibold text-gray-600">Employee</th>
                    <th className="px-3 py-3 text-left font-semibold text-gray-600">Task</th>
                    <th className="px-3 py-3 text-left font-semibold text-gray-600">Team</th>
                    <th className="px-3 py-3 text-center font-semibold text-gray-600">Progress</th>
                    <th className="px-3 py-3 text-left font-semibold text-gray-600">Status</th>
                    <th className="px-3 py-3 text-left font-semibold text-gray-600">Due Date</th>
                  </tr>
                </thead>
                <tbody>
                  {activeTasks.map((task) => (
                    <tr key={task.id} className="border-b hover:bg-gray-50">
                      <td className="px-3 py-3 font-medium">{task.userName || "Unassigned"}</td>
                      <td className="px-3 py-3">{task.taskName}</td>
                      <td className="px-3 py-3">{task.teamName || "-"}</td>
                      <td className="px-3 py-3 text-center">{task.completionPct || 0}%</td>
                      <td className="px-3 py-3"><StatusBadge status={task.status} /></td>
                      <td className="px-3 py-3">{task.plannedEndDate || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <EodEmployeeActivityDashboard />

      {/* Team-wise Attendance Summary */}
      {(summaryLoading || (teamSummary && teamSummary.length > 0)) && (
        <Card>
          <CardHeader><CardTitle className="text-base">Team-wise EOD Summary</CardTitle></CardHeader>
          <CardContent>
            {summaryLoading ? (
              <div className="h-32 bg-gray-100 animate-pulse rounded" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-3 px-4 font-semibold text-gray-600">Team</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-600">Members</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-600">Submitted</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-600">Pending</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-600">Absent</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-600">Completion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamSummary?.map(team => (
                      <tr key={team.teamId} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">{team.teamName}</td>
                        <td className="py-3 px-4 text-center">{team.totalMembers}</td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-green-700 font-semibold">{team.submitted}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-amber-700 font-semibold">{team.pending}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-red-700 font-semibold">{team.absent}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full bg-primary" style={{ width: `${team.completionPct}%` }} />
                            </div>
                            <span className="font-semibold text-primary">{team.completionPct}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      <Dialog open={!!rejectionTarget} onOpenChange={(open) => { if (!open) { setRejectionTarget(null); setRejectionReason(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject {rejectionTarget?.kind === "eod" ? "EOD" : "Completed Task"}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Enter the reason for rejecting {rejectionTarget?.item?.userName}'s {rejectionTarget?.kind === "eod" ? "EOD" : "completed task"}. This reason will be sent to them.</p>
          <Textarea value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} placeholder="Enter rejection reason" autoFocus />
          <DialogFooter><Button variant="outline" onClick={() => setRejectionTarget(null)}>Cancel</Button><Button variant="destructive" disabled={!rejectionReason.trim()} onClick={submitRejection}>Reject</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

