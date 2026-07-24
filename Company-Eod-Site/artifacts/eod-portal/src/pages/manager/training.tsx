import { useState } from "react";
import { useListTraining, getListTrainingQueryKey, useListTeams, getListTeamsQueryKey } from "@workspace/api-client-react";
import { exportToCsv } from "@/lib/export-csv";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Download, Filter } from "lucide-react";

export default function ManagerTraining() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [teamFilter, setTeamFilter] = useState<string>("all");

  const { data: teams } = useListTeams({ query: { queryKey: getListTeamsQueryKey() } });

  const { data: training, isLoading } = useListTraining(
    { 
      status: statusFilter !== "all" ? statusFilter : undefined,
      teamId: teamFilter !== "all" ? parseInt(teamFilter) : undefined
    },
    { query: { 
      queryKey: getListTrainingQueryKey({ 
        status: statusFilter !== "all" ? statusFilter : undefined,
        teamId: teamFilter !== "all" ? parseInt(teamFilter) : undefined
      })
    } }
  );

  const handleExport = () => {
    if (training) {
      exportToCsv("all_training.csv", training.map(t => ({
        ID: t.id,
        Team: t.teamName || '',
        Member: t.userName || '',
        Topic: t.topic,
        Trainer: t.trainer || '',
        Status: t.status,
        Progress: `${t.progressPct || 0}%`,
      })));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Company Training</h1>
          <p className="text-gray-500 mt-1">Cross-team view of training records.</p>
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
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="learning">Learning</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
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
                <TableHead>Team</TableHead>
                <TableHead>Member</TableHead>
                <TableHead className="min-w-[200px]">Topic</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="h-32 text-center text-gray-500">Loading...</TableCell></TableRow>
              ) : training && training.length > 0 ? (
                training.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-xs text-gray-500">{t.teamName || "-"}</TableCell>
                    <TableCell className="font-medium">{t.userName || "-"}</TableCell>
                    <TableCell>{t.topic}</TableCell>
                    <TableCell><StatusBadge status={t.status} /></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${t.progressPct || 0}%` }} />
                        </div>
                        <span className="text-xs text-gray-500">{t.progressPct || 0}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={5} className="h-32 text-center text-gray-500">No records found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

