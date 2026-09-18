import { useEffect, useState } from "react";
import { Repeat2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Task = { id: number; taskName: string; userId?: number | null };

export function TaskReassignButton({ task, onComplete }: { task: Task; onComplete: () => void }) {
  const [open, setOpen] = useState(false);
  const [assigneeId, setAssigneeId] = useState("");
  const [note, setNote] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    fetch("http://localhost:8080/api/users", { headers: { Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}` } })
      .then((response) => response.ok ? response.json() : [])
      .then(setUsers)
      .catch(() => setUsers([]));
  }, [open]);

  const reassign = async () => {
    if (!assigneeId) return setError("Select a new assignee.");
    setSaving(true); setError("");
    try {
      const response = await fetch(`http://localhost:8080/api/tasks/${task.id}/reassign`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}` },
        body: JSON.stringify({ assigneeId: Number(assigneeId), note }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to reassign task");
      setOpen(false); setAssigneeId(""); setNote(""); onComplete();
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to reassign task"); }
    finally { setSaving(false); }
  };

  return <><Button title="Reassign Task" variant="outline" size="sm" onClick={() => setOpen(true)} className="h-8 gap-1"><Repeat2 className="h-4 w-4" />Reassign</Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Reassign Task</DialogTitle></DialogHeader>
      <p className="text-sm text-muted-foreground">Assign “{task.taskName}” to another person. The previous assignment remains in the audit history.</p>
      <Select value={assigneeId} onValueChange={setAssigneeId}><SelectTrigger><SelectValue placeholder="Select new assignee" /></SelectTrigger><SelectContent>{users.filter((user) => user.status !== "inactive" && user.id !== task.userId).map((user) => <SelectItem key={user.id} value={String(user.id)}>{user.name} · {user.role}</SelectItem>)}</SelectContent></Select>
      <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional reassignment note" />
      {error && <p className="text-sm text-red-600">{error}</p>}<DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button disabled={saving || !assigneeId} onClick={reassign}>{saving ? "Reassigning…" : "Reassign Task"}</Button></DialogFooter>
    </DialogContent></Dialog></>;
}
