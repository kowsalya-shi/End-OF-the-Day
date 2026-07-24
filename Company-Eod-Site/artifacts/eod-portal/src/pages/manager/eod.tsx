import { useState } from "react";
import { useListEod, getListEodQueryKey, useListTeams, getListTeamsQueryKey } from "@workspace/api-client-react";
import { format } from "date-fns";
import { exportToCsv } from "@/lib/export-csv";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge, AttendanceBadge } from "@/components/ui/status-badge";
import { Download, Filter, Eye } from "lucide-react";

export default function ManagerEod() {
  const today = format(new Date(), "yyyy-MM-dd");
  
  const [dateFilter, setDateFilter] = useState<string>(today);
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [selectedEod, setSelectedEod] = useState<any>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  const { data: teams } = useListTeams({ query: { queryKey: getListTeamsQueryKey() } });

  const { data: eods, isLoading } = useListEod(
    { 
      date: dateFilter || undefined,
      teamId: teamFilter !== "all" ? parseInt(teamFilter) : undefined
    },
    { query: { 
      queryKey: getListEodQueryKey({ 
        date: dateFilter || undefined,
        teamId: teamFilter !== "all" ? parseInt(teamFilter) : undefined
      }),
    } }
  );

  const handleExport = () => {
    if (eods) {
      exportToCsv("all_eods.csv", eods.map(e => ({
        ID: e.id,
        Date: e.date,
        'Team Member': e.userName || '',
        Team: e.teamName || '',
        Attendance: e.attendanceStatus,
        'Submitted At': new Date(e.submittedAt).toLocaleString(),
        'Tasks Completed': e.tasksCompleted || 0,
        'Training Attended': e.trainingAttended ? 'Yes' : 'No',
        'Training Topic': e.trainingTopic || '',
        Remarks: e.remarks || ''
      })));
    }
  };

  const openView = (eod: any) => {
    setSelectedEod(eod);
    setIsViewOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All EOD Submissions</h1>
          <p className="text-gray-500 mt-1">Company-wide view of End-of-Day reports.</p>
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
            <SelectTrigger><SelectValue placeholder="All Teams" /></SelectTrigger>
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
                <TableHead>Member</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Attendance</TableHead>
                <TableHead>Tasks</TableHead>
                <TableHead>Time</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-gray-500">Loading...</TableCell>
                </TableRow>
              ) : eods && eods.length > 0 ? (
                eods.map((eod) => (
                  <TableRow key={eod.id}>
                    <TableCell className="whitespace-nowrap">{eod.date}</TableCell>
                    <TableCell className="font-medium">{eod.userName}</TableCell>
                    <TableCell className="text-gray-500">{eod.teamName || "-"}</TableCell>
                    <TableCell><AttendanceBadge status={eod.attendanceStatus} /></TableCell>
                    <TableCell>{eod.tasksCompleted || 0}</TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {new Date(eod.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openView(eod)}>
                        <Eye className="h-4 w-4 mr-1" /> View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-gray-500">No submissions found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* View Dialog similar to TL view */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>EOD Report Details</DialogTitle>
          </DialogHeader>
          {selectedEod && (
             <div className="space-y-6 pt-4">
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg border">
               <div>
                 <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Team Member</div>
                 <div className="font-medium text-gray-900">{selectedEod.userName}</div>
                 <div className="text-xs text-gray-500">{selectedEod.teamName}</div>
               </div>
               <div>
                 <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Date</div>
                 <div className="font-medium text-gray-900">{selectedEod.date}</div>
               </div>
               <div>
                 <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Attendance</div>
                 <AttendanceBadge status={selectedEod.attendanceStatus} />
               </div>
               <div>
                 <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Submitted At</div>
                 <div className="font-medium text-gray-900">
                   {new Date(selectedEod.submittedAt).toLocaleTimeString()}
                 </div>
               </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div>
                 <h3 className="text-sm font-semibold text-gray-900 border-b pb-2 mb-3">Work Summary</h3>
                 <div className="space-y-4">
                   <div>
                     <span className="text-sm text-gray-500 block mb-1">Tasks Completed</span>
                     <span className="font-medium">{selectedEod.tasksCompleted || 0}</span>
                   </div>
                   <div>
                     <span className="text-sm text-gray-500 block mb-1">Internal Work Details</span>
                     <div className="text-sm whitespace-pre-wrap bg-gray-50 p-3 rounded-md min-h-20 border border-gray-100">
                       {selectedEod.internalWork || "No details provided."}
                     </div>
                   </div>
                 </div>
               </div>

               <div>
                 <h3 className="text-sm font-semibold text-gray-900 border-b pb-2 mb-3">Training & Challenges</h3>
                 <div className="space-y-4">
                   <div>
                     <span className="text-sm text-gray-500 block mb-1">Training Attended</span>
                     <div className="font-medium">
                       {selectedEod.trainingAttended ? `Yes - ${selectedEod.trainingTopic || 'Topic not specified'}` : 'No'}
                     </div>
                   </div>
                   <div>
                     <span className="text-sm text-gray-500 block mb-1">Challenges / Blockers</span>
                     <div className="text-sm whitespace-pre-wrap bg-gray-50 p-3 rounded-md min-h-20 border border-gray-100 text-amber-900">
                       {selectedEod.challenges || "None reported."}
                     </div>
                   </div>
                 </div>
               </div>
             </div>
           </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

