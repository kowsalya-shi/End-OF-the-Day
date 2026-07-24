import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import {
  useListEod,
  getListEodQueryKey,
  useCreateEod,
  useUpdateEod,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { AttendanceBadge } from "@/components/ui/status-badge";

const eodSchema = z.object({
  date: z.string(),
  attendanceStatus: z.string().min(1, "Attendance is required"),
  tasksCompleted: z.coerce.number().min(0).optional(),
  trainingAttended: z.boolean().default(false).optional(),
  trainingTopic: z.string().optional(),
  internalWork: z.string().optional(),
  challenges: z.string().optional(),
  tomorrowPlan: z.string().optional(),
  remarks: z.string().optional(),
});

type EodFormData = z.infer<typeof eodSchema>;

const ABSENT_STATUSES = ["absent", "leave", "half-day"];

export default function EmployeeEod() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");

  const [showReminder, setShowReminder] = useState(false);
  const [reminderDismissed, setReminderDismissed] = useState(false);

  const { data: eods, isLoading } = useListEod(
    { date: today, userId: user?.id },
    { query: { queryKey: getListEodQueryKey({ date: today, userId: user?.id }) } },
  );

  const existingEod = eods?.[0];
  const createMutation = useCreateEod();
  const updateMutation = useUpdateEod();

  const form = useForm<EodFormData>({
    resolver: zodResolver(eodSchema),
    defaultValues: {
      date: today,
      attendanceStatus: "present",
      tasksCompleted: 0,
      trainingAttended: false,
      trainingTopic: "",
      internalWork: "",
      challenges: "",
      tomorrowPlan: "",
      remarks: "",
    },
  });

  useEffect(() => {
    if (existingEod) {
      form.reset({
        date: existingEod.date,
        attendanceStatus: existingEod.attendanceStatus,
        tasksCompleted: existingEod.tasksCompleted || 0,
        trainingAttended: existingEod.trainingAttended || false,
        trainingTopic: existingEod.trainingTopic || "",
        internalWork: existingEod.internalWork || "",
        challenges: existingEod.challenges || "",
        tomorrowPlan: existingEod.tomorrowPlan || "",
        remarks: existingEod.remarks || "",
      });
    }
  }, [existingEod, form]);

  useEffect(() => {
    const checkReminder = () => {
      const now = new Date();
      const h = now.getHours();
      const m = now.getMinutes();
      const isReminderTime = h === 17 && m >= 30 && m <= 45;
      if (isReminderTime && !existingEod && !reminderDismissed) {
        setShowReminder(true);
      }
    };
    checkReminder();
    const interval = setInterval(checkReminder, 60_000);
    return () => clearInterval(interval);
  }, [existingEod, reminderDismissed]);

  const attendanceStatus = form.watch("attendanceStatus");
  const trainingAttended = form.watch("trainingAttended");
  const isAbsent = ABSENT_STATUSES.includes(attendanceStatus);

  function onSubmit(values: EodFormData) {
    if (existingEod) {
      updateMutation.mutate(
        { id: existingEod.id, data: values },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListEodQueryKey({ date: today, userId: user?.id }) });
            toast({ title: "EOD Updated", description: "Your EOD report has been updated successfully." });
          },
          onError: () => toast({ title: "Error", description: "Failed to update EOD report.", variant: "destructive" }),
        },
      );
    } else {
      createMutation.mutate(
        { data: values },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListEodQueryKey({ date: today, userId: user?.id }) });
            toast({ title: "EOD Submitted", description: "Your EOD report has been submitted successfully." });
            setShowReminder(false);
            setReminderDismissed(true);
          },
          onError: () => toast({ title: "Error", description: "Failed to submit EOD report.", variant: "destructive" }),
        },
      );
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Daily EOD Report</h1>
          <p className="text-gray-500 mt-1">
            Submit your End-of-Day report for {format(new Date(), "MMMM d, yyyy")}
          </p>
        </div>
        {existingEod && (
          <div className="flex items-center bg-green-50 text-green-700 px-4 py-2 rounded-md border border-green-200 text-sm font-medium">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Submitted at{" "}
            {new Date(existingEod.submittedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
        )}
      </div>

      {/* Reminder Dialog */}
      <Dialog
        open={showReminder}
        onOpenChange={open => {
          setShowReminder(open);
          if (!open) setReminderDismissed(true);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center text-amber-600">
              <Clock className="w-5 h-5 mr-2" /> EOD Reminder
            </DialogTitle>
            <DialogDescription className="text-base pt-3 pb-2">
              ⏰ Please submit your EOD before <strong>5:45 PM</strong>!
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end pt-2">
            <Button
              onClick={() => {
                setShowReminder(false);
                setReminderDismissed(true);
              }}
            >
              I&apos;m on it
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <Card className="animate-pulse">
          <CardContent className="h-96" />
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{existingEod ? "Update EOD Report" : "New EOD Report"}</CardTitle>
            <CardDescription>
              {isAbsent
                ? "Mark your attendance. EOD details are not required when absent or on leave."
                : "Fill out the details below to log your daily work."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                {/* Date + Attendance */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                          <Input {...field} readOnly className="bg-gray-50" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="attendanceStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Attendance Status *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="present">✅ Present</SelectItem>
                            <SelectItem value="absent">❌ Absent</SelectItem>
                            <SelectItem value="leave">🏖️ Leave</SelectItem>
                            <SelectItem value="half-day">⏰ Half Day</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* EOD Not Required Banner */}
                {isAbsent && (
                  <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-amber-800">EOD Not Required</p>
                      <p className="text-sm text-amber-700 mt-0.5">
                        Since you are marked as <strong>{attendanceStatus}</strong>, detailed EOD submission is not required.
                        You can add optional remarks below and submit.
                      </p>
                    </div>
                  </div>
                )}

                {/* Remarks (always visible) */}
                <FormField
                  control={form.control}
                  name="remarks"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Remarks {isAbsent ? "(Optional)" : ""}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={isAbsent ? "Reason for absence / leave notes..." : "Any other notes..."}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Full EOD fields — only shown when present / half-day */}
                {!isAbsent && (
                  <>
                    <div className="border-t pt-4 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="tasksCompleted"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tasks Completed</FormLabel>
                              <FormControl>
                                <Input type="number" min="0" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="trainingAttended"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 border rounded-md shadow-sm">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Attended Training Today?</FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>

                      {trainingAttended && (
                        <FormField
                          control={form.control}
                          name="trainingTopic"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Training Topic</FormLabel>
                              <FormControl>
                                <Input placeholder="What did you learn today?" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      <FormField
                        control={form.control}
                        name="internalWork"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Internal Work / Details</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Describe the work you completed today..."
                                className="min-h-24"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="challenges"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Challenges / Blockers</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Any challenges or blockers faced?"
                                className="min-h-20"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="tomorrowPlan"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Plan for Tomorrow</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="What will you work on tomorrow?"
                                className="min-h-20"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </>
                )}

                <div className="flex justify-end pt-2">
                  <Button type="submit" size="lg" disabled={isPending}>
                    {isPending
                      ? "Submitting..."
                      : existingEod
                        ? isAbsent ? "Update Attendance" : "Update EOD Report"
                        : isAbsent ? "Submit Attendance" : "Submit EOD Report"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

