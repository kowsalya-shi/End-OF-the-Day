import { useState } from "react";
import { 
  useListUsers, getListUsersQueryKey, 
  useCreateUser, 
  useUpdateUser, 
  useDeleteUser,
  useListTeams, getListTeamsQueryKey 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Edit2, Trash2, Shield } from "lucide-react";

const userSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email(),
  password: z.string().min(6).optional(), // Optional for edits
  role: z.string().min(1),
  teamId: z.coerce.number().optional().nullable(),
  employeeId: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
});

export default function ManagerUsers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const { data: users, isLoading } = useListUsers({}, { query: { queryKey: getListUsersQueryKey() } });
  const { data: teams } = useListTeams({ query: { queryKey: getListTeamsQueryKey() } });

  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const deleteMutation = useDeleteUser();

  const form = useForm<z.infer<typeof userSchema>>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: "", email: "", password: "", role: "employee", teamId: null, employeeId: "", department: ""
    },
  });

  const onSubmit = (values: z.infer<typeof userSchema>) => {
    if (selectedUser) {
      // Don't send empty password
      const updateData = { ...values };
      if (!updateData.password) delete (updateData as any).password;
      
      updateMutation.mutate(
        { id: selectedUser.id, data: updateData },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
            setIsEditOpen(false);
            toast({ title: "User updated" });
          }
        }
      );
    } else {
      if (!values.password) {
        form.setError("password", { message: "Password required for new users" });
        return;
      }
      createMutation.mutate(
        { data: { ...values, password: values.password! } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
            setIsCreateOpen(false);
            form.reset();
            toast({ title: "User created" });
          }
        }
      );
    }
  };

  const handleDelete = () => {
    if (selectedUser) {
      deleteMutation.mutate(
        { id: selectedUser.id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
            setIsDeleteOpen(false);
            toast({ title: "User deleted" });
          }
        }
      );
    }
  };

  const openEdit = (u: any) => {
    setSelectedUser(u);
    form.reset({
      name: u.name,
      email: u.email,
      role: u.role,
      password: "", // never prefill password
      teamId: u.teamId,
      employeeId: u.employeeId || "",
      department: u.department || ""
    });
    setIsEditOpen(true);
  };

  const RoleBadge = ({ role }: { role: string }) => {
    const map: Record<string, string> = {
      employee: "bg-gray-100 text-gray-800",
      tl: "bg-blue-100 text-blue-800",
      manager: "bg-purple-100 text-purple-800",
      ceo: "bg-teal-100 text-teal-800"
    };
    const labels: Record<string, string> = {
      employee: "EMPLOYEE",
      tl: "TEAM LEADER",
      manager: "MANAGER",
      ceo: "CEO"
    };
    return <span className={`inline-flex px-2 py-1 rounded text-xs font-medium uppercase tracking-wide ${map[role] || map.employee}`}>{labels[role] || role.toUpperCase()}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Users</h1>
          <p className="text-gray-500 mt-1">Directory of all employees and system access.</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={(v) => { if(v) { form.reset(); setSelectedUser(null); } setIsCreateOpen(v); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add User</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create User</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="password" render={({ field }) => (
                  <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="role" render={({ field }) => (
                    <FormItem><FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="employee">Employee</SelectItem>
                        <SelectItem value="tl">Team Leader</SelectItem>
                        <SelectItem value="ceo">CEO</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                      </SelectContent>
                    </Select></FormItem>
                  )} />
                  <FormField control={form.control} name="teamId" render={({ field }) => (
                    <FormItem><FormLabel>Team</FormLabel>
                    <Select onValueChange={(v) => field.onChange(v === "none" ? null : parseInt(v))} value={field.value?.toString() || "none"}>
                      <FormControl><SelectTrigger><SelectValue placeholder="No Team" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="none">No Team</SelectItem>
                        {teams?.map(t => <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select></FormItem>
                  )} />
                </div>
                <div className="flex justify-end pt-4"><Button type="submit">Save User</Button></div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Team</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="h-24 text-center">Loading...</TableCell></TableRow>
            ) : users?.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell><RoleBadge role={u.role} /></TableCell>
                <TableCell>{u.teamName || "-"}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(u)}><Edit2 className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="text-red-500" onClick={() => {setSelectedUser(u); setIsDeleteOpen(true);}}><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit User</DialogTitle></DialogHeader>
          <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="password" render={({ field }) => (
                  <FormItem><FormLabel>New Password (leave blank to keep current)</FormLabel><FormControl><Input type="password" {...field} /></FormControl></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="role" render={({ field }) => (
                    <FormItem><FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="employee">Employee</SelectItem>
                        <SelectItem value="tl">Team Leader</SelectItem>
                        <SelectItem value="ceo">CEO</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                      </SelectContent>
                    </Select></FormItem>
                  )} />
                  <FormField control={form.control} name="teamId" render={({ field }) => (
                    <FormItem><FormLabel>Team</FormLabel>
                    <Select onValueChange={(v) => field.onChange(v === "none" ? null : parseInt(v))} value={field.value?.toString() || "none"}>
                      <FormControl><SelectTrigger><SelectValue placeholder="No Team" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="none">No Team</SelectItem>
                        {teams?.map(t => <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select></FormItem>
                  )} />
                </div>
                <div className="flex justify-end pt-4"><Button type="submit">Update User</Button></div>
              </form>
            </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete User?</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600" onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

