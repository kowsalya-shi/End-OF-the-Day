import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Download, Filter, TrendingUp, Users, CheckCircle, Clock, AlertTriangle, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { exportDetailedMISReport } from "@/lib/export-excel";

export default function MISDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [misData, setMisData] = useState<any>(null);
  
  // Filters
  const [dateFilter, setDateFilter] = useState("today");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [tlFilter, setTlFilter] = useState("all");
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // Detail views
  const [showTaskDetail, setShowTaskDetail] = useState<string | null>(null);
  const [showEodDetail, setShowEodDetail] = useState<string | null>(null);

  useEffect(() => {
    fetchMISData();
  }, [dateFilter, customStartDate, customEndDate, tlFilter, employeeFilter, statusFilter]);

  const fetchMISData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("date", dateFilter);
      if (dateFilter === "custom" && customStartDate && customEndDate) {
        params.append("startDate", customStartDate);
        params.append("endDate", customEndDate);
      }
      if (tlFilter !== "all") params.append("tlId", tlFilter);
      if (employeeFilter !== "all") params.append("userId", employeeFilter);
      if (statusFilter !== "all") params.append("status", statusFilter);

      const response = await fetch(`http://localhost:8080/api/mis/dashboard?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}` },
      });

      if (response.ok) {
        const data = await response.json();
        setMisData(data);
      } else {
        toast({ title: "Error loading MIS data", variant: "destructive" });
      }
    } catch (error) {
      console.error("MIS fetch error:", error);
      toast({ title: "Failed to load MIS dashboard", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (misData) {
      exportDetailedMISReport(misData);
      toast({ title: "Export successful", description: "MIS report downloaded as CSV" });
    }
  };

  if (loading || !misData) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">MIS Dashboard</h1>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-32" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const { summary, employeePerformance, tlPerformance, ageing, overdue, filters } = misData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">MIS Dashboard</h1>
          <p className="text-gray-500 mt-1">Management Information System - {misData.dateRange.label}</p>
        </div>
        <Button onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" /> Export Excel
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center">
            <Filter className="mr-2 h-4 w-4" /> Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Date</label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="custom">Custom Date</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {dateFilter === "custom" && (
              <>
                <div>
                  <label className="text-sm font-medium mb-2 block">Start Date</label>
                  <Input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">End Date</label>
                  <Input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} />
                </div>
              </>
            )}

            {misData.role !== "employee" && (
              <>
                <div>
                  <label className="text-sm font-medium mb-2 block">Team Leader</label>
                  <Select value={tlFilter} onValueChange={setTlFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All TLs</SelectItem>
                      {filters.availableTLs.map((tl: any) => (
                        <SelectItem key={tl.id} value={String(tl.tlId)}>{tl.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Employee</label>
                  <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Employees</SelectItem>
                      {filters.availableEmployees.map((emp: any) => (
                        <SelectItem key={emp.id} value={String(emp.id)}>{emp.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="yts">YTS</SelectItem>
                  <SelectItem value="wip">WIP</SelectItem>
                  <SelectItem value="holding">Holding</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Task Summary Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
        <MetricCard
          title="Total Tasks"
          value={summary.tasks.total}
          icon={<FileText className="h-4 w-4" />}
          color="blue"
          onClick={() => setShowTaskDetail("total")}
        />
        <MetricCard
          title="YTS"
          value={summary.tasks.yts}
          icon={<Clock className="h-4 w-4" />}
          color="yellow"
          onClick={() => setShowTaskDetail("yts")}
        />
        <MetricCard
          title="WIP"
          value={summary.tasks.wip}
          icon={<TrendingUp className="h-4 w-4" />}
          color="blue"
          onClick={() => setShowTaskDetail("wip")}
        />
        <MetricCard
          title="Holding"
          value={summary.tasks.holding}
          icon={<AlertTriangle className="h-4 w-4" />}
          color="orange"
          onClick={() => setShowTaskDetail("holding")}
        />
        <MetricCard
          title="Completed"
          value={summary.tasks.completed}
          icon={<CheckCircle className="h-4 w-4" />}
          color="green"
          onClick={() => setShowTaskDetail("completed")}
        />
        <MetricCard
          title="Overdue"
          value={summary.tasks.overdue}
          icon={<AlertTriangle className="h-4 w-4" />}
          color="red"
          onClick={() => setShowTaskDetail("overdue")}
        />
        <MetricCard
          title="Ageing"
          value={summary.tasks.ageing}
          icon={<Clock className="h-4 w-4" />}
          color="amber"
          onClick={() => setShowTaskDetail("ageing")}
        />
      </div>

      {/* EOD Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">EOD Report - {misData.dateRange.label}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{summary.eod.submitted}</div>
              <div className="text-sm text-gray-500 mt-1">Submitted</div>
            </div>
            <div className="text-center cursor-pointer" onClick={() => setShowEodDetail("missing")}>
              <div className="text-3xl font-bold text-red-600">{summary.eod.missing}</div>
              <div className="text-sm text-gray-500 mt-1">Missing</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-amber-600">{summary.eod.late}</div>
              <div className="text-sm text-gray-500 mt-1">Late</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{summary.eod.submissionPercentage}%</div>
              <div className="text-sm text-gray-500 mt-1">Submission Rate</div>
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all" 
                style={{ width: `${summary.eod.submissionPercentage}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employee Performance Table */}
      {misData.role !== "employee" && employeePerformance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              <Users className="mr-2 h-4 w-4" /> Employee Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="px-3 py-2">Employee</th>
                    <th className="px-3 py-2 text-center">Tasks</th>
                    <th className="px-3 py-2 text-center">Completed</th>
                    <th className="px-3 py-2 text-center">WIP</th>
                    <th className="px-3 py-2 text-center">YTS</th>
                    <th className="px-3 py-2 text-center">Holding</th>
                    <th className="px-3 py-2 text-center">Ageing</th>
                    <th className="px-3 py-2 text-center">EOD %</th>
                  </tr>
                </thead>
                <tbody>
                  {employeePerformance.slice(0, 10).map((emp: any) => (
                    <tr key={emp.userId} className="border-b hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium">{emp.employeeName}</td>
                      <td className="px-3 py-2 text-center">{emp.tasks.total}</td>
                      <td className="px-3 py-2 text-center text-green-600">{emp.tasks.completed}</td>
                      <td className="px-3 py-2 text-center text-blue-600">{emp.tasks.wip}</td>
                      <td className="px-3 py-2 text-center text-yellow-600">{emp.tasks.yts}</td>
                      <td className="px-3 py-2 text-center text-orange-600">{emp.tasks.holding}</td>
                      <td className="px-3 py-2 text-center text-amber-600 font-medium">{emp.tasks.ageing}</td>
                      <td className="px-3 py-2 text-center font-medium">{emp.eodSubmissionRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TL Performance */}
      {(misData.role === "manager" || misData.role === "it_manager" || misData.role === "ceo") && tlPerformance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">TL Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tlPerformance.map((tl: any) => (
                <div key={tl.teamId} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{tl.tlName}</h3>
                      <p className="text-sm text-gray-500">{tl.teamName} • {tl.memberCount} members</p>
                    </div>
                    {tl.missingEodToday > 0 && (
                      <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-medium">
                        {tl.missingEodToday} Missing EOD
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-3 text-center">
                    <div>
                      <div className="text-xl font-bold">{tl.tasks.total}</div>
                      <div className="text-xs text-gray-500">Total</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-green-600">{tl.tasks.completed}</div>
                      <div className="text-xs text-gray-500">Done</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-blue-600">{tl.tasks.wip}</div>
                      <div className="text-xs text-gray-500">WIP</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-yellow-600">{tl.tasks.yts}</div>
                      <div className="text-xs text-gray-500">YTS</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-orange-600">{tl.tasks.holding}</div>
                      <div className="text-xs text-gray-500">Holding</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-amber-600">{tl.tasks.ageing}</div>
                      <div className="text-xs text-gray-500">Ageing</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ageing Section */}
      {ageing.summary.total > 0 && (
        <Card className="border-amber-200">
          <CardHeader>
            <CardTitle className="text-base flex items-center text-amber-700">
              <Clock className="mr-2 h-4 w-4" /> Ageing Tasks (5+ days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-6 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{ageing.summary.yts}</div>
                <div className="text-sm text-gray-500">YTS</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{ageing.summary.wip}</div>
                <div className="text-sm text-gray-500">WIP</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{ageing.summary.holding}</div>
                <div className="text-sm text-gray-500">Holding</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-700">{ageing.summary.total}</div>
                <div className="text-sm text-gray-500">Total</div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="px-3 py-2">Task</th>
                    <th className="px-3 py-2">Code</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Age</th>
                    <th className="px-3 py-2">Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {ageing.tasks.slice(0, 10).map((task: any) => (
                    <tr key={task.taskId} className="border-b">
                      <td className="px-3 py-2">{task.taskName}</td>
                      <td className="px-3 py-2 text-gray-500">{task.taskCode || "-"}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-1 rounded text-xs uppercase ${
                          task.status === "yts" ? "bg-yellow-100 text-yellow-800" :
                          task.status === "wip" ? "bg-blue-100 text-blue-800" :
                          "bg-orange-100 text-orange-800"
                        }`}>
                          {task.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-bold text-amber-700">{task.ageDays} days</td>
                      <td className="px-3 py-2 capitalize">{task.priority}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overdue Section */}
      {overdue.total > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-base flex items-center text-red-700">
              <AlertTriangle className="mr-2 h-4 w-4" /> Overdue Tasks ({overdue.total})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="px-3 py-2">Task</th>
                    <th className="px-3 py-2">Code</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Due Date</th>
                    <th className="px-3 py-2">Overdue By</th>
                    <th className="px-3 py-2">Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {overdue.tasks.slice(0, 10).map((task: any) => (
                    <tr key={task.taskId} className="border-b">
                      <td className="px-3 py-2 font-medium">{task.taskName}</td>
                      <td className="px-3 py-2 text-gray-500">{task.taskCode || "-"}</td>
                      <td className="px-3 py-2 uppercase text-xs">{task.status}</td>
                      <td className="px-3 py-2">{task.plannedEndDate}</td>
                      <td className="px-3 py-2 font-bold text-red-600">{task.overdueDays} days</td>
                      <td className="px-3 py-2 capitalize">{task.priority}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Metric Card Component
function MetricCard({ title, value, icon, color, onClick }: any) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600 border-blue-200",
    green: "bg-green-50 text-green-600 border-green-200",
    yellow: "bg-yellow-50 text-yellow-600 border-yellow-200",
    red: "bg-red-50 text-red-600 border-red-200",
    orange: "bg-orange-50 text-orange-600 border-orange-200",
    amber: "bg-amber-50 text-amber-600 border-amber-200",
  };

  return (
    <Card 
      className={`border-2 cursor-pointer transition-all hover:shadow-lg ${colorClasses[color]}`}
      onClick={onClick}
    >
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium opacity-75">{title}</p>
            <p className="text-3xl font-bold mt-2">{value}</p>
          </div>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}
