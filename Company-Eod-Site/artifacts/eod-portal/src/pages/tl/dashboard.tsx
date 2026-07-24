import { useAuth } from "@/lib/auth";
import { format } from "date-fns";
import { 
  useGetTeamSummary, getGetTeamSummaryQueryKey,
  useListPendingEod, getListPendingEodQueryKey,
  useGetTaskStatusSummary, getGetTaskStatusSummaryQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, CheckSquare, Clock } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function TLDashboard() {
  const { user } = useAuth();
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: teamSummary, isLoading: summaryLoading } = useGetTeamSummary(
    { date: today },
    { query: { queryKey: getGetTeamSummaryQueryKey({ date: today }) } }
  );

  const { data: pendingEod, isLoading: pendingLoading } = useListPendingEod(
    { tlId: user?.id, date: today },
    { query: { queryKey: getListPendingEodQueryKey({ tlId: user?.id, date: today }), enabled: !!user?.id } }
  );

  const { data: taskSummary, isLoading: tasksLoading } = useGetTaskStatusSummary(
    { tlId: user?.id },
    { query: { queryKey: getGetTaskStatusSummaryQueryKey({ tlId: user?.id }), enabled: !!user?.id } }
  );

  // Calculate total members across all teams managed by this TL
  const myTeams = teamSummary?.filter(t => {
    // Find teams where this TL is the leader
    return user?.id && t.teamId; // We'll need to check team leadership on backend
  });
  
  const totalMembers = myTeams?.reduce((sum, team) => sum + (team.totalMembers || 0), 0) || 0;
  const totalSubmitted = myTeams?.reduce((sum, team) => sum + (team.submitted || 0), 0) || 0;
  const totalPending = myTeams?.reduce((sum, team) => sum + (team.pending || 0), 0) || 0;
  const totalAbsent = myTeams?.reduce((sum, team) => sum + (team.absent || 0), 0) || 0;
  const completionPct = totalMembers > 0 ? Math.round((totalSubmitted / totalMembers) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Team Leader Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of your team's performance for {format(new Date(), "MMMM d, yyyy")}</p>
      </div>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
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
            {summaryLoading ? (
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
            {summaryLoading ? (
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
            {summaryLoading ? (
              <div className="h-7 bg-gray-200 rounded animate-pulse w-16"></div>
            ) : (
              <div className="text-2xl font-bold text-red-600">{totalAbsent}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Pending EOD Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            {pendingLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-12 bg-gray-100 rounded animate-pulse"></div>)}
              </div>
            ) : pendingEod && pendingEod.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Team Member</TableHead>
                      <TableHead>Email</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingEod.map((p) => (
                      <TableRow key={p.userId}>
                        <TableCell className="font-medium">{p.userName}</TableCell>
                        <TableCell className="text-sm text-gray-500">{p.email}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-6 text-green-600 font-medium">
                All team members have submitted their EODs today! 🎉
              </div>
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
    </div>
  );
}

