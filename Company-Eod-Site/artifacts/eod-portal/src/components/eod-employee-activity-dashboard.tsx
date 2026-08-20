import { useState } from "react";
import { format } from "date-fns";
import {
  getListDailyWorkQueryKey,
  getListEodQueryKey,
  getListTasksQueryKey,
  getListUsersQueryKey,
  useListDailyWork,
  useListEod,
  useListTasks,
  useListUsers,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AttendanceBadge, StatusBadge } from "@/components/ui/status-badge";

export function EodEmployeeActivityDashboard() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const { data: users, isLoading: usersLoading } = useListUsers(
    {},
    { query: { queryKey: getListUsersQueryKey() } },
  );
  const { data: eods, isLoading: eodsLoading } = useListEod(
    { date: selectedDate },
    { query: { queryKey: getListEodQueryKey({ date: selectedDate }) } },
  );
  const { data: dailyWork, isLoading: workLoading } = useListDailyWork(
    { date: selectedDate },
    { query: { queryKey: getListDailyWorkQueryKey({ date: selectedDate }) } },
  );
  const { data: tasks, isLoading: tasksLoading } = useListTasks(
    {},
    { query: { queryKey: getListTasksQueryKey() } },
  );

  const employees = users?.filter((user) => user.role === "employee") ?? [];
  const loading = usersLoading || eodsLoading || workLoading || tasksLoading;

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-base">EOD Employee Activity Dashboard</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">See what every employee worked on, completed, and still has pending.</p>
        </div>
        <div className="w-full sm:w-44">
          <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="activity-date">Activity date</label>
          <Input id="activity-date" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-48 animate-pulse rounded bg-gray-100" />
        ) : (
          <div className="max-h-[32rem] overflow-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="sticky top-0 bg-gray-50">
                <tr className="border-b">
                  <th className="px-3 py-3 text-left font-semibold text-gray-600">Employee</th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-600">Department</th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-600">Worked On</th>
                  <th className="px-3 py-3 text-center font-semibold text-gray-600">Completed</th>
                  <th className="px-3 py-3 text-center font-semibold text-gray-600">Pending</th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-600">EOD Status</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => {
                  const employeeWork = dailyWork?.filter((work) => work.userId === employee.id) ?? [];
                  const employeeEod = eods?.find((eod) => eod.userId === employee.id);
                  const employeeTasks = tasks?.filter((task) => task.userId === employee.id) ?? [];
                  const completedWork = employeeWork.filter((work) => work.status === "completed").length;
                  const completedCount = completedWork + (employeeEod?.tasksCompleted ?? 0);
                  const pendingCount = employeeTasks.filter((task) => task.status !== "completed" && task.status !== "cancelled").length;
                  const workSummary = employeeWork.map((work) => work.action).join(", ") || employeeEod?.internalWork || "No work logged";

                  return (
                    <tr key={employee.id} className="border-b align-top hover:bg-gray-50">
                      <td className="px-3 py-3 font-medium">{employee.name}</td>
                      <td className="px-3 py-3 text-gray-600">{employee.department || "-"}</td>
                      <td className="max-w-md px-3 py-3 text-gray-700">{workSummary}</td>
                      <td className="px-3 py-3 text-center font-semibold text-green-700">{completedCount}</td>
                      <td className="px-3 py-3 text-center">
                        {pendingCount > 0 ? <StatusBadge status={`${pendingCount} pending`} /> : <span className="font-medium text-green-700">0</span>}
                      </td>
                      <td className="px-3 py-3">
                        {employeeEod ? <AttendanceBadge status={employeeEod.attendanceStatus} /> : <StatusBadge status="pending" />}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {employees.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No employees found.</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
