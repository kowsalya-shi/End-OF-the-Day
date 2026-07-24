import { useState } from "react";
import { useListDailyWork, getListDailyWorkQueryKey, useListTeams, getListTeamsQueryKey } from "@workspace/api-client-react";
import { exportToCsv } from "@/lib/export-csv";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Download, Filter } from "lucide-react";

export default function ManagerDailyWork() {
  const [dateFilter, setDateFilter] = useState<string>("");
  const [teamFilter, setTeamFilter] = useState<string>("all");

  const { data: teams } = useListTeams({ query: { queryKey: getListTeamsQueryKey() } });

  const { data: dailyWork, isLoading } = useListDailyWork(
    { 
      date: dateFilter || undefined,
      teamId: teamFilter !== "all" ? parseInt(teamFilter) : undefined
    },
    { query: { 
      queryKey: getListDailyWorkQueryKey({ 
        date: dateFilter || undefined,
        teamId: teamFilter !== "all" ? parseInt(teamFilter) : undefined
      })
    } }
  );

  const handleExport = () => {
    if (dailyWork) {
      exportToCsv("all_daily_work.csv", dailyWork.map(w => ({
        ID: w.id,
        Date: w.date,
        Team: w.teamName || '',
        Member: w.userName || '',
        Action: w.action,
        Status: w.status,
      })));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Company Daily Work</h1>
          <p className="text-gray-500 mt-1">Cross-team view of daily work logs.</p>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" /> Export
        </Button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border flex flex-wrap gap-4 items-center">
        <div className="flex items-center text-sm font-medium text-gray-500">
          <Filter className="w-4 h-4 mr-2" /> Filters
        </div>
        <div className="w-48">
          <Input 
            type="date" 
            value={dateFilter} 
            onChange={(e) => setDateFilter(e.target.value)} 
          />
        </div>
        <div className="w-48">
          <Select value={teamFilter} onValueChange={setTeamFilter}>
            <SelectTrigger><SelectValue placeholder="Team" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teams</SelectItem>
              {teams?.map(t => (
                <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="h-32 text-center text-gray-500">Loading...</TableCell></TableRow>
              ) : dailyWork && dailyWork.length > 0 ? (
                dailyWork.map((work) => (
                  <TableRow key={work.id}>
                    <TableCell className="whitespace-nowrap">{work.date}</TableCell>
                    <TableCell className="text-xs text-gray-500">{work.teamName || "-"}</TableCell>
                    <TableCell className="font-medium">{work.userName || "-"}</TableCell>
                    <TableCell>{work.action}</TableCell>
                    <TableCell><StatusBadge status={work.status} /></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${work.completionPct || 0}%` }} />
                        </div>
                        <span className="text-xs text-gray-500">{work.completionPct || 0}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={6} className="h-32 text-center text-gray-500">No records found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

