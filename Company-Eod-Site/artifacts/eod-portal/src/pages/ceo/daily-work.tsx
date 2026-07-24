import { useState } from "react";
import {
  useListDailyWork, getListDailyWorkQueryKey,
  useListTeams, getListTeamsQueryKey,
} from "@workspace/api-client-react";
import { exportToCsv } from "@/lib/export-csv";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Download, Filter } from "lucide-react";

export default function HRDailyWork() {
  const [dateFilter, setDateFilter] = useState("");
  const [teamFilter, setTeamFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: teams } = useListTeams({ query: { queryKey: getListTeamsQueryKey() } });

  const { data: dailyWork, isLoading } = useListDailyWork(
    {
      date: dateFilter || undefined,
      teamId: teamFilter !== "all" ? parseInt(teamFilter) : undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
    },
    {
      query: {
        queryKey: getListDailyWorkQueryKey({
          date: dateFilter || undefined,
          teamId: teamFilter !== "all" ? parseInt(teamFilter) : undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
        }),
      },
    },
  );

  const handleExport = () => {
    if (!dailyWork) return;
    exportToCsv("hr_daily_work.csv", dailyWork.map(w => ({
      Date: w.date,
      Team: w.teamName || "",
      Member: w.userName || "",
      Action: w.action,
      How: w.how || "",
      Status: w.status,
      "Completion %": w.completionPct || 0,
      Remarks: w.remarks || "",
    })));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-violet-100 text-violet-700 text-xs font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wide">CEO Portal</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Company Daily Work</h1>
          <p className="text-gray-500 mt-1">Cross-team daily work log overview.</p>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border flex flex-wrap gap-4 items-center">
        <div className="flex items-center text-sm font-medium text-gray-500">
          <Filter className="w-4 h-4 mr-2" /> Filters
        </div>
        <Input type="date" className="w-44" value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
        <div className="w-44">
          <Select value={teamFilter} onValueChange={setTeamFilter}>
            <SelectTrigger><SelectValue placeholder="All Teams" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teams</SelectItem>
              {teams?.map(t => <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-44">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="wip">WIP</SelectItem>
              <SelectItem value="yts">YTS</SelectItem>
              <SelectItem value="hold">Hold</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {(dateFilter || teamFilter !== "all" || statusFilter !== "all") && (
          <Button variant="ghost" size="sm" onClick={() => { setDateFilter(""); setTeamFilter("all"); setStatusFilter("all"); }}>
            Clear
          </Button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Date</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Member</TableHead>
                <TableHead className="min-w-[200px]">Action</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Remarks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="h-32 text-center text-gray-500">Loading...</TableCell></TableRow>
              ) : dailyWork && dailyWork.length > 0 ? (
                dailyWork.map(w => (
                  <TableRow key={w.id}>
                    <TableCell className="whitespace-nowrap">{w.date}</TableCell>
                    <TableCell className="text-xs text-gray-500">{w.teamName || "—"}</TableCell>
                    <TableCell className="font-medium">{w.userName || "—"}</TableCell>
                    <TableCell>
                      <div>{w.action}</div>
                      {w.how && <div className="text-xs text-gray-400 mt-0.5">via {w.how}</div>}
                    </TableCell>
                    <TableCell><StatusBadge status={w.status} /></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-violet-600" style={{ width: `${w.completionPct || 0}%` }} />
                        </div>
                        <span className="text-xs text-gray-500">{w.completionPct || 0}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm max-w-[180px] truncate" title={w.remarks || ""}>{w.remarks || "—"}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={7} className="h-32 text-center text-gray-500">No records found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

