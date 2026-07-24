import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import {
  LayoutDashboard,
  CheckSquare,
  ListTodo,
  GraduationCap,
  FileText,
  Users,
  Building2,
  Bell,
  LogOut,
  Menu,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface MainLayoutProps {
  children: ReactNode;
}

const navItems = [
  { title: "Dashboard", href: (r: string) => `/${r}/dashboard`, icon: LayoutDashboard, roles: ["employee", "tl", "manager", "ceo"] },
  { title: "Analytics", href: (r: string) => `/${r}/analytics`, icon: BarChart3, roles: ["manager", "ceo"] },
  { title: "Daily EOD", href: (r: string) => `/${r}/eod`, icon: FileText, roles: ["employee", "tl", "manager", "ceo"] },
  { title: "Tasks", href: (r: string) => `/${r}/tasks`, icon: CheckSquare, roles: ["employee", "tl", "manager", "ceo"] },
  { title: "Daily Work", href: (r: string) => `/${r}/daily-work`, icon: ListTodo, roles: ["employee", "tl", "manager", "ceo"] },
  { title: "Training", href: (r: string) => `/${r}/training`, icon: GraduationCap, roles: ["employee", "tl", "manager", "ceo"] },
  { title: "Users", href: (r: string) => `/${r}/users`, icon: Users, roles: ["manager", "ceo"] },
  { title: "Teams", href: (r: string) => `/${r}/teams`, icon: Building2, roles: ["manager", "ceo"] },
  { title: "Notifications", href: (r: string) => `/${r}/notifications`, icon: Bell, roles: ["manager", "ceo"] },
];

const roleLabels: Record<string, string> = {
  employee: "Employee Portal",
  tl: "Team Leader Portal",
  manager: "Manager Portal",
  CEO: "CEO Portal",
};

const roleSubtitle: Record<string, string> = {
  employee: "Employee",
  tl: "Team Leader",
  manager: "Manager",
  CEO: "ceo",
};

export function MainLayout({ children }: MainLayoutProps) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  if (!user) return null;

  const role = user.role;
  const filtered = navItems.filter(item => item.roles.includes(role));

  const NavLinks = () => (
    <nav className="mt-2 px-3 space-y-0.5">
      {filtered.map(item => {
        const href = item.href(role);
        const isActive = location === href;
        return (
          <Link key={href} href={href} className="block">
            <div
              className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-all ${
                isActive
                  ? "bg-white/15 text-white"
                  : "text-white/65 hover:bg-white/10 hover:text-white/90"
              }`}
            >
              <item.icon
                className={`mr-3 h-4 w-4 flex-shrink-0 transition-colors ${
                  isActive ? "text-sky-300" : "text-white/45"
                }`}
              />
              {item.title}
              {isActive && (
                <span className="ml-auto w-1 h-4 rounded-full bg-sky-400 flex-shrink-0" />
              )}
            </div>
          </Link>
        );
      })}
    </nav>
  );

  const SidebarContent = () => (
    <div className="flex-1 flex flex-col min-h-0 h-full bg-sidebar text-sidebar-foreground">
      {/* Logo area */}
      <div className="flex items-center h-16 flex-shrink-0 px-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
            <img 
              src="https://media.licdn.com/dms/image/v2/C560BAQFq8JopmyGh6A/company-logo_200_200/company-logo_200_200/0/1630645196025/arraafi_infotech_pvt_ltd_logo?e=1785369600&v=beta&t=Hzh-9-cW0xnMPneaOpeiApTTuLeuRFmgo4w1TSKXnhs"
              alt="Arraafi Infotech"
              className="h-full w-full object-cover"
            />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-none tracking-tight">
              Arraafi Infotech
            </p>
            <p className="text-[10px] text-sky-300/80 font-medium uppercase tracking-widest mt-0.5">
              {roleLabels[role] || "Portal"}
            </p>
          </div>
        </div>
      </div>

      {/* Nav section label */}
      <div className="px-5 pt-5 pb-1">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-white/35">
          Navigation
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <NavLinks />
      </div>

      {/* User footer */}
      <div className="flex-shrink-0 border-t border-white/10 p-4">
        <div className="flex items-center w-full gap-3">
          <Avatar className="h-8 w-8 flex-shrink-0 bg-sky-400/20 text-sky-200">
            <AvatarFallback className="text-sm font-bold bg-transparent text-sky-200">
              {user.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-semibold text-white truncate">{user.name}</p>
            <p className="text-xs text-white/45 truncate">{roleSubtitle[role] || role}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            className="flex-shrink-0 text-white/40 hover:text-white hover:bg-white/10 h-8 w-8"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 shadow-xl">
        <SidebarContent />
      </div>

      {/* Mobile Header + Drawer */}
      <div className="flex flex-col flex-1 md:pl-60">
        <div className="sticky top-0 z-10 md:hidden bg-sidebar shadow-sm">
          <div className="flex items-center justify-between h-14 px-4">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-sky-400/20 flex items-center justify-center">
                <Building2 className="h-4 w-4 text-sky-300" />
              </div>
              <span className="text-sm font-bold text-white">
                Arraafi Infotech
              </span>
            </div>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white/70 hover:text-white hover:bg-white/10 -mr-2">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-60 border-0">
                <SidebarContent />
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto">
          <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

