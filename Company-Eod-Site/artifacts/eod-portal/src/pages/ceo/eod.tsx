import { useState } from "react";
import { format } from "date-fns";
import {
  useListEod, getListEodQueryKey,
  useListTeams, getListTeamsQueryKey,
} from "@workspace/api-client-react";
import { exportToCsv } from "@/lib/export-csv";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AttendanceBadge } from "@/components/ui/status-badge";
import { Download, Filter } from "lucide-react";

export default function HREod() {
  const today = format(new Date(), "yyyy-MM-dd");
  const [dateFilter, setDateFilter] = useState<string>(today);
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [attendanceFilter, setAttendanceFilter] = useState<string>("all");

  const { data: teams } = useListTeams({ query: { queryKey: getListTeamsQueryKey() } });

  const { data: eods, isLoading } = useListEod(
    {
      date: dateFilter || undefined,
      teamId: teamFilter !== "all" ? parseInt(teamFilter) : undefined,
      userRole: "employee",
    } as any,
    {
      query: {
        queryKey: getListEodQueryKey({
          date: dateFilter || undefined,
          teamId: teamFilter !== "all" ? parseInt(teamFilter) : undefined,
          userRole: "employee",
        } as any),
      },
    },
  );

  const filtered = eods?.filter(e =>
    attendanceFilter === "all" ? true : e.attendanceStatus === attendanceFilter,
  );

  const handleExport = () => {
    if (!filtered) return;
    exportToCsv(`hr_eod_${dateFilter}.csv`, filtered.map(e => ({
      Date: e.date,
      Employee: e.userName,
      Team: e.teamName || "",
      Attendance: e.attendanceStatus,
      "Tasks Completed": e.tasksCompleted ?? 0,
      "Training Attended": e.trainingAttended ? "Yes" : "No",
      "Training Topic": e.trainingTopic || "",
      "Internal Work": e.internalWork || "",
      Challenges: e.challenges || "",
      "Tomorrow Plan": e.tomorrowPlan || "",
      Remarks: e.remarks || "",
      "Submitted At": e.submittedAt ? new Date(e.submittedAt).toLocaleString() : "",
    })));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-violet-100 text-violet-700 text-xs font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wide">CEO Portal</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">EOD Reports</h1>
          <p className="text-gray-500 mt-1">Company-wide End-of-Day submissions.</p>
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
          <Select value={attendanceFilter} onValueChange={setAttendanceFilter}>
            <SelectTrigger><SelectValue placeholder="Attendance" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Attendance</SelectItem>
              <SelectItem value="present">Present</SelectItem>
              <SelectItem value="absent">Absent</SelectItem>
              <SelectItem value="leave">Leave</SelectItem>
              <SelectItem value="half-day">Half Day</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {(teamFilter !== "all" || attendanceFilter !== "all") && (
          <Button variant="ghost" size="sm" onClick={() => { setTeamFilter("all"); setAttendanceFilter("all"); }}>
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
                <TableHead>Employee</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Attendance</TableHead>
                <TableHead>Tasks</TableHead>
                <TableHead>Training</TableHead>
                <TableHead className="min-w-[200px]">Work Summary</TableHead>
                <TableHead>Submitted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-gray-500">Loading EOD records...</TableCell>
                </TableRow>
              ) : filtered && filtered.length > 0 ? (
                filtered.map(eod => (
                  <TableRow key={eod.id}>
                    <TableCell className="whitespace-nowrap font-medium">{eod.date}</TableCell>
                    <TableCell className="font-medium">{eod.userName}</TableCell>
                    <TableCell className="text-xs text-gray-500">{eod.teamName || "—"}</TableCell>
                    <TableCell><AttendanceBadge status={eod.attendanceStatus} /></TableCell>
                    <TableCell className="text-center">{eod.tasksCompleted ?? 0}</TableCell>
                    <TableCell>
                      {eod.trainingAttended ? (
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                          {eod.trainingTopic || "Yes"}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate" title={eod.internalWork || ""}>
                      {eod.internalWork || "—"}
                    </TableCell>
                    <TableCell className="text-xs text-gray-500 whitespace-nowrap">
                      {eod.submittedAt ? new Date(eod.submittedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-gray-500">
                    No EOD records found for the selected filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

