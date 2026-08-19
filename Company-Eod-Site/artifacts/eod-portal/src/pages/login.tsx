import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Building2, ShieldCheck, ClipboardList, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export default function Login() {
  const [_, setLocation] = useLocation();
  const { login: authenticate } = useAuth();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const loginMutation = useLogin();

  function onSubmit(values: z.infer<typeof loginSchema>) {
    loginMutation.mutate(
      { data: values },
      {
        onSuccess: (data) => {
          authenticate(data.token, data.user);
          toast({ title: "Welcome back!", description: `Signed in as ${data.user.name}` });
        },
        onError: () => {
          toast({
            title: "Sign in failed",
            description: "Please check your email and password.",
            variant: "destructive",
          });
        },
      }
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-[45%] bg-sidebar flex-col justify-between p-10">
        <div className="flex flex-col items-center gap-6 mb-8">
          {/* Company Logo */}
          <div className="flex items-center justify-center">
            <img 
              src="/arraafi-logo.png"
              alt="Arraafi Infotech"
              className="h-24 w-24 object-contain rounded-lg bg-white/10 p-2"
            />
          </div>
          
          {/* Company Name */}
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-sky-400/20 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-sky-300" />
            </div>
            <span className="text-white font-bold text-lg tracking-tight">Arraafi Infotech</span>
          </div>
        </div>

        <div>
          <h1 className="text-3xl font-bold text-white leading-snug mb-4">
            EOD Management<br />& Operations Portal
          </h1>
          <p className="text-white/55 text-sm leading-relaxed mb-10">
            A centralised platform for daily end-of-day reports, task tracking, attendance, and team management.
          </p>

          <div className="space-y-4">
            {[
              { icon: ClipboardList, label: "Daily EOD Submissions", desc: "Submit and track end-of-day reports" },
              { icon: BarChart3, label: "Performance Tracking", desc: "Monitor tasks, work logs, and training" },
              { icon: ShieldCheck, label: "Role-Based Access", desc: "Employee, TL, Manager and CEO Portals" },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon className="h-4 w-4 text-sky-300" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{label}</p>
                  <p className="text-xs text-white/45">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-white/25">© 2025 Arraafi Infotech. All rights reserved.</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="h-9 w-9 rounded-lg overflow-hidden bg-white flex items-center justify-center">
              <img src="/arraafi-logo.png" alt="Arraafi Infotech" className="h-full w-full object-contain" />
            </div>
            <span className="text-foreground font-bold text-lg">Arraafi Infotech</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">Sign in</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Enter your corporate credentials to continue
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <Label htmlFor="email" className="text-sm font-medium text-foreground">
                      Email address
                    </Label>
                    <FormControl>
                      <Input
                        id="email"
                        placeholder="name@arraafiinfotech.com"
                        type="email"
                        autoComplete="email"
                        className="h-10"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <Label htmlFor="password" className="text-sm font-medium text-foreground">
                      Password
                    </Label>
                    <FormControl>
                      <Input
                        id="password"
                        type="password"
                        autoComplete="current-password"
                        className="h-10"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full h-10 font-semibold text-sm"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
