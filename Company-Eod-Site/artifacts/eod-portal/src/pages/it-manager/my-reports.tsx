import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EmployeeEod from "@/pages/employee/eod";
import EmployeeTasks from "@/pages/employee/tasks";
import EmployeeDailyWork from "@/pages/employee/daily-work";

export default function ITManagerMyReports() {
  return <div className="space-y-6">
    <div><h1 className="text-2xl font-bold text-gray-900">My Reports</h1><p className="mt-1 text-gray-500">Submit and manage your own EOD, tasks, and daily work.</p></div>
    <Tabs defaultValue="eod" className="space-y-5">
      <TabsList><TabsTrigger value="eod">My EOD</TabsTrigger><TabsTrigger value="tasks">My Tasks</TabsTrigger><TabsTrigger value="daily-work">My Daily Work</TabsTrigger></TabsList>
      <TabsContent value="eod"><EmployeeEod /></TabsContent>
      <TabsContent value="tasks"><EmployeeTasks /></TabsContent>
      <TabsContent value="daily-work"><EmployeeDailyWork /></TabsContent>
    </Tabs>
  </div>;
}
