/**
 * Task Status Badge Component
 * 
 * Displays color-coded status badges for tasks based on due dates and escalation levels
 */

import { getTaskStatus, type Task } from "@/lib/task-status";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TaskStatusBadgeProps {
  task: Task;
  showTooltip?: boolean;
  className?: string;
}

export function TaskStatusBadge({ task, showTooltip = true, className = "" }: TaskStatusBadgeProps) {
  const status = getTaskStatus(task);
  
  const badge = (
    <Badge 
      className={`${status.className} border px-2 py-1 text-xs font-medium ${className}`}
      variant="outline"
    >
      <span className="mr-1">{status.badge}</span>
      {status.label}
    </Badge>
  );
  
  if (!showTooltip) {
    return badge;
  }
  
  // Build tooltip content
  const tooltipContent = () => {
    if (task.status === 'completed') {
      return "Task has been completed successfully.";
    }
    
    if (task.status === 'cancelled') {
      return "Task has been cancelled.";
    }
    
    if (status.escalationLevel > 0) {
      const escalationInfo = [
        "This task has been escalated.",
        `Escalation Level: ${status.escalationLevel}`,
        status.escalationLevel === 1 && "Reminder sent to Employee & Team Leader",
        status.escalationLevel === 2 && "Escalation sent to Team Leader & Manager",
        status.escalationLevel === 3 && "Critical escalation sent to Manager & CEO",
        status.escalationLevel === 4 && "URGENT: Final escalation sent to CEO & Admin"
      ].filter(Boolean).join("\n");
      
      return escalationInfo;
    }
    
    if (status.isOverdue) {
      return `Task is overdue by ${Math.abs(status.daysDiff)} day(s). Please update the progress or complete the task.`;
    }
    
    if (status.badge === '🟡') {
      return `Task is due soon (${Math.abs(status.daysDiff)} day(s) remaining). Plan to complete it on time.`;
    }
    
    return `Task is on track with ${Math.abs(status.daysDiff)} day(s) remaining until due date.`;
  };
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="whitespace-pre-line text-sm">{tooltipContent()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Compact version showing only the badge emoji
 */
export function TaskStatusIcon({ task, className = "" }: TaskStatusBadgeProps) {
  const status = getTaskStatus(task);
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`text-lg cursor-help ${className}`} title={status.label}>
            {status.badge}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm font-medium">{status.label}</p>
          {status.isOverdue && (
            <p className="text-xs text-muted-foreground mt-1">
              Overdue by {Math.abs(status.daysDiff)} day(s)
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
