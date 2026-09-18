import { useEffect, useMemo, useState } from "react";
import { CheckCircle, CheckSquare, FileText, GraduationCap, ListTodo, XCircle, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge, AttendanceBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Report = Record<string, any>;
type TeamLead = { id: number; name: string };
const API = "http://localhost:8080/api";
const localDate = (offset = 0) => { const date = new Date(); date.setDate(date.getDate() + offset); return date.toLocaleDateString("en-CA"); };

export default function TlReports({ embedded = false, allowedTabs, defaultTab = "eod", reportRole = "tl", reportLabel = "Team Lead" }: { embedded?: boolean; allowedTabs?: Array<"eod" | "tasks" | "dailyWork" | "training">; defaultTab?: "eod" | "tasks" | "dailyWork" | "training"; reportRole?: "tl" | "it_manager" | "employee"; reportLabel?: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [reports, setReports] = useState<Record<string, Report[]>>({ eod: [], tasks: [], dailyWork: [], training: [] });
  const [teamLeads, setTeamLeads] = useState<TeamLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [memberId, setMemberId] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [eodToReject, setEodToReject] = useState<Report | null>(null);
  const [eodRejectionReason, setEodRejectionReason] = useState("");
  const [workToReject, setWorkToReject] = useState<{ kind: "tasks" | "daily-work"; report: Report } | null>(null);
  const [workRejectionReason, setWorkRejectionReason] = useState("");
  const canReviewReports = reportRole === "tl"
    ? ["it_manager", "manager", "ceo"].includes(user?.role || "")
    : reportRole === "it_manager"
      ? ["manager", "ceo"].includes(user?.role || "")
      : user?.role === "tl";
  const canManageTasks = ["tl", "manager", "it_manager", "ceo"].includes(user?.role || "");

  useEffect(() => {
    fetch(`${API}/users?role=${reportRole}`, { headers: { Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}` } })
      .then((response) => response.ok ? response.json() : [])
      .then((users) => setTeamLeads(users.map((user: TeamLead) => ({ id: user.id, name: user.name }))));
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const endpoints: Record<string, string> = { eod: "eod", tasks: "tasks", dailyWork: "daily-work", training: "training" };
    fetch(`${API}/${endpoints[activeTab]}?userRole=${reportRole}`, { headers: { Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}` } })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => { if (active) setReports((current) => ({ ...current, [activeTab]: data })); })
      .catch(() => { if (active) setReports((current) => ({ ...current, [activeTab]: [] })); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [activeTab, reportRole, refreshVersion]);

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
    setEodToReject(report);
    setEodRejectionReason("");
  };
  const submitEodRejection = async () => {
    if (!eodToReject || !eodRejectionReason.trim()) return;
    try {
      const response = await fetch(`${API}/eod/${eodToReject.id}/reject`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}` }, body: JSON.stringify({ approvedBy: user?.id, reason: eodRejectionReason.trim() }) });
      if (!response.ok) throw new Error();
      setReports((current) => ({ ...current, eod: current.eod.map((item) => item.id === eodToReject.id ? { ...item, approvalStatus: "rejected", rejectionReason: eodRejectionReason.trim() } : item) }));
      setEodToReject(null); setEodRejectionReason("");
      toast({ title: "Team Lead EOD rejected" });
    } catch { toast({ title: "Unable to reject Team Lead EOD", variant: "destructive" }); }
  };
  const reviewCompletedWork = async (kind: "tasks" | "daily-work", report: Report, approved: boolean) => {
    if (!approved) { setWorkToReject({ kind, report }); setWorkRejectionReason(""); return; }
    try {
      const response = await fetch(`${API}/${kind}/${report.id}/approve`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}` }, body: JSON.stringify({ approvedBy: user?.id }) });
      if (!response.ok) throw new Error();
      const reportKey = kind === "tasks" ? "tasks" : "dailyWork";
      setReports((current) => ({ ...current, [reportKey]: current[reportKey].map((item) => item.id === report.id ? { ...item, approvalStatus: "approved" } : item) }));
      toast({ title: "Completed work approved" });
    } catch { toast({ title: "Unable to review completed work", variant: "destructive" }); }
  };
  const submitWorkRejection = async () => {
    if (!workToReject || !workRejectionReason.trim()) return;
    try {
      const { kind, report } = workToReject;
      const response = await fetch(`${API}/${kind}/${report.id}/reject`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}` }, body: JSON.stringify({ approvedBy: user?.id, reason: workRejectionReason.trim() }) });
      if (!response.ok) throw new Error();
      const reportKey = kind === "tasks" ? "tasks" : "dailyWork";
      setReports((current) => ({ ...current, [reportKey]: current[reportKey].map((item) => item.id === report.id ? { ...item, approvalStatus: "rejected", rejectionReason: workRejectionReason.trim() } : item) }));
      setWorkToReject(null); setWorkRejectionReason("");
      toast({ title: "Completed work rejected" });
    } catch { toast({ title: "Unable to reject completed work", variant: "destructive" }); }
  };

  return <div className="space-y-6">
    {!embedded && <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h1 className="text-2xl font-bold text-gray-900">{reportLabel} Reports</h1><p className="mt-1 text-gray-500">Reports submitted by the {reportLabel.toLowerCase()}.</p></div>{activeTab === "tasks" && ["manager", "it_manager", "ceo"].includes(user?.role || "") && <InlineAssignTask onAssigned={() => setRefreshVersion((version) => version + 1)} />}</div>}
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
      {(!allowedTabs || allowedTabs.length > 1) && <TabsList className="h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
        {(!allowedTabs || allowedTabs.includes("eod")) && <TabsTrigger value="eod" className="gap-2"><FileText className="h-4 w-4" /> Daily EOD</TabsTrigger>}{(!allowedTabs || allowedTabs.includes("tasks")) && <TabsTrigger value="tasks" className="gap-2"><CheckSquare className="h-4 w-4" /> Tasks</TabsTrigger>}{(!allowedTabs || allowedTabs.includes("dailyWork")) && <TabsTrigger value="dailyWork" className="gap-2"><ListTodo className="h-4 w-4" /> Daily Work</TabsTrigger>}{(!allowedTabs || allowedTabs.includes("training")) && <TabsTrigger value="training" className="gap-2"><GraduationCap className="h-4 w-4" /> Training</TabsTrigger>}
      </TabsList>}
      <FilterBar teamLeads={teamLeads} memberLabel={reportLabel} memberId={memberId} setMemberId={setMemberId} dateFilter={dateFilter} setDateFilter={setDateFilter} status={status} setStatus={setStatus} priority={priority} setPriority={setPriority} taskTab={activeTab === "tasks"} clearFilters={clearFilters} />
      <TabsContent value="eod"><EodTable data={filtered} loading={loading} canApprove={canReviewReports} onApprove={approveTlEod} onReject={rejectTlEod} /></TabsContent><TabsContent value="tasks"><TasksTable data={filtered} loading={loading} canReview={canReviewReports} canManage={canManageTasks} onReview={(report, approved) => reviewCompletedWork("tasks", report, approved)} onChanged={() => setRefreshVersion((version) => version + 1)} /></TabsContent><TabsContent value="dailyWork"><DailyWorkTable data={filtered} loading={loading} canReview={canReviewReports} onReview={(report, approved) => reviewCompletedWork("daily-work", report, approved)} /></TabsContent><TabsContent value="training"><TrainingTable data={filtered} loading={loading} /></TabsContent>
    </Tabs>
    <Dialog open={!!eodToReject} onOpenChange={(open) => { if (!open) { setEodToReject(null); setEodRejectionReason(""); } }}><DialogContent><DialogHeader><DialogTitle>Reject EOD</DialogTitle></DialogHeader>{eodToReject && <p className="text-sm text-muted-foreground">Rejecting {eodToReject.userName}'s EOD for {eodToReject.date}.</p>}<Textarea value={eodRejectionReason} onChange={(event) => setEodRejectionReason(event.target.value)} placeholder="Enter the reason for rejection" /><DialogFooter><Button variant="outline" onClick={() => { setEodToReject(null); setEodRejectionReason(""); }}>Cancel</Button><Button variant="destructive" disabled={!eodRejectionReason.trim()} onClick={submitEodRejection}>Reject EOD</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={!!workToReject} onOpenChange={(open) => { if (!open) { setWorkToReject(null); setWorkRejectionReason(""); } }}><DialogContent><DialogHeader><DialogTitle>Reject Completed Work</DialogTitle></DialogHeader>{workToReject && <p className="text-sm text-muted-foreground">Rejecting {workToReject.report.userName}'s work: <span className="font-medium text-foreground">{workToReject.report.taskName || workToReject.report.action}</span>.</p>}<Textarea value={workRejectionReason} onChange={(event) => setWorkRejectionReason(event.target.value)} placeholder="Enter the reason for rejection" /><DialogFooter><Button variant="outline" onClick={() => { setWorkToReject(null); setWorkRejectionReason(""); }}>Cancel</Button><Button variant="destructive" disabled={!workRejectionReason.trim()} onClick={submitWorkRejection}>Reject Work</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}

function FilterBar(props: { teamLeads: TeamLead[]; memberLabel: string; memberId: string; setMemberId: (v: string) => void; dateFilter: string; setDateFilter: (v: string) => void; status: string; setStatus: (v: string) => void; priority: string; setPriority: (v: string) => void; taskTab: boolean; clearFilters: () => void }) {
  return <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-white p-4 shadow-sm">
    <Select value={props.memberId} onValueChange={props.setMemberId}><SelectTrigger className="w-52"><SelectValue placeholder={props.memberLabel} /></SelectTrigger><SelectContent><SelectItem value="all">All {props.memberLabel}s</SelectItem>{props.teamLeads.map((lead) => <SelectItem key={lead.id} value={String(lead.id)}>{lead.name}</SelectItem>)}</SelectContent></Select>
    <Select value={props.dateFilter} onValueChange={props.setDateFilter}><SelectTrigger className="w-36"><SelectValue placeholder="Date" /></SelectTrigger><SelectContent><SelectItem value="all">All dates</SelectItem><SelectItem value="today">Today</SelectItem><SelectItem value="yesterday">Yesterday</SelectItem></SelectContent></Select>
    <Select value={props.status} onValueChange={props.setStatus}><SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="approved">Approved</SelectItem><SelectItem value="rejected">Rejected</SelectItem><SelectItem value="resubmitted">Resubmitted</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="wip">WIP</SelectItem><SelectItem value="yts">YTS</SelectItem><SelectItem value="hold">Hold</SelectItem></SelectContent></Select>
    {props.taskTab && <Select value={props.priority} onValueChange={props.setPriority}><SelectTrigger className="w-36"><SelectValue placeholder="Priority" /></SelectTrigger><SelectContent><SelectItem value="all">All priorities</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent></Select>}
    <Button variant="ghost" size="sm" onClick={props.clearFilters}>Clear filters</Button>
  </div>;
}

function InlineAssignTask({ onAssigned }: { onAssigned: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [people, setPeople] = useState<any[]>([]);
  const [taskName, setTaskName] = useState("");
  const [userId, setUserId] = useState("");
  const [priority, setPriority] = useState("medium");
  const [plannedStartDate, setPlannedStartDate] = useState(localDate());
  const [plannedEndDate, setPlannedEndDate] = useState("");
  const [saving, setSaving] = useState(false);
  const allowedRoles = user?.role === "it_manager" ? ["tl", "employee"] : ["it_manager", "tl", "employee"];
  const assignees = people.filter((person) => allowedRoles.includes(person.role));
  useEffect(() => { if (!open) return; fetch(`${API}/users`, { headers: { Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}` } }).then((response) => response.ok ? response.json() : []).then(setPeople).catch(() => setPeople([])); }, [open]);
  const submit = async () => {
    const assignee = assignees.find((person) => String(person.id) === userId);
    if (!taskName.trim() || !assignee) { toast({ title: "Task name and assignee are required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const response = await fetch(`${API}/tasks`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}` }, body: JSON.stringify({ taskName: taskName.trim(), userId: assignee.id, teamId: assignee.teamId ?? null, who: assignee.name, assignedBy: user?.name ?? "", priority, status: "yts", completionPct: 0, plannedStartDate, plannedEndDate: plannedEndDate || null }) });
      if (!response.ok) throw new Error();
      toast({ title: "Task assigned" }); setOpen(false); setTaskName(""); setUserId(""); setPlannedEndDate(""); onAssigned();
    } catch { toast({ title: "Unable to assign task", variant: "destructive" }); } finally { setSaving(false); }
  };
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button><CheckSquare className="mr-2 h-4 w-4" /> Assign Task</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Assign Task</DialogTitle></DialogHeader><div className="space-y-4"><div><label className="text-sm font-medium">Task name</label><Input value={taskName} onChange={(event) => setTaskName(event.target.value)} /></div><div><label className="text-sm font-medium">Assign to</label><Select value={userId} onValueChange={setUserId}><SelectTrigger><SelectValue placeholder="Select person" /></SelectTrigger><SelectContent>{assignees.map((person) => <SelectItem key={person.id} value={String(person.id)}>{person.name} ({person.role === "it_manager" ? "IT Manager" : person.role === "tl" ? "Team Lead" : "Employee"})</SelectItem>)}</SelectContent></Select></div><div><label className="text-sm font-medium">Priority</label><Select value={priority} onValueChange={setPriority}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent></Select></div><div className="grid grid-cols-2 gap-3"><div><label className="text-sm font-medium">Start date</label><Input type="date" value={plannedStartDate} onChange={(event) => setPlannedStartDate(event.target.value)} /></div><div><label className="text-sm font-medium">End date</label><Input type="date" value={plannedEndDate} onChange={(event) => setPlannedEndDate(event.target.value)} /></div></div><div className="flex justify-end"><Button onClick={submit} disabled={saving}>{saving ? "Assigning..." : "Assign Task"}</Button></div></div></DialogContent></Dialog>;
}

function Frame({ children }: { children: React.ReactNode }) { return <div className="overflow-hidden rounded-lg border bg-white shadow-sm"><div className="overflow-x-auto"><Table>{children}</Table></div></div>; }
function State({ loading, count, cols }: { loading: boolean; count: number; cols: number }) { return loading ? <TableRow><TableCell colSpan={cols} className="h-32 text-center text-gray-500">Loading Team Lead records...</TableCell></TableRow> : !count ? <TableRow><TableCell colSpan={cols} className="h-32 text-center text-gray-500">No Team Lead records match these filters.</TableCell></TableRow> : null; }
function EodTable({ data, loading, canApprove, onApprove, onReject }: { data: Report[]; loading: boolean; canApprove: boolean; onApprove: (report: Report) => void; onReject: (report: Report) => void }) { const cols = canApprove ? 8 : 7; return <Frame><TableHeader><TableRow className="bg-gray-50"><TableHead>Date</TableHead><TableHead>Team Lead</TableHead><TableHead>Team</TableHead><TableHead>Attendance</TableHead><TableHead>Tasks</TableHead><TableHead>Approval</TableHead><TableHead>Work Summary</TableHead>{canApprove && <TableHead className="text-right">Action</TableHead>}</TableRow></TableHeader><TableBody><State loading={loading} count={data.length} cols={cols} />{!loading && data.map((item) => <TableRow key={item.id}><TableCell>{item.date}</TableCell><TableCell className="font-medium">{item.userName}</TableCell><TableCell>{item.teamName || "-"}</TableCell><TableCell><AttendanceBadge status={item.attendanceStatus} /></TableCell><TableCell>{item.tasksCompleted || 0}</TableCell><TableCell><StatusBadge status={item.approvalStatus || "pending"} /></TableCell><TableCell className="max-w-80 truncate" title={item.internalWork || ""}>{item.internalWork || "-"}</TableCell>{canApprove && <TableCell className="text-right">{["pending", "resubmitted"].includes(item.approvalStatus || "pending") && <span className="inline-flex gap-1"><Button title="Approve Team Lead EOD" variant="ghost" size="icon" onClick={() => onApprove(item)} className="h-8 w-8 text-green-600"><CheckCircle className="h-4 w-4" /></Button><Button title="Reject Team Lead EOD" variant="ghost" size="icon" onClick={() => onReject(item)} className="h-8 w-8 text-red-600"><XCircle className="h-4 w-4" /></Button></span>}</TableCell>}</TableRow>)}</TableBody></Frame>; }
function ReviewButtons({ item, onReview }: { item: Report; onReview: (report: Report, approved: boolean) => void }) { return item.status === "completed" && ["pending", "resubmitted"].includes(item.approvalStatus || "pending") ? <span className="inline-flex gap-1"><Button title="Approve completed work" variant="ghost" size="icon" onClick={() => onReview(item, true)} className="h-8 w-8 text-green-600"><CheckCircle className="h-4 w-4" /></Button><Button title="Reject completed work" variant="ghost" size="icon" onClick={() => onReview(item, false)} className="h-8 w-8 text-red-600"><XCircle className="h-4 w-4" /></Button></span> : null; }
function TasksTable({ data, loading, canReview, canManage, onReview, onChanged }: { data: Report[]; loading: boolean; canReview: boolean; canManage: boolean; onReview: (report: Report, approved: boolean) => void; onChanged: () => void }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [editTask, setEditTask] = useState<Report | null>(null);
  const [taskForm, setTaskForm] = useState({
    taskName: "", status: "yts", priority: "medium", completionPct: 0,
    plannedStartDate: "", plannedEndDate: "", remarks: "",
    assignedBy: "", who: "", userId: 0, teamId: 0
  });
  const [saving, setSaving] = useState(false);
  const [people, setPeople] = useState<any[]>([]);

  // Load people when edit dialog opens
  useEffect(() => {
    if (!editTask) return;
    fetch(`${API}/users`, { headers: { Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}` } })
      .then((response) => response.ok ? response.json() : [])
      .then(setPeople)
      .catch(() => setPeople([]));
  }, [editTask]);

  // Filter people based on user role
  const allowedRoles = user?.role === "it_manager" ? ["tl", "employee"] : ["it_manager", "tl", "employee"];
  const assignees = people.filter((person) => allowedRoles.includes(person.role));

  const openEdit = (task: Report) => {
    setEditTask(task);
    setTaskForm({
      taskName: task.taskName || "",
      status: task.status || "yts",
      priority: task.priority || "medium",
      completionPct: task.completionPct || 0,
      plannedStartDate: task.plannedStartDate || "",
      plannedEndDate: task.plannedEndDate || "",
      remarks: task.remarks || "",
      assignedBy: task.assignedBy || "",
      who: task.who || "",
      userId: task.userId || 0,
      teamId: task.teamId || 0
    });
  };

  const saveTask = async () => {
    if (!editTask) return;
    setSaving(true);
    try {
      const response = await fetch(`${API}/tasks/${editTask.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}`
        },
        body: JSON.stringify({
          taskName: taskForm.taskName,
          status: taskForm.status,
          priority: taskForm.priority,
          completionPct: taskForm.completionPct,
          plannedStartDate: taskForm.plannedStartDate,
          plannedEndDate: taskForm.plannedEndDate,
          remarks: taskForm.remarks,
          assignedBy: taskForm.assignedBy,
          who: taskForm.who,
          userId: taskForm.userId,
          teamId: taskForm.teamId
        })
      });
      if (!response.ok) throw new Error();
      toast({ title: "Task updated successfully" });
      setEditTask(null);
      onChanged();
    } catch {
      toast({ title: "Failed to update task", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const showActions = canReview || canManage;
  const cols = showActions ? 9 : 8;
  
  return <>
    <Frame>
      <TableHeader>
        <TableRow className="bg-gray-50">
          <TableHead>Team Lead</TableHead>
          <TableHead>Team</TableHead>
          <TableHead>Code</TableHead>
          <TableHead>Task</TableHead>
          <TableHead>Priority</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Approval</TableHead>
          <TableHead>Progress</TableHead>
          {showActions && <TableHead>Action</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        <State loading={loading} count={data.length} cols={cols} />
        {!loading && data.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="font-medium">{item.userName}</TableCell>
            <TableCell>{item.teamName || "-"}</TableCell>
            <TableCell>{item.taskCode || "-"}</TableCell>
            <TableCell>{item.taskName}</TableCell>
            <TableCell className="capitalize">{item.priority || "medium"}</TableCell>
            <TableCell><StatusBadge status={item.status} /></TableCell>
            <TableCell><StatusBadge status={item.approvalStatus || "pending"} /></TableCell>
            <TableCell>{item.completionPct || 0}%</TableCell>
            {showActions && (
              <TableCell>
                <div className="flex items-center gap-1">
                  {canReview && <ReviewButtons item={item} onReview={onReview} />}
                  {canManage && (
                    <Button
                      title="Edit task"
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(item)}
                      className="h-8 w-8 text-gray-500 hover:text-primary"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Frame>

    <Dialog open={!!editTask} onOpenChange={(open) => { if (!open) setEditTask(null); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Task Name</label>
            <Input
              value={taskForm.taskName}
              onChange={(e) => setTaskForm({ ...taskForm, taskName: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Assigned By</label>
              <Input
                value={taskForm.assignedBy}
                onChange={(e) => setTaskForm({ ...taskForm, assignedBy: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Assign To</label>
              <Select
                value={taskForm.userId ? taskForm.userId.toString() : ""}
                onValueChange={(val) => {
                  const selectedPerson = assignees.find(p => p.id.toString() === val);
                  if (selectedPerson) {
                    setTaskForm({
                      ...taskForm,
                      userId: selectedPerson.id,
                      teamId: selectedPerson.teamId || 0,
                      who: selectedPerson.name
                    });
                  }
                }}
              >
                <SelectTrigger><SelectValue placeholder="Select person" /></SelectTrigger>
                <SelectContent className="max-h-[300px] overflow-y-auto">
                  {assignees.map((person) => (
                    <SelectItem key={person.id} value={person.id.toString()}>
                      {person.name} ({person.role === "it_manager" ? "IT Manager" : person.role === "tl" ? "Team Lead" : "Employee"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Status</label>
              <Select
                value={taskForm.status}
                onValueChange={(val) => setTaskForm({ ...taskForm, status: val })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="yts">YTS</SelectItem>
                  <SelectItem value="wip">WIP</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="hold">Hold</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Priority</label>
              <Select
                value={taskForm.priority}
                onValueChange={(val) => setTaskForm({ ...taskForm, priority: val })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Planned Start Date</label>
              <Input
                type="date"
                value={taskForm.plannedStartDate}
                onChange={(e) => setTaskForm({ ...taskForm, plannedStartDate: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Planned End Date</label>
              <Input
                type="date"
                value={taskForm.plannedEndDate}
                onChange={(e) => setTaskForm({ ...taskForm, plannedEndDate: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Progress %</label>
            <Input
              type="number"
              min="0"
              max="100"
              value={taskForm.completionPct}
              onChange={(e) => setTaskForm({ ...taskForm, completionPct: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Remarks</label>
            <Textarea
              value={taskForm.remarks}
              onChange={(e) => setTaskForm({ ...taskForm, remarks: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setEditTask(null)}>Cancel</Button>
          <Button onClick={saveTask} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}
function DailyWorkTable({ data, loading, canReview, onReview }: { data: Report[]; loading: boolean; canReview: boolean; onReview: (report: Report, approved: boolean) => void }) { const cols = canReview ? 8 : 7; return <Frame><TableHeader><TableRow className="bg-gray-50"><TableHead>Date</TableHead><TableHead>Team Lead</TableHead><TableHead>Team</TableHead><TableHead>Action</TableHead><TableHead>Status</TableHead><TableHead>Approval</TableHead><TableHead>Progress</TableHead>{canReview && <TableHead>Action</TableHead>}</TableRow></TableHeader><TableBody><State loading={loading} count={data.length} cols={cols} />{!loading && data.map((item) => <TableRow key={item.id}><TableCell>{item.date}</TableCell><TableCell className="font-medium">{item.userName}</TableCell><TableCell>{item.teamName || "-"}</TableCell><TableCell>{item.action}</TableCell><TableCell><StatusBadge status={item.status} /></TableCell><TableCell><StatusBadge status={item.approvalStatus || "pending"} /></TableCell><TableCell>{item.completionPct || 0}%</TableCell>{canReview && <TableCell><ReviewButtons item={item} onReview={onReview} /></TableCell>}</TableRow>)}</TableBody></Frame>; }
function TrainingTable({ data, loading }: { data: Report[]; loading: boolean }) { return <Frame><TableHeader><TableRow className="bg-gray-50"><TableHead>Team Lead</TableHead><TableHead>Team</TableHead><TableHead>Topic</TableHead><TableHead>Category</TableHead><TableHead>Trainer</TableHead><TableHead>Status</TableHead><TableHead>Progress</TableHead></TableRow></TableHeader><TableBody><State loading={loading} count={data.length} cols={7} />{!loading && data.map((item) => <TableRow key={item.id}><TableCell className="font-medium">{item.userName}</TableCell><TableCell>{item.teamName || "-"}</TableCell><TableCell>{item.topic}</TableCell><TableCell>{item.category || "-"}</TableCell><TableCell>{item.trainer || "-"}</TableCell><TableCell><StatusBadge status={item.status} /></TableCell><TableCell>{item.progressPct || 0}%</TableCell></TableRow>)}</TableBody></Frame>; }
