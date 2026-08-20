import { format } from "date-fns";
import {
  useGetDashboardStats, getGetDashboardStatsQueryKey,
  useGetTeamSummary, getGetTeamSummaryQueryKey,
  useListTasks, getListTasksQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, FileText, CheckSquare, Clock, Download, AlertTriangle } from "lucide-react";
import { exportToCsv } from "@/lib/export-csv";
import { useAuth } from "@/lib/auth";
import { StatusBadge } from "@/components/ui/status-badge";
import { EodEmployeeActivityDashboard } from "@/components/eod-employee-activity-dashboard";

export default function ManagerDashboard() {
  const { user } = useAuth();
  const today = format(new Date(), "yyyy-MM-dd");

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
    </div>
  );
}

