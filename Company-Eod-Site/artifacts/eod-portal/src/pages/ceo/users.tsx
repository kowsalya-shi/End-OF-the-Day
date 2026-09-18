import { useState } from "react";
import {
  useListUsers, getListUsersQueryKey,
  useListTeams, getListTeamsQueryKey,
  useCreateUser, useUpdateUser, useDeleteUser,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { exportToCsv } from "@/lib/export-csv";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Download, Plus, Edit2, Trash2, Filter, KeyRound } from "lucide-react";

const userSchema = z.object({
  name: z.string().min(1, "Name required"),
  email: z.string().email("Valid email required"),
  role: z.string().min(1, "Role required"),
  password: z.string().optional(),
  teamId: z.coerce.number().optional(),
  employeeId: z.string().optional(),
  department: z.string().optional(),
  status: z.enum(["active", "inactive"]).default("active"),
});

type UserFormData = z.infer<typeof userSchema>;

export default function HRUsers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [roleFilter, setRoleFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState("");

  const { data: users, isLoading } = useListUsers(
    { role: roleFilter !== "all" ? roleFilter : undefined, teamId: teamFilter !== "all" ? parseInt(teamFilter) : undefined },
    { query: { queryKey: getListUsersQueryKey({ role: roleFilter !== "all" ? roleFilter : undefined, teamId: teamFilter !== "all" ? parseInt(teamFilter) : undefined }) } },
  );
  const { data: teams } = useListTeams({ query: { queryKey: getListTeamsQueryKey() } });

  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const deleteMutation = useDeleteUser();

  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: { name: "", email: "", role: "employee", password: "", teamId: undefined, employeeId: "", department: "", status: "active" },
  });

  const handleExport = () => {
    if (!users) return;
    exportToCsv("hr_users_export.csv", users.map(u => ({
      ID: u.id, Name: u.name, Email: u.email, Role: u.role,
      Team: u.teamName || "", EmployeeID: u.employeeId || "", Department: u.department || "",
    })));
  };

  const onSubmit = (values: UserFormData) => {
    if (selectedUser) {
      const { password, ...rest } = values;
      updateMutation.mutate(
        { id: selectedUser.id, data: rest },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
            queryClient.invalidateQueries({ queryKey: getListTeamsQueryKey() });
            setIsEditOpen(false);
            toast({ title: "User updated" });
          },
        },
      );
    } else {
      if (!values.password) { toast({ title: "Password required", variant: "destructive" }); return; }
      createMutation.mutate(
        { data: values as any },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
            queryClient.invalidateQueries({ queryKey: getListTeamsQueryKey() });
            setIsCreateOpen(false);
            form.reset();
            toast({ title: "User created" });
          },
        },
      );
    }
  };

  const openEdit = (user: any) => {
    setSelectedUser(user);
    form.reset({ name: user.name, email: user.email, role: user.role, teamId: user.teamId || undefined, employeeId: user.employeeId || "", department: user.department || "", status: user.status || "active" });
    setIsEditOpen(true);
  };

  const handleDelete = () => {
    if (!selectedUser) return;
    deleteMutation.mutate(
      { id: selectedUser.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListTeamsQueryKey() });
          setIsDeleteOpen(false);
          toast({ title: "User deleted" });
        },
      },
    );
  };

  const resetPassword = async () => {
    if (!selectedUser || temporaryPassword.length < 8) return;
    const response = await fetch(`http://localhost:8080/api/users/${selectedUser.id}/reset-password`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}` }, body: JSON.stringify({ password: temporaryPassword }) });
    if (!response.ok) { toast({ title: "Unable to reset password", variant: "destructive" }); return; }
    setIsResetOpen(false); setTemporaryPassword(""); toast({ title: "Temporary password saved", description: `Give the new password securely to ${selectedUser.name}.` });
  };

  const UserFormFields = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
      <FormField control={form.control} name="name" render={({ field }) => (
        <FormItem><FormLabel>Full Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
      )} />
      <FormField control={form.control} name="email" render={({ field }) => (
        <FormItem><FormLabel>Email *</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
      )} />
      {!isEdit && (
        <FormField control={form.control} name="password" render={({ field }) => (
          <FormItem><FormLabel>Password *</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
      )}
      <FormField control={form.control} name="role" render={({ field }) => (
        <FormItem><FormLabel>Role *</FormLabel>
          <Select onValueChange={field.onChange} value={field.value}>
            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
            <SelectContent>
              <SelectItem value="employee">Employee</SelectItem>
              <SelectItem value="tl">Team Leader</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="ceo">CEO</SelectItem>
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )} />
      <FormField control={form.control} name="teamId" render={({ field }) => (
        <FormItem><FormLabel>Team</FormLabel>
          <Select 
            onValueChange={v => {
              if (v === "none") {
                field.onChange(undefined);
              } else {
                field.onChange(parseInt(v));
              }
            }} 
            value={field.value ? field.value.toString() : "none"}
          >
            <FormControl><SelectTrigger><SelectValue placeholder="No team" /></SelectTrigger></FormControl>
            <SelectContent>
              <SelectItem value="none">No Team</SelectItem>
              {teams?.map(t => <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )} />
      <FormField control={form.control} name="employeeId" render={({ field }) => (
        <FormItem><FormLabel>Employee ID</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
      )} />
      <FormField control={form.control} name="department" render={({ field }) => (
        <FormItem><FormLabel>Department</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
      )} />
      <FormField control={form.control} name="status" render={({ field }) => (
        <FormItem><FormLabel>Account Status</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent></Select><FormMessage /></FormItem>
      )} />
    </div>
  );

  const roleBadge = (role: string) => {
    const styles: Record<string, string> = {
      manager: "bg-blue-100 text-blue-800",
      ceo: "bg-violet-100 text-violet-800",
      tl: "bg-indigo-100 text-indigo-800",
      employee: "bg-gray-100 text-gray-700",
    };
    const labels: Record<string, string> = {
      manager: "Manager",
      ceo: "CEO",
      tl: "Team Leader",
      employee: "Employee",
    };
    return (
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${styles[role] || "bg-gray-100 text-gray-700"}`}>
        {labels[role] || role}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-violet-100 text-violet-700 text-xs font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wide">CEO Portal</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500 mt-1">Manage all employees and portal users.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}><Download className="mr-2 h-4 w-4" /> Export</Button>
          <Dialog open={isCreateOpen} onOpenChange={open => { if (open) { form.reset(); setSelectedUser(null); } setIsCreateOpen(open); }}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Add User</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Add New User</DialogTitle></DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                  <UserFormFields />
                  <div className="flex justify-end pt-4 border-t gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={createMutation.isPending}>Create User</Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border flex flex-wrap gap-4 items-center">
        <div className="flex items-center text-sm font-medium text-gray-500"><Filter className="w-4 h-4 mr-2" /> Filters</div>
        <div className="w-44">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger><SelectValue placeholder="All Roles" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="employee">Employee</SelectItem>
              <SelectItem value="tl">Team Leader</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="ceo">CEO</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-44">
          <Select value={teamFilter} onValueChange={setTeamFilter}>
            <SelectTrigger><SelectValue placeholder="All Teams" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teams</SelectItem>
              {teams?.map(t => <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {(roleFilter !== "all" || teamFilter !== "all") && (
          <Button variant="ghost" size="sm" onClick={() => { setRoleFilter("all"); setTeamFilter("all"); }}>Clear</Button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Employee ID</TableHead>
                <TableHead>Department</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="h-32 text-center text-gray-500">Loading...</TableCell></TableRow>
              ) : users && users.length > 0 ? (
                users.map(user => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="text-sm text-gray-600">{user.email}</TableCell>
                    <TableCell>{roleBadge(user.role)}</TableCell>
                    <TableCell className="text-sm text-gray-500">{user.teamName || "—"}</TableCell>
                    <TableCell className="text-sm font-mono text-gray-500">{user.employeeId || "—"}</TableCell>
                    <TableCell className="text-sm text-gray-500">{user.department || "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-primary" onClick={() => openEdit(user)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Reset password" className="h-8 w-8 text-gray-400 hover:text-primary" onClick={() => { setSelectedUser(user); setTemporaryPassword(""); setIsResetOpen(true); }}><KeyRound className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-600"
                          onClick={() => { setSelectedUser(user); setIsDeleteOpen(true); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={7} className="h-32 text-center text-gray-500">No users found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit User</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <UserFormFields isEdit />
              <div className="flex justify-end pt-4 border-t gap-2">
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={updateMutation.isPending}>Save Changes</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isResetOpen} onOpenChange={setIsResetOpen}><DialogContent><DialogHeader><DialogTitle>Reset Password</DialogTitle></DialogHeader><p className="text-sm text-muted-foreground">Set a temporary password for {selectedUser?.name}. The existing password is never shown.</p><Input type="password" autoComplete="new-password" value={temporaryPassword} onChange={(event) => setTemporaryPassword(event.target.value)} placeholder="Temporary password (minimum 8 characters)" /><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setIsResetOpen(false)}>Cancel</Button><Button disabled={temporaryPassword.length < 8} onClick={resetPassword}>Save Temporary Password</Button></div></DialogContent></Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <strong>{selectedUser?.name}</strong>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
