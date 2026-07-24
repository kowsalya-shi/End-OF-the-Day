import { useState } from "react";
import {
  useListTraining, getListTrainingQueryKey,
  useListTeams, getListTeamsQueryKey,
} from "@workspace/api-client-react";
import { exportToCsv } from "@/lib/export-csv";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Download, Filter } from "lucide-react";

export default function HRTraining() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");

  const { data: teams } = useListTeams({ query: { queryKey: getListTeamsQueryKey() } });

  const { data: records, isLoading } = useListTraining(
    {
      status: statusFilter !== "all" ? statusFilter : undefined,
      teamId: teamFilter !== "all" ? parseInt(teamFilter) : undefined,
      month: monthFilter !== "all" ? parseInt(monthFilter) : undefined,
      year: new Date().getFullYear(),
    },
    {
      query: {
        queryKey: getListTrainingQueryKey({
          status: statusFilter !== "all" ? statusFilter : undefined,
          teamId: teamFilter !== "all" ? parseInt(teamFilter) : undefined,
          month: monthFilter !== "all" ? parseInt(monthFilter) : undefined,
          year: new Date().getFullYear(),
        }),
      },
    },
  );

  const handleExport = () => {
    if (!records) return;
    exportToCsv("hr_training_export.csv", records.map(r => ({
      Topic: r.topic,
      Category: r.category || "",
      Trainer: r.trainer || "",
      Team: r.teamName || "",
      "Assigned To": r.userName || "",
      Status: r.status,
      "Progress %": r.progressPct || 0,
      "Start Date": r.startDate || "",
      "End Date": r.endDate || "",
      Remarks: r.remarks || "",
    })));
  };

  const months = [
    { value: "1", label: "January" }, { value: "2", label: "February" },
    { value: "3", label: "March" }, { value: "4", label: "April" },
    { value: "5", label: "May" }, { value: "6", label: "June" },
    { value: "7", label: "July" }, { value: "8", label: "August" },
    { value: "9", label: "September" }, { value: "10", label: "October" },
    { value: "11", label: "November" }, { value: "12", label: "December" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-violet-100 text-violet-700 text-xs font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wide">CEO Portal</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Training Records</h1>
          <p className="text-gray-500 mt-1">Company-wide training and development overview.</p>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border flex flex-wrap gap-4 items-center">
        <div className="flex items-center text-sm font-medium text-gray-500">
          <Filter className="w-4 h-4 mr-2" /> Filters
        </div>
        <div className="w-44">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="practicing">Practicing</SelectItem>
              <SelectItem value="learning">Learning</SelectItem>
              <SelectItem value="yts">YTS</SelectItem>
              <SelectItem value="hold">Hold</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-44">
          <Select value={teamFilter} onValueChange={setTeamFilter}>
            <SelectTrigger><SelectValue placeholder="Team" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teams</SelectItem>
              {teams?.map(t => <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-44">
          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger><SelectValue placeholder="Month" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
              {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {(statusFilter !== "all" || teamFilter !== "all" || monthFilter !== "all") && (
          <Button variant="ghost" size="sm" onClick={() => { setStatusFilter("all"); setTeamFilter("all"); setMonthFilter("all"); }}>
            Clear
          </Button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="min-w-[180px]">Topic</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Trainer</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>End Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="h-32 text-center text-gray-500">Loading...</TableCell></TableRow>
              ) : records && records.length > 0 ? (
                records.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.topic}</TableCell>
                    <TableCell className="text-sm text-gray-500">{r.category || "—"}</TableCell>
                    <TableCell className="text-sm">{r.trainer || "—"}</TableCell>
                    <TableCell className="text-xs text-gray-500">{r.teamName || "—"}</TableCell>
                    <TableCell>{r.userName || "—"}</TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-violet-600" style={{ width: `${r.progressPct || 0}%` }} />
                        </div>
                        <span className="text-xs text-gray-500">{r.progressPct || 0}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{r.endDate || "—"}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={8} className="h-32 text-center text-gray-500">No training records found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

