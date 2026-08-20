import { format } from "date-fns";
import {
  useGetDashboardStats, getGetDashboardStatsQueryKey,
  useGetTeamSummary, getGetTeamSummaryQueryKey,
  useListTasks, getListTasksQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, FileText, CheckSquare, Clock, Download, AlertTriangle, GraduationCap } from "lucide-react";
import { exportToCsv } from "@/lib/export-csv";
import { useAuth } from "@/lib/auth";
import { StatusBadge } from "@/components/ui/status-badge";
import { EodEmployeeActivityDashboard } from "@/components/eod-employee-activity-dashboard";

export default function HRDashboard() {
  const { user } = useAuth();
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: stats, isLoading: statsLoading } = useGetDashboardStats(
    { date: today },
    { query: { queryKey: getGetDashboardStatsQueryKey({ date: today }) } },
  );

  const { data: teamSummary, isLoading: summaryLoading } = useGetTeamSummary(
    { date: today },
    { query: { queryKey: getGetTeamSummaryQueryKey({ date: today }) } },
  );

  const { data: tasks, isLoading: tasksLoading } = useListTasks(
    {},
    { query: { queryKey: getListTasksQueryKey() } },
  );
  const activeTasks = tasks?.filter((task) => task.status !== "completed" && task.status !== "cancelled") ?? [];

  const handleExport = () => {
    if (!teamSummary) return;
    exportToCsv(`hr_team_summary_${today}.csv`, teamSummary.map(t => ({
      Team: t.teamName,
      "Total Members": t.totalMembers,
      Submitted: t.submitted,
      Pending: t.pending,
      Absent: t.absent,
      "Completion %": t.completionPct,
    })));
  };

  const StatCard = ({ title, value, sub, icon: Icon, color = "text-violet-600", bg = "bg-violet-50", loading = false }: any) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
        <div className={`p-1.5 rounded-md ${bg}`}><Icon className={`h-4 w-4 ${color}`} /></div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-7 bg-gray-200 rounded animate-pulse w-20" />
        ) : (
          <>
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-violet-100 text-violet-700 text-xs font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wide">CEO Portal</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{user?.name}</h1>
          <p className="text-gray-500 mt-1">CEO dashboard overview for {format(new Date(), "MMMM d, yyyy")}</p>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" /> Export Summary
        </Button>
      </div>

      <div className="grid gap-5 grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Employees" value={stats?.totalEmployees ?? 0} icon={Users}
          color="text-violet-700" bg="bg-violet-50" loading={statsLoading} />
        <StatCard title="EODs Submitted" value={stats?.submittedEod ?? 0}
          sub={`${stats?.completionRate ?? 0}% completion`}
          icon={FileText} color="text-green-700" bg="bg-green-50" loading={statsLoading} />
        <StatCard title="Pending EODs" value={stats?.pendingEod ?? 0}
          icon={Clock} color="text-amber-700" bg="bg-amber-50" loading={statsLoading} />
        <StatCard title="Absent / On Leave"
          value={(stats?.absentEmployees ?? 0) + (stats?.onLeave ?? 0)}
          sub={`${stats?.absentEmployees ?? 0} absent · ${stats?.onLeave ?? 0} leave`}
          icon={AlertTriangle} color="text-red-700" bg="bg-red-50" loading={statsLoading} />
      </div>

      <div className="grid gap-5 grid-cols-2 lg:grid-cols-4">
        <StatCard title="Training Attended" value={stats?.trainingAttended ?? 0}
          icon={GraduationCap} color="text-indigo-700" bg="bg-indigo-50" loading={statsLoading} />
        <StatCard title="Tasks Completed" value={stats?.completedTasks ?? 0}
          icon={CheckSquare} color="text-emerald-700" bg="bg-emerald-50" loading={statsLoading} />
        <StatCard title="WIP Tasks" value={stats?.wipTasks ?? 0}
          icon={CheckSquare} color="text-amber-700" bg="bg-amber-50" loading={statsLoading} />
        <StatCard title="Tasks On Hold" value={stats?.holdTasks ?? 0}
          icon={CheckSquare} color="text-red-700" bg="bg-red-50" loading={statsLoading} />
      </div>

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

      {teamSummary && teamSummary.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Team-wise Attendance Summary</CardTitle></CardHeader>
          <CardContent>
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
                  {teamSummary.map(team => (
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
                            <div className="h-full bg-violet-600" style={{ width: `${team.completionPct}%` }} />
                          </div>
                          <span className="font-semibold text-violet-700">{team.completionPct}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

