/**
 * Team Leader EOD Approval Page
 * 
 * Allows TL to:
 * - View pending EOD submissions from team members
 * - Approve ✅
 * - Reject ❌ (with reason)
 * - Send Back 🔄 (for correction)
 * - Add Comments 💬
 */

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, RotateCcw, MessageSquare, Calendar, User, Briefcase } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface EODSubmission {
  id: number;
  userId: number;
  userName: string;
  teamName: string;
  date: string;
  attendanceStatus: string;
  tasksCompleted: number;
  trainingAttended: boolean;
  trainingTopic?: string;
  internalWork?: string;
  challenges?: string;
  tomorrowPlan?: string;
  remarks?: string;
  submittedAt: string;
  approvalStatus: string;
}

export default function TLEodApprovals() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [pendingEods, setPendingEods] = useState<EODSubmission[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEod, setSelectedEod] = useState<EODSubmission | null>(null);
  
  // Dialog states
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [sendBackDialogOpen, setSendBackDialogOpen] = useState(false);
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  
  // Form states
  const [rejectionReason, setRejectionReason] = useState("");
  const [sendBackReason, setSendBackReason] = useState("");
  const [comments, setComments] = useState("");

  // Fetch pending EODs
  const fetchPendingEods = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`http://localhost:8080/api/eod/approvals/pending?tlId=${user.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setPendingEods(data);
      }
    } catch (error) {
      console.error("Error fetching pending EODs:", error);
      toast({
        title: "Error",
        description: "Failed to load pending EODs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Approve EOD
  const handleApprove = async (eodId: number) => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`http://localhost:8080/api/eod/${eodId}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          approvedBy: user?.id,
          comments: comments || null,
        }),
      });

      if (response.ok) {
        toast({
          title: "✅ Approved",
          description: "EOD has been approved successfully",
        });
        setComments("");
        fetchPendingEods();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve EOD",
        variant: "destructive",
      });
    }
  };

  // Reject EOD
  const handleReject = async () => {
    if (!selectedEod || !rejectionReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for rejection",
        variant: "destructive",
      });
      return;
    }

    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`http://localhost:8080/api/eod/${selectedEod.id}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          approvedBy: user?.id,
          reason: rejectionReason,
          comments: comments || null,
        }),
      });

      if (response.ok) {
        toast({
          title: "❌ Rejected",
          description: "EOD has been rejected",
          variant: "destructive",
        });
        setRejectDialogOpen(false);
        setRejectionReason("");
        setComments("");
        fetchPendingEods();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject EOD",
        variant: "destructive",
      });
    }
  };

  // Send Back for Correction
  const handleSendBack = async () => {
    if (!selectedEod || !sendBackReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for sending back",
        variant: "destructive",
      });
      return;
    }

    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`http://localhost:8080/api/eod/${selectedEod.id}/send-back`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          approvedBy: user?.id,
          reason: sendBackReason,
          comments: comments || null,
        }),
      });

      if (response.ok) {
        toast({
          title: "🔄 Sent Back",
          description: "EOD has been sent back for correction",
        });
        setSendBackDialogOpen(false);
        setSendBackReason("");
        setComments("");
        fetchPendingEods();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send back EOD",
        variant: "destructive",
      });
    }
  };

  // Load pending EODs on mount
  useState(() => {
    fetchPendingEods();
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">EOD Approvals</h1>
          <p className="text-sm text-gray-500 mt-1">Review and approve team member EOD submissions</p>
        </div>
        <Button onClick={fetchPendingEods} variant="outline">
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{pendingEods.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting your review</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending EODs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Pending EOD Submissions</CardTitle>
          <CardDescription>
            Review and take action on team member EOD submissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">Loading...</p>
          ) : pendingEods.length === 0 ? (
            <Alert>
              <AlertDescription>
                ✅ No pending EODs to review. All team submissions have been processed!
              </AlertDescription>
            </Alert>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Attendance</TableHead>
                  <TableHead>Tasks</TableHead>
                  <TableHead>Training</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingEods.map((eod) => (
                  <TableRow key={eod.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{eod.userName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        {format(new Date(eod.date), "MMM dd, yyyy")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={eod.attendanceStatus === "present" ? "default" : "secondary"}>
                        {eod.attendanceStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>{eod.tasksCompleted || 0}</TableCell>
                    <TableCell>
                      {eod.trainingAttended ? "✅ Yes" : "❌ No"}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {format(new Date(eod.submittedAt), "HH:mm")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedEod(eod);
                            setViewDetailsOpen(true);
                          }}
                        >
                          👁️ View
                        </Button>
                        <Button
                          size="sm"
                          variant="default"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleApprove(eod.id)}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-yellow-600 border-yellow-600 hover:bg-yellow-50"
                          onClick={() => {
                            setSelectedEod(eod);
                            setSendBackDialogOpen(true);
                          }}
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          Send Back
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setSelectedEod(eod);
                            setRejectDialogOpen(true);
                          }}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View Details Dialog */}
      <Dialog open={viewDetailsOpen} onOpenChange={setViewDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>EOD Details</DialogTitle>
            <DialogDescription>
              Submitted by {selectedEod?.userName} on {selectedEod?.date}
            </DialogDescription>
          </DialogHeader>
          {selectedEod && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Attendance</p>
                  <p className="text-base">{selectedEod.attendanceStatus}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Tasks Completed</p>
                  <p className="text-base">{selectedEod.tasksCompleted || 0}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Training Attended</p>
                  <p className="text-base">{selectedEod.trainingAttended ? "Yes" : "No"}</p>
                </div>
                {selectedEod.trainingTopic && (
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-gray-500">Training Topic</p>
                    <p className="text-base">{selectedEod.trainingTopic}</p>
                  </div>
                )}
              </div>
              
              {selectedEod.internalWork && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Internal Work</p>
                  <p className="text-base whitespace-pre-wrap">{selectedEod.internalWork}</p>
                </div>
              )}
              
              {selectedEod.challenges && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Challenges</p>
                  <p className="text-base whitespace-pre-wrap">{selectedEod.challenges}</p>
                </div>
              )}
              
              {selectedEod.tomorrowPlan && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Tomorrow's Plan</p>
                  <p className="text-base whitespace-pre-wrap">{selectedEod.tomorrowPlan}</p>
                </div>
              )}
              
              {selectedEod.remarks && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Remarks</p>
                  <p className="text-base whitespace-pre-wrap">{selectedEod.remarks}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDetailsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>❌ Reject EOD</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this EOD submission
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Reason for Rejection *</label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g., Incomplete information, tasks not properly documented..."
                rows={3}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Additional Comments (Optional)</label>
              <Textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Any additional feedback..."
                rows={2}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              Reject EOD
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Back Dialog */}
      <Dialog open={sendBackDialogOpen} onOpenChange={setSendBackDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>🔄 Send Back for Correction</DialogTitle>
            <DialogDescription>
              Provide feedback for the employee to improve their EOD
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Corrections Needed *</label>
              <Textarea
                value={sendBackReason}
                onChange={(e) => setSendBackReason(e.target.value)}
                placeholder="e.g., Please add more details about task completion, clarify the challenges faced..."
                rows={3}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Additional Feedback (Optional)</label>
              <Textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Any helpful suggestions..."
                rows={2}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendBackDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-yellow-600 hover:bg-yellow-700" onClick={handleSendBack}>
              Send Back
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
