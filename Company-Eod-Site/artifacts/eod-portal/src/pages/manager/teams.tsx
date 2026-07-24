import { useState } from "react";
import { 
  useListTeams, getListTeamsQueryKey, 
  useCreateTeam, useUpdateTeam, useDeleteTeam,
  useListUsers, getListUsersQueryKey
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
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Plus, Edit2, Trash2, Building2 } from "lucide-react";

const teamSchema = z.object({
  name: z.string().min(1, "Name is required"),
  tlId: z.coerce.number().optional().nullable(),
  managerId: z.coerce.number().optional().nullable(),
});

export default function ManagerTeams() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);

  const { data: teams, isLoading } = useListTeams({ query: { queryKey: getListTeamsQueryKey() } });
  const { data: users } = useListUsers({}, { query: { queryKey: getListUsersQueryKey() } });

  const createMutation = useCreateTeam();
  const updateMutation = useUpdateTeam();
  const deleteMutation = useDeleteTeam();

  const tls = users?.filter(u => u.role === "tl") || [];
  const managers = users?.filter(u => u.role === "manager" || u.role === "ceo") || [];

  const form = useForm<z.infer<typeof teamSchema>>({
    resolver: zodResolver(teamSchema),
    defaultValues: { name: "", tlId: null, managerId: null },
  });

  const onSubmit = (values: z.infer<typeof teamSchema>) => {
    if (selectedTeam) {
      updateMutation.mutate(
        { id: selectedTeam.id, data: values },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListTeamsQueryKey() });
            setIsEditOpen(false);
            toast({ title: "Team updated" });
          }
        }
      );
    } else {
      createMutation.mutate(
        { data: values },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListTeamsQueryKey() });
            setIsCreateOpen(false);
            form.reset();
            toast({ title: "Team created" });
          }
        }
      );
    }
  };

  const handleDelete = () => {
    if (selectedTeam) {
      deleteMutation.mutate(
        { id: selectedTeam.id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListTeamsQueryKey() });
            setIsDeleteOpen(false);
            toast({ title: "Team deleted" });
          }
        }
      );
    }
  };

  const openEdit = (t: any) => {
    setSelectedTeam(t);
    form.reset({ name: t.name, tlId: t.tlId, managerId: t.managerId });
    setIsEditOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Teams</h1>
          <p className="text-gray-500 mt-1">Organize employees into teams and assign leaders.</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={(v) => { if(v){form.reset(); setSelectedTeam(null);} setIsCreateOpen(v); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add Team</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Team</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Team Name</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="tlId" render={({ field }) => (
                  <FormItem><FormLabel>Team Leader</FormLabel>
                  <Select onValueChange={(v) => field.onChange(v === "none" ? null : parseInt(v))} value={field.value?.toString() || "none"}>
                    <FormControl><SelectTrigger><SelectValue placeholder="No TL" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="none">No Team Leader</SelectItem>
                      {tls.map(u => <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>)}
                    </SelectContent>
                  </Select></FormItem>
                )} />
                <FormField control={form.control} name="managerId" render={({ field }) => (
                  <FormItem><FormLabel>Manager</FormLabel>
                  <Select onValueChange={(v) => field.onChange(v === "none" ? null : parseInt(v))} value={field.value?.toString() || "none"}>
                    <FormControl><SelectTrigger><SelectValue placeholder="No Manager" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="none">No Manager</SelectItem>
                      {managers.map(u => <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>)}
                    </SelectContent>
                  </Select></FormItem>
                )} />
                <div className="flex justify-end"><Button type="submit">Save Team</Button></div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>Team Name</TableHead>
              <TableHead>Team Leader</TableHead>
              <TableHead>Manager</TableHead>
              <TableHead>Members</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center h-24">Loading...</TableCell></TableRow>
            ) : teams?.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium"><div className="flex items-center"><Building2 className="w-4 h-4 mr-2 text-gray-400"/> {t.name}</div></TableCell>
                <TableCell>{t.tlName || "-"}</TableCell>
                <TableCell>{t.managerName || "-"}</TableCell>
                <TableCell>{t.memberCount || 0}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(t)}><Edit2 className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="text-red-500" onClick={() => {setSelectedTeam(t); setIsDeleteOpen(true);}}><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Team</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Team Name</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="tlId" render={({ field }) => (
                <FormItem><FormLabel>Team Leader</FormLabel>
                <Select onValueChange={(v) => field.onChange(v === "none" ? null : parseInt(v))} value={field.value?.toString() || "none"}>
                  <FormControl><SelectTrigger><SelectValue placeholder="No TL" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="none">No Team Leader</SelectItem>
                    {tls.map(u => <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select></FormItem>
              )} />
              <FormField control={form.control} name="managerId" render={({ field }) => (
                <FormItem><FormLabel>Manager</FormLabel>
                <Select onValueChange={(v) => field.onChange(v === "none" ? null : parseInt(v))} value={field.value?.toString() || "none"}>
                  <FormControl><SelectTrigger><SelectValue placeholder="No Manager" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="none">No Manager</SelectItem>
                    {managers.map(u => <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select></FormItem>
              )} />
              <div className="flex justify-end"><Button type="submit">Update Team</Button></div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Team?</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600" onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

