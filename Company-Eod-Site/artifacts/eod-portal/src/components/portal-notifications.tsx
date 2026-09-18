import { useEffect, useState } from "react";
import { Bell, BellRing } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

type PortalNotification = { id: number; type: string; title: string; message: string; targetDate: string; readAt?: string | null; relatedTaskId?: number | null };
type NotificationSection = "missing_eod" | "overdue" | "approval" | "rejection" | "task_assignment" | "ageing" | "other";

function sectionFor(notification: PortalNotification): NotificationSection {
  if (notification.type.startsWith("task_assigned_")) return "task_assignment";
  if (notification.type.startsWith("ageing_task_")) return "ageing";
  if (notification.type.startsWith("missing_eod")) return "missing_eod";
  if (notification.type.startsWith("overdue_")) return "overdue";
  if (notification.type.includes("_rejected_") || notification.type.includes("send_back")) return "rejection";
  if (notification.type.startsWith("task_review_") || notification.type.includes("_approved_")) return "approval";
  return "other";
}

export function PortalNotifications() {
  const [notifications, setNotifications] = useState<PortalNotification[]>([]);
  const [selected, setSelected] = useState<PortalNotification | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const unread = notifications.filter((notification) => !notification.readAt);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) return;
    fetch("http://localhost:8080/api/notifications", { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.ok ? response.json() : [])
      .then((items) => setNotifications(items))
      .catch(() => setNotifications([]));
  }, []);

  const openDetails = async (notification: PortalNotification) => {
    setSelected(notification);
    if (notification.readAt) return;
    const response = await fetch(`http://localhost:8080/api/notifications/${notification.id}/read`, { method: "PATCH", headers: { Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}` } });
    if (!response.ok) return;
    const updated = await response.json();
    setNotifications((items) => items.map((item) => item.id === notification.id ? updated : item));
    window.dispatchEvent(new Event("portal-notifications-read"));
  };

  const updateStatus = async (id: number, solved: boolean) => {
    const response = await fetch(`http://localhost:8080/api/notifications/${id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}` }, body: JSON.stringify({ solved }) });
    if (!response.ok) return;
    const updated = await response.json();
    setNotifications((items) => items.map((item) => item.id === id ? updated : item));
    setSelected(null);
    window.dispatchEvent(new Event("portal-notifications-read"));
  };

  const acceptTask = async (notification: PortalNotification) => {
    if (!notification.relatedTaskId) return;
    setIsProcessing(true);
    try {
      const response = await fetch(`http://localhost:8080/api/tasks/${notification.relatedTaskId}/accept`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}`,
        },
      });

      if (response.ok) {
        toast({ title: "Task Accepted", description: "The task has been added to your task list." });
        // Remove notification from list
        setNotifications((items) => items.filter((item) => item.id !== notification.id));
        setSelected(null);
        window.dispatchEvent(new Event("portal-notifications-read"));
      } else {
        const error = await response.json();
        toast({ variant: "destructive", title: "Error", description: error.error || "Failed to accept task" });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Network error occurred" });
    } finally {
      setIsProcessing(false);
    }
  };

  const declineTask = async (notification: PortalNotification) => {
    if (!notification.relatedTaskId) return;
    if (!declineReason.trim()) {
      toast({ variant: "destructive", title: "Reason Required", description: "Please provide a reason for declining" });
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch(`http://localhost:8080/api/tasks/${notification.relatedTaskId}/decline`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}`,
        },
        body: JSON.stringify({ reason: declineReason }),
      });

      if (response.ok) {
        toast({ title: "Task Declined", description: "Your decline notification has been sent." });
        // Remove notification from list
        setNotifications((items) => items.filter((item) => item.id !== notification.id));
        setSelected(null);
        setDeclineReason("");
        window.dispatchEvent(new Event("portal-notifications-read"));
      } else {
        const error = await response.json();
        toast({ variant: "destructive", title: "Error", description: error.error || "Failed to decline task" });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Network error occurred" });
    } finally {
      setIsProcessing(false);
    }
  };

  const count = (section: NotificationSection) => unread.filter((item) => sectionFor(item) === section).length;
  const notificationList = (section: NotificationSection, emptyMessage: string) => {
    const items = unread.filter((item) => sectionFor(item) === section);
    if (!items.length) return <p className="py-6 text-center text-sm text-muted-foreground">{emptyMessage}</p>;
    return <div className="space-y-2">{items.map((notification) => <button key={notification.id} type="button" onClick={() => openDetails(notification)} className="w-full border-l-4 border-red-500 bg-red-50 px-4 py-3 text-left transition-colors hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-primary"><p className="text-sm font-semibold text-gray-900">{notification.title}</p><p className="mt-1 line-clamp-1 text-sm text-gray-700">{notification.message}</p><p className="mt-2 text-xs text-gray-500">Click to view details · Alert date: {notification.targetDate}</p></button>)}</div>;
  };

  return <>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0"><CardTitle className="text-base">Portal Alerts</CardTitle>{unread.length ? <BellRing className="h-5 w-5 text-red-600" /> : <Bell className="h-5 w-5 text-muted-foreground" />}</CardHeader>
      <CardContent><Tabs defaultValue="task_assignment"><TabsList className="mb-3 flex h-auto flex-wrap justify-start"><TabsTrigger value="task_assignment">Task Assignments ({count("task_assignment")})</TabsTrigger><TabsTrigger value="ageing">Ageing Tasks ({count("ageing")})</TabsTrigger><TabsTrigger value="missing_eod">Missing EOD ({count("missing_eod")})</TabsTrigger><TabsTrigger value="overdue">Overdue ({count("overdue")})</TabsTrigger><TabsTrigger value="approval">Approval ({count("approval")})</TabsTrigger><TabsTrigger value="rejection">Rework ({count("rejection")})</TabsTrigger><TabsTrigger value="activity">Other ({count("other")})</TabsTrigger></TabsList><TabsContent value="task_assignment">{notificationList("task_assignment", "No pending task assignments.")}</TabsContent><TabsContent value="ageing">{notificationList("ageing", "No ageing tasks. All tasks are progressing within the 5-day threshold.")}</TabsContent><TabsContent value="missing_eod">{notificationList("missing_eod", "No unread missing EOD notifications.")}</TabsContent><TabsContent value="overdue">{notificationList("overdue", "No unread overdue notifications.")}</TabsContent><TabsContent value="approval">{notificationList("approval", "No unread approval notifications.")}</TabsContent><TabsContent value="rejection">{notificationList("rejection", "No unread rejection or rework notifications.")}</TabsContent><TabsContent value="activity">{notificationList("other", "No unread other notifications.")}</TabsContent></Tabs></CardContent>
    </Card>
    <Dialog open={!!selected} onOpenChange={(open) => { if (!open) { setSelected(null); setDeclineReason(""); } }}><DialogContent><DialogHeader><DialogTitle>{selected?.title}</DialogTitle></DialogHeader><div className="space-y-3 text-sm"><p className="whitespace-pre-wrap text-gray-700">{selected?.message}</p><p className="text-xs text-muted-foreground">Alert date: {selected?.targetDate}</p>{selected?.type.startsWith("task_assigned_") && <div className="pt-2"><label className="block text-sm font-medium text-gray-700 mb-2">Reason for declining (optional for OK, required for NOT OK):</label><Textarea value={declineReason} onChange={(e) => setDeclineReason(e.target.value)} placeholder="Enter reason if declining..." className="w-full" /></div>}</div><DialogFooter>{selected?.type.startsWith("task_assigned_") ? <><Button variant="destructive" onClick={() => selected && declineTask(selected)} disabled={isProcessing}>{isProcessing ? "Processing..." : "NOT OK"}</Button><Button className="bg-green-600 hover:bg-green-700" onClick={() => selected && acceptTask(selected)} disabled={isProcessing}>{isProcessing ? "Processing..." : "OK"}</Button></> : selected?.type.startsWith("overdue_") ? <><Button variant="outline" onClick={() => updateStatus(selected.id, false)}>Keep Unsolved</Button><Button className="bg-green-600 hover:bg-green-700" onClick={() => updateStatus(selected.id, true)}>Mark Solved</Button></> : <Button onClick={() => setSelected(null)}>Close</Button>}</DialogFooter></DialogContent></Dialog>
  </>;
}
