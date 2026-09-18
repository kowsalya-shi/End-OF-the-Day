import { useEffect, useState } from "react";
import { format } from "date-fns";
import { FileText, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Activity = { id: number; action: string; actorName: string; details: string; createdAt?: string; targetDate: string };

export default function ActivityAudit() {
  const [items, setItems] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const load = () => {
    setLoading(true);
    fetch("http://localhost:8080/api/audit-activities", { headers: { Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}` } })
      .then((response) => response.ok ? response.json() : [])
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  return <div className="space-y-6">
    <div className="flex items-center justify-between gap-4"><div><h1 className="text-2xl font-bold text-gray-900">Activity Audit</h1><p className="mt-1 text-gray-500">Important portal actions recorded for authorized leadership review.</p></div><Button variant="outline" onClick={load} disabled={loading}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button></div>
    <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><FileText className="h-5 w-5" />Portal Activity</CardTitle></CardHeader><CardContent>{loading ? <div className="h-32 animate-pulse rounded bg-gray-100" /> : items.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-gray-500"><th className="px-3 py-3">Who</th><th className="px-3 py-3">Action</th><th className="px-3 py-3">Details</th><th className="px-3 py-3">Date & Time</th></tr></thead><tbody>{items.map((item) => <tr key={item.id} className="border-b align-top"><td className="px-3 py-3 font-medium">{item.actorName}</td><td className="px-3 py-3">{item.action}</td><td className="px-3 py-3">{item.details}</td><td className="whitespace-nowrap px-3 py-3 text-muted-foreground">{item.createdAt ? format(new Date(item.createdAt), "dd-MM-yyyy hh:mm a") : item.targetDate}</td></tr>)}</tbody></table></div> : <p className="py-8 text-center text-sm text-muted-foreground">No activity has been recorded yet.</p>}</CardContent></Card>
  </div>;
}
