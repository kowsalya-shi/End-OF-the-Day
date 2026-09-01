import { useState, useEffect } from "react";
import { format, subDays } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Calendar, TrendingUp, Users, Award, Clock, Activity } from "lucide-react";
import {
  useGetDashboardStats,
  useGetTeamSummary,
  useGetMonthlyTrend,
  getGetDashboardStatsQueryKey,
  getGetTeamSummaryQueryKey,
  getGetMonthlyTrendQueryKey,
  getListUsersQueryKey,
  useListUsers,
} from "@workspace/api-client-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Custom hook for fetching additional analytics data
function useAnalyticsData(endpoint: string) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    fetch(`http://localhost:8080/api/dashboard/${endpoint}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(`Error fetching ${endpoint}:`, err);
        setLoading(false);
      });
  }, [endpoint]);
  
  return { data, loading };
}

export default function HRAnalytics() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [timeRange, setTimeRange] = useState("week");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [selectedTeam, setSelectedTeam] = useState("all");
  const [selectedEmployee, setSelectedEmployee] = useState("all");

  const { data: stats } = useGetDashboardStats(
    { date: selectedDate },
    { query: { queryKey: getGetDashboardStatsQueryKey({ date: selectedDate }) } }
  );

  const { data: teamSummary } = useGetTeamSummary(
    { date: selectedDate },
    { query: { queryKey: getGetTeamSummaryQueryKey({ date: selectedDate }) } }
  );

  const { data: monthlyTrendData } = useGetMonthlyTrend(
    { year: new Date().getFullYear() },
    { query: { queryKey: getGetMonthlyTrendQueryKey({ year: new Date().getFullYear() }) } }
  );
  const { data: portalUsers } = useListUsers({}, { query: { queryKey: getListUsersQueryKey({}) } });
  const selectablePeople = (portalUsers ?? []).filter((person) => person.role === "employee" || person.role === "tl").sort((a, b) => a.name.localeCompare(b.name));

  // Fetch real-time data from new endpoints
  const { data: topPerformers } = useAnalyticsData("top-performers?limit=5");
  const { data: recentActivity } = useAnalyticsData("recent-activity?limit=10");
  const { data: pendingEmployees } = useAnalyticsData(`pending-employees?date=${selectedDate}`);
  const { data: weeklyHeatmapData } = useAnalyticsData("weekly-heatmap");

  // Filter data based on selections
  const filteredTeamSummary = teamSummary?.filter(team => {
    if (selectedDepartment !== "all" && team.teamName !== selectedDepartment) return false;
    return true;
  });

  const filteredTopPerformers = topPerformers?.filter(performer => {
    if (selectedDepartment !== "all" && performer.department !== selectedDepartment) return false;
    if (selectedEmployee !== "all" && performer.name.toLowerCase().replace(/\s+/g, '-') !== selectedEmployee) return false;
    return true;
  });

  const filteredPendingEmployees = pendingEmployees?.filter(emp => {
    if (selectedDepartment !== "all" && emp.department !== selectedDepartment) return false;
    if (selectedEmployee !== "all" && emp.name.toLowerCase().replace(/\s+/g, '-') !== selectedEmployee) return false;
    return true;
  });

  const filteredRecentActivity = recentActivity?.filter(activity => {
    if (selectedEmployee !== "all" && activity.userName.toLowerCase().replace(/\s+/g, '-') !== selectedEmployee) return false;
    return true;
  });

  const handleExportPDF = () => {
    alert("Export PDF functionality - to be implemented");
  };

  const handleExportExcel = () => {
    alert("Export Excel functionality - to be implemented");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">EOD Analytics Dashboard</h1>
          <p className="text-gray-500 mt-1">Comprehensive tracking and performance metrics</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportPDF}>
            <Download className="mr-2 h-4 w-4" /> Export PDF
          </Button>
          <Button variant="outline" onClick={handleExportExcel}>
            <Download className="mr-2 h-4 w-4" /> Export Excel
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Time Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                <SelectItem value="Developer">Developer</SelectItem>
                <SelectItem value="FICO">FICO</SelectItem>
                <SelectItem value="PP">PP</SelectItem>
                <SelectItem value="MM">MM</SelectItem>
                <SelectItem value="EWM">EWM</SelectItem>
                <SelectItem value="SD">SD</SelectItem>
                <SelectItem value="Sales">Sales</SelectItem>
                <SelectItem value="Data Analysis">Data Analysis</SelectItem>
                <SelectItem value="ABAP">ABAP</SelectItem>
                <SelectItem value="HCM">HCM</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Team Leader" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Team Leaders</SelectItem>
                <SelectItem value="SOUBHGYA">SOUBHGYA (FICO)</SelectItem>
                <SelectItem value="Waseem">Waseem (MM)</SelectItem>
                <SelectItem value="Javeed">Javeed (SD)</SelectItem>
                <SelectItem value="Rajshekar">Rajshekar (Developer)</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Employee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {selectablePeople.map((person) => <SelectItem key={person.id} value={person.name.toLowerCase().replace(/\s+/g, "-")}>{person.name}{person.role === "tl" ? " (TL)" : person.department ? ` (${person.department})` : ""}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Team EOD Completion % */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Team EOD Completion %
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredTeamSummary?.map((team) => (
              <div key={team.teamId} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{team.teamName}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{team.completionPct}%</span>
                    <span className={`text-xl ${
                      team.completionPct >= 90 ? "text-green-500" :
                      team.completionPct >= 75 ? "text-yellow-500" :
                      "text-red-500"
                    }`}>
                      {team.completionPct >= 90 ? "🟢" :
                       team.completionPct >= 75 ? "🟡" : "🔴"}
                    </span>
                  </div>
                </div>
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      team.completionPct >= 90 ? "bg-green-500" :
                      team.completionPct >= 75 ? "bg-yellow-500" :
                      "bg-red-500"
                    }`}
                    style={{ width: `${team.completionPct}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>✔ Submitted: {team.submitted}</span>
                  <span>❌ Pending: {team.pending}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">
                {Math.round(
                  (filteredTeamSummary?.reduce((acc, t) => acc + t.completionPct, 0) || 0) /
                  (filteredTeamSummary?.length || 1)
                )}%
              </div>
              <div className="text-sm text-gray-500 mt-1">Overall Completion</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly EOD Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Monthly EOD Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-end justify-between gap-2">
            {monthlyTrendData?.slice(0, 6).map((item, idx) => {
              const maxValue = 300;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                  <div className="relative w-full flex items-end justify-center gap-1 h-48">
                    <div
                      className="w-1/2 bg-purple-500 rounded-t-sm hover:bg-purple-600 transition-colors cursor-pointer group relative"
                      style={{ height: `${(item.submitted / maxValue) * 100}%` }}
                    >
                      <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                        Submitted: {item.submitted}
                      </div>
                    </div>
                    <div
                      className="w-1/2 bg-green-500 rounded-t-sm hover:bg-green-600 transition-colors cursor-pointer group relative"
                      style={{ height: `${(item.totalTasks / maxValue) * 100}%` }}
                    >
                      <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                        Tasks: {item.totalTasks}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs font-medium text-gray-600">{item.monthLabel}</div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-center gap-6 mt-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-purple-500 rounded" />
              <span>Submitted EODs</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded" />
              <span>Tasks Logged</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Performers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-500" />
              🏆 Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredTopPerformers && filteredTopPerformers.length > 0 ? filteredTopPerformers.map((performer, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-gray-50 to-white hover:from-gray-100 hover:to-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-white ${
                      idx === 0 ? "bg-yellow-500" :
                      idx === 1 ? "bg-gray-400" :
                      idx === 2 ? "bg-orange-600" :
                      "bg-primary"
                    }`}>
                      {idx + 1}
                    </div>
                    <div>
                      <div className="font-semibold">{performer.name}</div>
                      <div className="text-xs text-gray-500">{performer.completedTasks} Tasks</div>
                    </div>
                  </div>
                  <div className="text-2xl">
                    {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : "⭐"}
                  </div>
                </div>
              )) : (
                <div className="text-center text-gray-500 py-4">No data available</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredRecentActivity && filteredRecentActivity.length > 0 ? filteredRecentActivity.slice(0, 5).map((activity, idx) => (
                <div key={idx} className="flex items-start gap-3 pb-3 border-b last:border-0">
                  <div className={`mt-0.5 ${
                    activity.status === "success" ? "text-green-500" : "text-yellow-500"
                  }`}>
                    {activity.status === "success" ? "✔" : "❌"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-semibold">{activity.userName}</span>{" "}
                      <span className="text-gray-600">{activity.action}</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{activity.timeAgo}</p>
                  </div>
                </div>
              )) : (
                <div className="text-center text-gray-500 py-4">No recent activity</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Weekly Submission Heatmap
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {weeklyHeatmapData && weeklyHeatmapData.length > 0 ? weeklyHeatmapData.map((week, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="w-12 text-xs font-medium text-gray-600">{week.day}</div>
                <div className="flex gap-1">
                  <div
                    className={`w-8 h-8 rounded ${
                      week.status === "complete" ? "bg-green-500" :
                      week.status === "partial" ? "bg-yellow-500" :
                      "bg-red-500"
                    } hover:scale-110 transition-transform cursor-pointer`}
                    title={`${week.day} - ${week.submitted}/${week.total} submitted (${Math.round(week.completionRate * 100)}%)`}
                  />
                </div>
              </div>
            )) : (
              <div className="text-center text-gray-500 py-4">Loading heatmap...</div>
            )}
          </div>
          <div className="flex justify-center gap-4 mt-6 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded" />
              <span>All Submitted</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-500 rounded" />
              <span>Partial</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded" />
              <span>Missing</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Employees */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-amber-600" />
            Pending EODs Today
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {filteredPendingEmployees && filteredPendingEmployees.length > 0 ? filteredPendingEmployees.slice(0, 6).map((emp, idx) => (
              <div key={idx} className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <span className="text-amber-600">❌</span>
                <span className="font-medium text-sm">{emp.name}</span>
              </div>
            )) : (
              <div className="col-span-full text-center text-green-600 py-4">
                ✔ All EODs submitted!
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            🔔 Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <span className="text-green-600">✔</span>
              <span className="text-gray-700">{stats?.submittedEod || 0} EODs submitted today</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-yellow-600">⚠</span>
              <span className="text-gray-700">{stats?.pendingEod || 0} employees pending submission</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-600">📈</span>
              <span className="text-gray-700">Completion rate: {stats?.completionRate || 0}%</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

