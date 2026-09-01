import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { MainLayout } from "@/components/layout/MainLayout";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";

// Employee
import EmployeeDashboard from "@/pages/employee/dashboard";
import EmployeeEod from "@/pages/employee/eod";
import EmployeeTasks from "@/pages/employee/tasks";
import EmployeeDailyWork from "@/pages/employee/daily-work";
import EmployeeTraining from "@/pages/employee/training";

// TL
import TLDashboard from "@/pages/tl/dashboard";
import TLEod from "@/pages/tl/eod";
import TLTasks from "@/pages/tl/tasks";
import TLDailyWork from "@/pages/tl/daily-work";
import TLTraining from "@/pages/tl/training";
import TLEodApprovals from "@/pages/tl/eod-approvals";

// Manager
import ManagerDashboard from "@/pages/manager/dashboard";
import ManagerEod from "@/pages/manager/eod";
import ManagerTlEodReports from "@/pages/manager/tl-eod-reports";
import ManagerTasks from "@/pages/manager/tasks";
import ManagerDailyWork from "@/pages/manager/daily-work";
import ManagerTraining from "@/pages/manager/training";
import ManagerUsers from "@/pages/manager/users";
import ManagerTeams from "@/pages/manager/teams";
import ManagerNotifications from "@/pages/manager/notifications";
import ManagerAnalytics from "@/pages/manager/analytics";

// CEO — dedicated separate portal
import CEODashboard from "@/pages/ceo/dashboard";
import CEOEod from "@/pages/ceo/eod";
import CEOTlEodReports from "@/pages/manager/tl-eod-reports";
import CEOTasks from "@/pages/ceo/tasks";
import CEODailyWork from "@/pages/ceo/daily-work";
import CEOTraining from "@/pages/ceo/training";
import CEOUsers from "@/pages/ceo/users";
import CEOTeams from "@/pages/ceo/teams";
import CEOAnalytics from "@/pages/ceo/analytics";
import CEONotifications from "@/pages/ceo/notifications";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({
  component: Component,
  allowedRoles,
  path,
}: {
  component: any;
  allowedRoles?: string[];
  path: string;
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Redirect to={`/${user.role}/dashboard`} />;
  }

  return (
    <Route path={path}>
      <MainLayout>
        <Component />
      </MainLayout>
    </Route>
  );
}

function RootRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  return <Redirect to={`/${user.role}/dashboard`} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={RootRoute} />

      {/* Employee Routes */}
      <ProtectedRoute path="/employee/dashboard" component={EmployeeDashboard} allowedRoles={["employee"]} />
      <ProtectedRoute path="/employee/eod" component={EmployeeEod} allowedRoles={["employee"]} />
      <ProtectedRoute path="/employee/tasks" component={EmployeeTasks} allowedRoles={["employee"]} />
      <ProtectedRoute path="/employee/daily-work" component={EmployeeDailyWork} allowedRoles={["employee"]} />
      <ProtectedRoute path="/employee/training" component={EmployeeTraining} allowedRoles={["employee"]} />

      {/* TL Routes */}
      <ProtectedRoute path="/tl/dashboard" component={TLDashboard} allowedRoles={["tl"]} />
      <ProtectedRoute path="/tl/eod" component={TLEod} allowedRoles={["tl"]} />
      <ProtectedRoute path="/tl/eod-approvals" component={TLEodApprovals} allowedRoles={["tl"]} />
      <ProtectedRoute path="/tl/tasks" component={TLTasks} allowedRoles={["tl"]} />
      <ProtectedRoute path="/tl/daily-work" component={TLDailyWork} allowedRoles={["tl"]} />
      <ProtectedRoute path="/tl/training" component={TLTraining} allowedRoles={["tl"]} />

      {/* Manager Routes */}
      <ProtectedRoute path="/manager/dashboard" component={ManagerDashboard} allowedRoles={["manager"]} />
      <ProtectedRoute path="/manager/analytics" component={ManagerAnalytics} allowedRoles={["manager"]} />
      <ProtectedRoute path="/manager/eod" component={ManagerEod} allowedRoles={["manager"]} />
      <ProtectedRoute path="/manager/tl-eod-reports" component={ManagerTlEodReports} allowedRoles={["manager"]} />
      <ProtectedRoute path="/manager/tasks" component={ManagerTasks} allowedRoles={["manager"]} />
      <ProtectedRoute path="/manager/daily-work" component={ManagerDailyWork} allowedRoles={["manager"]} />
      <ProtectedRoute path="/manager/training" component={ManagerTraining} allowedRoles={["manager"]} />
      <ProtectedRoute path="/manager/users" component={ManagerUsers} allowedRoles={["manager"]} />
      <ProtectedRoute path="/manager/teams" component={ManagerTeams} allowedRoles={["manager"]} />
      <ProtectedRoute path="/manager/notifications" component={ManagerNotifications} allowedRoles={["manager"]} />

      {/* CEO Routes — dedicated separate portal */}
      <ProtectedRoute path="/ceo/dashboard" component={CEODashboard} allowedRoles={["ceo"]} />
      <ProtectedRoute path="/ceo/analytics" component={CEOAnalytics} allowedRoles={["ceo"]} />
      <ProtectedRoute path="/ceo/eod" component={CEOEod} allowedRoles={["ceo"]} />
      <ProtectedRoute path="/ceo/tl-eod-reports" component={CEOTlEodReports} allowedRoles={["ceo"]} />
      <ProtectedRoute path="/ceo/tasks" component={CEOTasks} allowedRoles={["ceo"]} />
      <ProtectedRoute path="/ceo/daily-work" component={CEODailyWork} allowedRoles={["ceo"]} />
      <ProtectedRoute path="/ceo/training" component={CEOTraining} allowedRoles={["ceo"]} />
      <ProtectedRoute path="/ceo/users" component={CEOUsers} allowedRoles={["ceo"]} />
      <ProtectedRoute path="/ceo/teams" component={CEOTeams} allowedRoles={["ceo"]} />
      <ProtectedRoute path="/ceo/notifications" component={CEONotifications} allowedRoles={["ceo"]} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
