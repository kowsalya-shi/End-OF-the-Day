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
import { PortalNotifications } from "@/components/portal-notifications";

export default function TLDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const today = format(new Date(), "yyyy-MM-dd");
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [approvalLoading, setApprovalLoading] = useState(true);
  const [selectedEod, setSelectedEod] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: teamSummary, isLoading: summaryLoading } = useGetTeamSummary(
    { date: today },
    { query: { queryKey: getGetTeamSummaryQueryKey({ date: today }) } }
  );

  const { data: teams, isLoading: teamsLoading } = useListTeams(
    { query: { queryKey: getListTeamsQueryKey() } },
  );

  const loadPendingApprovals = async () => {
    if (!user?.id) return;
    setApprovalLoading(true);
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`http://localhost:8080/api/eod/approvals/pending?tlId=${user.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Unable to load EOD approvals");
      setPendingApprovals(await response.json());
    } catch {
      toast({ title: "Unable to load approvals", variant: "destructive" });
    } finally {
      setApprovalLoading(false);
    }
  };

  useEffect(() => {
    loadPendingApprovals();
  }, [user?.id]);

  const handleApprove = async (eodId: number) => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`http://localhost:8080/api/eod/${eodId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ approvedBy: user?.id }),
      });
      if (!response.ok) throw new Error("Unable to approve EOD");
      toast({ title: "EOD approved" });
      loadPendingApprovals();
    } catch {
      toast({ title: "Approval failed", variant: "destructive" });
    }
  };

  const handleReject = async () => {
    if (!selectedEod || !rejectionReason.trim()) return;
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`http://localhost:8080/api/eod/${selectedEod.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ approvedBy: user?.id, reason: rejectionReason.trim() }),
      });
      if (!response.ok) throw new Error("Unable to reject EOD");
      toast({ title: "EOD rejected" });
      setSelectedEod(null);
      setRejectionReason("");
      loadPendingApprovals();
    } catch {
      toast({ title: "Rejection failed", variant: "destructive" });
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

      <PortalNotifications />

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Awaiting EOD Approval</CardTitle>
          </CardHeader>
          <CardContent>
            {approvalLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-12 bg-gray-100 rounded animate-pulse"></div>)}
              </div>
            ) : pendingApprovals.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Team Member</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingApprovals.map((eod) => (
                      <TableRow key={eod.id}>
                        <TableCell className="font-medium">{eod.userName}</TableCell>
                        <TableCell className="text-sm text-gray-500">{new Date(eod.submittedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleApprove(eod.id)}>
                              <CheckCircle className="mr-1 h-4 w-4" /> Approve
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => setSelectedEod(eod)}>
                              <XCircle className="mr-1 h-4 w-4" /> Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-6 text-green-600 font-medium">
                No EOD submissions are awaiting approval.
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

      <Dialog open={!!selectedEod} onOpenChange={(open) => { if (!open) { setSelectedEod(null); setRejectionReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject EOD</DialogTitle>
          </DialogHeader>
          <Textarea
            value={rejectionReason}
            onChange={(event) => setRejectionReason(event.target.value)}
            placeholder="Reason for rejection"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSelectedEod(null); setRejectionReason(""); }}>Cancel</Button>
            <Button variant="destructive" disabled={!rejectionReason.trim()} onClick={handleReject}>Reject EOD</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

