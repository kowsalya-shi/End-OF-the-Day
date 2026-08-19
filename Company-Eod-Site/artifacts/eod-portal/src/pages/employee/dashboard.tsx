import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useListEod, getListEodQueryKey, useListTasks, getListTasksQueryKey, useListDailyWork, getListDailyWorkQueryKey } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Link } from "wouter";
import { CheckSquare, FileText, ListTodo } from "lucide-react";
import { StatusBadge, AttendanceBadge } from "@/components/ui/status-badge";

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: eods, isLoading: eodLoading } = useListEod(
    { date: today, userId: user?.id },
    { query: { queryKey: getListEodQueryKey({ date: today, userId: user?.id }) } }
  );

  const todayEod = eods?.[0];

  const { data: tasks, isLoading: tasksLoading } = useListTasks(
    { userId: user?.id },
    { query: { queryKey: getListTasksQueryKey({ userId: user?.id }) } }
  );

  const { data: dailyWork, isLoading: dwLoading } = useListDailyWork(
    { userId: user?.id, date: today },
    { query: { queryKey: getListDailyWorkQueryKey({ userId: user?.id, date: today }) } }
  );

  const completedTasks = tasks?.filter(t => t.status === "completed")?.length || 0;
  const wipTasks = tasks?.filter(t => t.status === "wip")?.length || 0;
  const pendingTasks = tasks?.filter(t => t.status !== "completed" && t.status !== "cancelled")?.length || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{user?.name}</h1>
          <p className="text-gray-500 mt-1">Here is what's happening with your work today.</p>
        </div>
      </div>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">EOD Status</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {eodLoading ? (
              <div className="h-7 bg-gray-200 rounded animate-pulse w-24"></div>
            ) : todayEod ? (
              <div className="flex flex-col gap-1">
                <div className="text-2xl font-bold text-green-600">Submitted</div>
                <AttendanceBadge status={todayEod.attendanceStatus} />
              </div>
            ) : (
              <div className="text-2xl font-bold text-amber-600">Pending</div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {tasksLoading ? (
              <div className="h-7 bg-gray-200 rounded animate-pulse w-16"></div>
            ) : (
              <div className="text-2xl font-bold">{pendingTasks}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {wipTasks} in progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Tasks</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {tasksLoading ? (
              <div className="h-7 bg-gray-200 rounded animate-pulse w-16"></div>
            ) : (
              <div className="text-2xl font-bold">{completedTasks}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Total completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Work Log</CardTitle>
            <ListTodo className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {dwLoading ? (
              <div className="h-7 bg-gray-200 rounded animate-pulse w-16"></div>
            ) : (
              <div className="text-2xl font-bold">{dailyWork?.length || 0} items</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Logged today
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            {tasksLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-12 bg-gray-100 rounded animate-pulse"></div>)}
              </div>
            ) : tasks && tasks.length > 0 ? (
              <div className="space-y-4">
                {tasks.slice(0, 5).map(task => (
                  <div key={task.id} className="flex items-start justify-between border-b pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium text-sm text-gray-900">{task.taskName}</p>
                      <p className="text-xs text-gray-500 mt-1">{task.taskCode || "No code"}</p>
                    </div>
                    <StatusBadge status={task.status} />
                  </div>
                ))}
                <div className="pt-2">
                  <Link href="/employee/tasks" className="text-sm text-primary font-medium hover:underline">View all tasks</Link>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500 py-4 text-center">No tasks assigned yet.</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Today's Daily Work</CardTitle>
          </CardHeader>
          <CardContent>
            {dwLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-12 bg-gray-100 rounded animate-pulse"></div>)}
              </div>
            ) : dailyWork && dailyWork.length > 0 ? (
              <div className="space-y-4">
                {dailyWork.slice(0, 5).map(work => (
                  <div key={work.id} className="flex items-start justify-between border-b pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium text-sm text-gray-900">{work.action}</p>
                      <p className="text-xs text-gray-500 mt-1">Done by: {work.who || "Self"}</p>
                    </div>
                    <StatusBadge status={work.status} />
                  </div>
                ))}
                <div className="pt-2">
                  <Link href="/employee/daily-work" className="text-sm text-primary font-medium hover:underline">Manage daily work</Link>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500 py-4 text-center">No daily work logged for today.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

