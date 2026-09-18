import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/lib/auth";
import { Download, Filter, Trash2, AlertCircle, FileText, CheckSquare, ListTodo } from "lucide-react";
import { exportToCsv } from "@/lib/export-csv";
import { useToast } from "@/hooks/use-toast";

const API = "http://localhost:8080/api";

interface AuditLog {
  id: number;
  userId: number;
  userName: string;
  action: string;
  module: string;
  recordId: number;
  recordTitle: string;
  recordDetails: any;
  deletedAt: string;
  ipAddress: string | null;
}

interface AuditStats {
  totalDeletions: number;
  taskDeletions: number;
  eodDeletions: number;
  dailyWorkDeletions: number;
}

export default function AuditPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [searchUser, setSearchUser] = useState<string>("");

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (moduleFilter !== "all") params.append("module", moduleFilter);
      if (actionFilter !== "all") params.append("action", actionFilter);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      params.append("limit", "200");

      const response = await fetch(`${API}/audit?${params.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}` },
      });

      if (!response.ok) throw new Error("Failed to fetch audit logs");
      const data = await response.json();
      setLogs(data);
    } catch (error) {
      toast({ title: "Error loading audit logs", variant: "destructive" });
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const response = await fetch(`${API}/audit/stats?${params.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}` },
      });

      if (!response.ok) throw new Error("Failed to fetch stats");
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error("Error loading stats:", error);
      setStats(null);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
    fetchStats();
  }, [moduleFilter, actionFilter, startDate, endDate]);

  const filteredLogs = logs.filter((log) => {
    if (searchUser && !log.userName.toLowerCase().includes(searchUser.toLowerCase())) {
      return false;
    }
    return true;
  });

  const clearFilters = () => {
    setModuleFilter("all");
    setActionFilter("all");
    setStartDate("");
    setEndDate("");
    setSearchUser("");
  };

  const handleExport = () => {
    exportToCsv(
      `audit_log_${format(new Date(), "yyyy-MM-dd")}.csv`,
      filteredLogs.map((log) => ({
        Date: format(new Date(log.deletedAt), "yyyy-MM-dd HH:mm:ss"),
        User: log.userName,
        Action: log.action,
        Module: log.module,
        "Record ID": log.recordId,
        Title: log.recordTitle,
        "IP Address": log.ipAddress || "-",
      }))
    );
    toast({ title: "Audit log exported successfully" });
  };

  const getModuleIcon = (module: string) => {
    switch (module) {
      case "TASK":
        return <CheckSquare className="h-4 w-4 text-blue-600" />;
      case "EOD":
        return <FileText className="h-4 w-4 text-green-600" />;
      case "DAILY_WORK":
        return <ListTodo className="h-4 w-4 text-purple-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getModuleLabel = (module: string) => {
    switch (module) {
      case "TASK":
        return "Task";
      case "EOD":
        return "EOD";
      case "DAILY_WORK":
        return "Daily Work";
      default:
        return module;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
          <p className="text-gray-500 mt-1">Track all deletion activities across the system</p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={filteredLogs.length === 0}>
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Deletions</CardTitle>
              <Trash2 className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.totalDeletions}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Task Deletions</CardTitle>
              <CheckSquare className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.taskDeletions}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">EOD Deletions</CardTitle>
              <FileText className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.eodDeletions}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Daily Work Deletions</CardTitle>
              <ListTodo className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats.dailyWorkDeletions}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex items-center text-sm font-medium text-gray-500">
              <Filter className="w-4 h-4 mr-2" /> Filters
            </div>

            <div className="w-48">
              <label className="text-xs text-gray-600 mb-1 block">Module</label>
              <Select value={moduleFilter} onValueChange={setModuleFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modules</SelectItem>
                  <SelectItem value="TASK">Tasks</SelectItem>
                  <SelectItem value="EOD">EOD</SelectItem>
                  <SelectItem value="DAILY_WORK">Daily Work</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-48">
              <label className="text-xs text-gray-600 mb-1 block">Action</label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="DELETE">Delete</SelectItem>
                  <SelectItem value="CREATE">Create</SelectItem>
                  <SelectItem value="UPDATE">Update</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-48">
              <label className="text-xs text-gray-600 mb-1 block">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="w-48">
              <label className="text-xs text-gray-600 mb-1 block">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="w-48">
              <label className="text-xs text-gray-600 mb-1 block">Search User</label>
              <Input
                placeholder="User name..."
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
              />
            </div>

            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Audit Log Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-[180px]">Date & Time</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead className="w-[100px]">Action</TableHead>
                  <TableHead className="w-[120px]">Module</TableHead>
                  <TableHead>Record Title</TableHead>
                  <TableHead className="w-[100px]">Record ID</TableHead>
                  <TableHead className="w-[120px]">IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-gray-500">
                      Loading audit logs...
                    </TableCell>
                  </TableRow>
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-gray-500">
                      No audit logs found matching your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-gray-50">
                      <TableCell className="font-mono text-sm">
                        {format(new Date(log.deletedAt), "MMM dd, yyyy HH:mm")}
                      </TableCell>
                      <TableCell className="font-medium">{log.userName}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                            log.action === "DELETE"
                              ? "bg-red-100 text-red-700"
                              : log.action === "CREATE"
                              ? "bg-green-100 text-green-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {log.action === "DELETE" && <Trash2 className="h-3 w-3" />}
                          {log.action}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getModuleIcon(log.module)}
                          <span className="text-sm">{getModuleLabel(log.module)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-md truncate" title={log.recordTitle}>
                        {log.recordTitle}
                      </TableCell>
                      <TableCell className="text-gray-500 font-mono text-xs">
                        #{log.recordId}
                      </TableCell>
                      <TableCell className="text-gray-500 text-xs font-mono">
                        {log.ipAddress || "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Show result count */}
      {!loading && filteredLogs.length > 0 && (
        <div className="text-sm text-gray-500 text-center">
          Showing {filteredLogs.length} {filteredLogs.length === 1 ? "record" : "records"}
          {logs.length >= 200 && " (limited to 200 most recent)"}
        </div>
      )}
    </div>
  );
}
