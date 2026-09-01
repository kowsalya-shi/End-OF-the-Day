import { useEffect, useMemo, useState } from "react";
import { CheckCircle, CheckSquare, FileText, GraduationCap, ListTodo, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge, AttendanceBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Report = Record<string, any>;
type TeamLead = { id: number; name: string };
const API = "http://localhost:8080/api";
const localDate = (offset = 0) => { const date = new Date(); date.setDate(date.getDate() + offset); return date.toLocaleDateString("en-CA"); };

export default function TlReports() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("eod");
  const [reports, setReports] = useState<Record<string, Report[]>>({ eod: [], tasks: [], dailyWork: [], training: [] });
  const [teamLeads, setTeamLeads] = useState<TeamLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [memberId, setMemberId] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");

  useEffect(() => {
    fetch(`${API}/users?role=tl`, { headers: { Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}` } })
      .then((response) => response.ok ? response.json() : [])
      .then((users) => setTeamLeads(users.map((user: TeamLead) => ({ id: user.id, name: user.name }))));
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const endpoints: Record<string, string> = { eod: "eod", tasks: "tasks", dailyWork: "daily-work", training: "training" };
    fetch(`${API}/${endpoints[activeTab]}?userRole=tl`, { headers: { Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}` } })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => { if (active) setReports((current) => ({ ...current, [activeTab]: data })); })
      .catch(() => { if (active) setReports((current) => ({ ...current, [activeTab]: [] })); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [activeTab]);

  const filtered = useMemo(() => {
    const dateKey = activeTab === "tasks" ? "plannedStartDate" : activeTab === "training" ? "startDate" : "date";
    const targetDate = dateFilter === "today" ? localDate() : dateFilter === "yesterday" ? localDate(-1) : null;
    return reports[activeTab].filter((item) => {
      const itemStatus = activeTab === "eod" ? item.approvalStatus || "pending" : item.status;
      return (memberId === "all" || String(item.userId) === memberId)
        && (!targetDate || item[dateKey] === targetDate)
        && (status === "all" || itemStatus === status)
        && (priority === "all" || item.priority === priority);
    });
  }, [activeTab, reports, memberId, dateFilter, status, priority]);

  const clearFilters = () => { setMemberId("all"); setDateFilter("all"); setStatus("all"); setPriority("all"); };
  const approveTlEod = async (report: Report) => {
    try {
      const response = await fetch(`${API}/eod/${report.id}/approve`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}` }, body: JSON.stringify({ approvedBy: user?.id }) });
      if (!response.ok) throw new Error();
      setReports((current) => ({ ...current, eod: current.eod.map((item) => item.id === report.id ? { ...item, approvalStatus: "approved" } : item) }));
      toast({ title: "Team Lead EOD approved" });
    } catch { toast({ title: "Unable to approve Team Lead EOD", variant: "destructive" }); }
  };
  const rejectTlEod = async (report: Report) => {
    const reason = window.prompt(`Reason for rejecting ${report.userName}'s EOD:`)?.trim();
    if (!reason) return;
    try {
      const response = await fetch(`${API}/eod/${report.id}/reject`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}` }, body: JSON.stringify({ approvedBy: user?.id, reason }) });
      if (!response.ok) throw new Error();
      setReports((current) => ({ ...current, eod: current.eod.map((item) => item.id === report.id ? { ...item, approvalStatus: "rejected", rejectionReason: reason } : item) }));
      toast({ title: "Team Lead EOD rejected" });
    } catch { toast({ title: "Unable to reject Team Lead EOD", variant: "destructive" }); }
  };

  return <div className="space-y-6">
    <div><h1 className="text-2xl font-bold text-gray-900">Team Lead Reports</h1><p className="mt-1 text-gray-500">Only the four Team Leads appear here. Employee records are excluded.</p></div>
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
      <TabsList className="h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
        <TabsTrigger value="eod" className="gap-2"><FileText className="h-4 w-4" /> Daily EOD</TabsTrigger><TabsTrigger value="tasks" className="gap-2"><CheckSquare className="h-4 w-4" /> Tasks</TabsTrigger><TabsTrigger value="dailyWork" className="gap-2"><ListTodo className="h-4 w-4" /> Daily Work</TabsTrigger><TabsTrigger value="training" className="gap-2"><GraduationCap className="h-4 w-4" /> Training</TabsTrigger>
      </TabsList>
      <FilterBar teamLeads={teamLeads} memberId={memberId} setMemberId={setMemberId} dateFilter={dateFilter} setDateFilter={setDateFilter} status={status} setStatus={setStatus} priority={priority} setPriority={setPriority} taskTab={activeTab === "tasks"} clearFilters={clearFilters} />
      <TabsContent value="eod"><EodTable data={filtered} loading={loading} canApprove={user?.role === "manager"} onApprove={approveTlEod} onReject={rejectTlEod} /></TabsContent><TabsContent value="tasks"><TasksTable data={filtered} loading={loading} /></TabsContent><TabsContent value="dailyWork"><DailyWorkTable data={filtered} loading={loading} /></TabsContent><TabsContent value="training"><TrainingTable data={filtered} loading={loading} /></TabsContent>
    </Tabs>
  </div>;
}

function FilterBar(props: { teamLeads: TeamLead[]; memberId: string; setMemberId: (v: string) => void; dateFilter: string; setDateFilter: (v: string) => void; status: string; setStatus: (v: string) => void; priority: string; setPriority: (v: string) => void; taskTab: boolean; clearFilters: () => void }) {
  return <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-white p-4 shadow-sm">
    <Select value={props.memberId} onValueChange={props.setMemberId}><SelectTrigger className="w-52"><SelectValue placeholder="Team Lead" /></SelectTrigger><SelectContent><SelectItem value="all">All 4 Team Leads</SelectItem>{props.teamLeads.map((lead) => <SelectItem key={lead.id} value={String(lead.id)}>{lead.name}</SelectItem>)}</SelectContent></Select>
    <Select value={props.dateFilter} onValueChange={props.setDateFilter}><SelectTrigger className="w-36"><SelectValue placeholder="Date" /></SelectTrigger><SelectContent><SelectItem value="all">All dates</SelectItem><SelectItem value="today">Today</SelectItem><SelectItem value="yesterday">Yesterday</SelectItem></SelectContent></Select>
    <Select value={props.status} onValueChange={props.setStatus}><SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="approved">Approved</SelectItem><SelectItem value="rejected">Rejected</SelectItem><SelectItem value="resubmitted">Resubmitted</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="wip">WIP</SelectItem><SelectItem value="yts">YTS</SelectItem><SelectItem value="hold">Hold</SelectItem></SelectContent></Select>
    {props.taskTab && <Select value={props.priority} onValueChange={props.setPriority}><SelectTrigger className="w-36"><SelectValue placeholder="Priority" /></SelectTrigger><SelectContent><SelectItem value="all">All priorities</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent></Select>}
    <Button variant="ghost" size="sm" onClick={props.clearFilters}>Clear filters</Button>
  </div>;
}

function Frame({ children }: { children: React.ReactNode }) { return <div className="overflow-hidden rounded-lg border bg-white shadow-sm"><div className="overflow-x-auto"><Table>{children}</Table></div></div>; }
function State({ loading, count, cols }: { loading: boolean; count: number; cols: number }) { return loading ? <TableRow><TableCell colSpan={cols} className="h-32 text-center text-gray-500">Loading Team Lead records...</TableCell></TableRow> : !count ? <TableRow><TableCell colSpan={cols} className="h-32 text-center text-gray-500">No Team Lead records match these filters.</TableCell></TableRow> : null; }
function EodTable({ data, loading, canApprove, onApprove, onReject }: { data: Report[]; loading: boolean; canApprove: boolean; onApprove: (report: Report) => void; onReject: (report: Report) => void }) { const cols = canApprove ? 8 : 7; return <Frame><TableHeader><TableRow className="bg-gray-50"><TableHead>Date</TableHead><TableHead>Team Lead</TableHead><TableHead>Team</TableHead><TableHead>Attendance</TableHead><TableHead>Tasks</TableHead><TableHead>Approval</TableHead><TableHead>Work Summary</TableHead>{canApprove && <TableHead className="text-right">Action</TableHead>}</TableRow></TableHeader><TableBody><State loading={loading} count={data.length} cols={cols} />{!loading && data.map((item) => <TableRow key={item.id}><TableCell>{item.date}</TableCell><TableCell className="font-medium">{item.userName}</TableCell><TableCell>{item.teamName || "-"}</TableCell><TableCell><AttendanceBadge status={item.attendanceStatus} /></TableCell><TableCell>{item.tasksCompleted || 0}</TableCell><TableCell><StatusBadge status={item.approvalStatus || "pending"} /></TableCell><TableCell className="max-w-80 truncate" title={item.internalWork || ""}>{item.internalWork || "-"}</TableCell>{canApprove && <TableCell className="text-right">{["pending", "resubmitted"].includes(item.approvalStatus || "pending") && <span className="inline-flex gap-1"><Button title="Approve Team Lead EOD" variant="ghost" size="icon" onClick={() => onApprove(item)} className="h-8 w-8 text-green-600"><CheckCircle className="h-4 w-4" /></Button><Button title="Reject Team Lead EOD" variant="ghost" size="icon" onClick={() => onReject(item)} className="h-8 w-8 text-red-600"><XCircle className="h-4 w-4" /></Button></span>}</TableCell>}</TableRow>)}</TableBody></Frame>; }
function TasksTable({ data, loading }: { data: Report[]; loading: boolean }) { return <Frame><TableHeader><TableRow className="bg-gray-50"><TableHead>Team Lead</TableHead><TableHead>Team</TableHead><TableHead>Code</TableHead><TableHead>Task</TableHead><TableHead>Priority</TableHead><TableHead>Status</TableHead><TableHead>Approval</TableHead><TableHead>Progress</TableHead></TableRow></TableHeader><TableBody><State loading={loading} count={data.length} cols={8} />{!loading && data.map((item) => <TableRow key={item.id}><TableCell className="font-medium">{item.userName}</TableCell><TableCell>{item.teamName || "-"}</TableCell><TableCell>{item.taskCode || "-"}</TableCell><TableCell>{item.taskName}</TableCell><TableCell className="capitalize">{item.priority || "medium"}</TableCell><TableCell><StatusBadge status={item.status} /></TableCell><TableCell><StatusBadge status={item.approvalStatus || "pending"} /></TableCell><TableCell>{item.completionPct || 0}%</TableCell></TableRow>)}</TableBody></Frame>; }
function DailyWorkTable({ data, loading }: { data: Report[]; loading: boolean }) { return <Frame><TableHeader><TableRow className="bg-gray-50"><TableHead>Date</TableHead><TableHead>Team Lead</TableHead><TableHead>Team</TableHead><TableHead>Action</TableHead><TableHead>Status</TableHead><TableHead>Approval</TableHead><TableHead>Progress</TableHead></TableRow></TableHeader><TableBody><State loading={loading} count={data.length} cols={7} />{!loading && data.map((item) => <TableRow key={item.id}><TableCell>{item.date}</TableCell><TableCell className="font-medium">{item.userName}</TableCell><TableCell>{item.teamName || "-"}</TableCell><TableCell>{item.action}</TableCell><TableCell><StatusBadge status={item.status} /></TableCell><TableCell><StatusBadge status={item.approvalStatus || "pending"} /></TableCell><TableCell>{item.completionPct || 0}%</TableCell></TableRow>)}</TableBody></Frame>; }
function TrainingTable({ data, loading }: { data: Report[]; loading: boolean }) { return <Frame><TableHeader><TableRow className="bg-gray-50"><TableHead>Team Lead</TableHead><TableHead>Team</TableHead><TableHead>Topic</TableHead><TableHead>Category</TableHead><TableHead>Trainer</TableHead><TableHead>Status</TableHead><TableHead>Progress</TableHead></TableRow></TableHeader><TableBody><State loading={loading} count={data.length} cols={7} />{!loading && data.map((item) => <TableRow key={item.id}><TableCell className="font-medium">{item.userName}</TableCell><TableCell>{item.teamName || "-"}</TableCell><TableCell>{item.topic}</TableCell><TableCell>{item.category || "-"}</TableCell><TableCell>{item.trainer || "-"}</TableCell><TableCell><StatusBadge status={item.status} /></TableCell><TableCell>{item.progressPct || 0}%</TableCell></TableRow>)}</TableBody></Frame>; }
