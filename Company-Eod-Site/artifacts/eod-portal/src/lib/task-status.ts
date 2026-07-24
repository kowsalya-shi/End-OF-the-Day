/**
 * Task Status and Escalation Utility
 * 
 * Calculates task status badges based on due dates and completion status
 * Implements the escalation rules for overdue tasks
 */

export interface TaskStatusInfo {
  badge: string;
  color: string;
  label: string;
  className: string;
  daysDiff: number;
  isOverdue: boolean;
  escalationLevel: number;
}

export interface Task {
  status: string;
  plannedEndDate?: string | null;
  actualEndDate?: string | null;
  completionPct?: number;
}

/**
 * Calculate the number of days difference between due date and today
 * Positive = overdue, Negative = time remaining
 */
export function calculateDaysDifference(dueDate: string | null | undefined): number {
  if (!dueDate) return 0;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day
  
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  
  const diffTime = today.getTime() - due.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

/**
 * Get escalation level based on days overdue
 */
export function getEscalationLevel(daysOverdue: number): number {
  if (daysOverdue < 15) return 0; // Normal
  if (daysOverdue >= 15 && daysOverdue < 21) return 1; // Reminder
  if (daysOverdue >= 21 && daysOverdue < 30) return 2; // First Escalation
  if (daysOverdue >= 30 && daysOverdue < 45) return 3; // Second Escalation
  return 4; // Final Escalation (45+ days)
}

/**
 * Get comprehensive task status information with escalation details
 */
export function getTaskStatus(task: Task): TaskStatusInfo {
  // If task is completed or cancelled, show completion status
  if (task.status === 'completed') {
    return {
      badge: '✅',
      color: 'green',
      label: 'Completed',
      className: 'bg-green-100 text-green-800 border-green-200',
      daysDiff: 0,
      isOverdue: false,
      escalationLevel: 0
    };
  }
  
  if (task.status === 'cancelled') {
    return {
      badge: '❌',
      color: 'gray',
      label: 'Cancelled',
      className: 'bg-gray-100 text-gray-800 border-gray-200',
      daysDiff: 0,
      isOverdue: false,
      escalationLevel: 0
    };
  }
  
  // Calculate days difference
  const daysDiff = calculateDaysDifference(task.plannedEndDate);
  
  // Task is on track (before due date)
  if (daysDiff < 0) {
    const daysRemaining = Math.abs(daysDiff);
    
    // Due soon (within 3 days)
    if (daysRemaining <= 3) {
      return {
        badge: '🟡',
        color: 'yellow',
        label: `Due in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`,
        className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        daysDiff,
        isOverdue: false,
        escalationLevel: 0
      };
    }
    
    // On track
    return {
      badge: '🟢',
      color: 'green',
      label: `${daysRemaining} days left`,
      className: 'bg-green-50 text-green-700 border-green-100',
      daysDiff,
      isOverdue: false,
      escalationLevel: 0
    };
  }
  
  // Task is overdue
  const escalationLevel = getEscalationLevel(daysDiff);
  
  // 0-14 days overdue: Just overdue
  if (daysDiff >= 0 && daysDiff <= 14) {
    return {
      badge: '🟠',
      color: 'orange',
      label: `Overdue by ${daysDiff} day${daysDiff !== 1 ? 's' : ''}`,
      className: 'bg-orange-100 text-orange-800 border-orange-200',
      daysDiff,
      isOverdue: true,
      escalationLevel: 0
    };
  }
  
  // 15-20 days overdue: Escalated (Reminder sent)
  if (daysDiff >= 15 && daysDiff <= 20) {
    return {
      badge: '🔴',
      color: 'red',
      label: `Escalated - ${daysDiff} days overdue`,
      className: 'bg-red-100 text-red-800 border-red-300',
      daysDiff,
      isOverdue: true,
      escalationLevel: 1
    };
  }
  
  // 21-29 days overdue: Critical (First Escalation)
  if (daysDiff >= 21 && daysDiff <= 29) {
    return {
      badge: '🚨',
      color: 'red',
      label: `Critical - ${daysDiff} days overdue`,
      className: 'bg-red-200 text-red-900 border-red-400 font-semibold',
      daysDiff,
      isOverdue: true,
      escalationLevel: 2
    };
  }
  
  // 30-44 days overdue: Severely Delayed (Second Escalation)
  if (daysDiff >= 30 && daysDiff <= 44) {
    return {
      badge: '⛔',
      color: 'darkred',
      label: `Severely Delayed - ${daysDiff} days`,
      className: 'bg-red-300 text-red-950 border-red-500 font-bold',
      daysDiff,
      isOverdue: true,
      escalationLevel: 3
    };
  }
  
  // 45+ days overdue: Final Escalation
  return {
    badge: '⛔',
    color: 'darkred',
    label: `URGENT - ${daysDiff} days overdue`,
    className: 'bg-red-400 text-white border-red-600 font-bold animate-pulse',
    daysDiff,
    isOverdue: true,
    escalationLevel: 4
  };
}

/**
 * Get escalation notification recipients based on escalation level
 */
export function getEscalationRecipients(escalationLevel: number): string[] {
  switch (escalationLevel) {
    case 1: // Reminder (15 days)
      return ['employee', 'tl'];
    case 2: // First Escalation (21 days)
      return ['tl', 'manager'];
    case 3: // Second Escalation (30 days)
      return ['manager', 'ceo'];
    case 4: // Final Escalation (45+ days)
      return ['ceo', 'admin'];
    default:
      return [];
  }
}

/**
 * Get escalation message template
 */
export function getEscalationMessage(
  taskName: string,
  employeeName: string,
  daysOverdue: number,
  escalationLevel: number
): string {
  switch (escalationLevel) {
    case 1:
      return `Task "${taskName}" is overdue by ${daysOverdue} days. Please update progress or complete the task.`;
    case 2:
      return `Task "${taskName}" assigned to ${employeeName} is critical (${daysOverdue} days overdue). Immediate action required.`;
    case 3:
      return `Task "${taskName}" is severely delayed (${daysOverdue} days overdue). Management intervention needed.`;
    case 4:
      return `URGENT: Task "${taskName}" has been pending for ${daysOverdue} days. Critical escalation required.`;
    default:
      return '';
  }
}

/**
 * Check if task needs escalation notification
 * Returns true if today's overdue count matches an escalation threshold
 */
export function shouldSendEscalationNotification(
  daysOverdue: number,
  lastEscalationLevel: number
): boolean {
  // Send on exactly 15, 21, 30, 45 days (once per level)
  if (daysOverdue === 15 && lastEscalationLevel < 1) return true;
  if (daysOverdue === 21 && lastEscalationLevel < 2) return true;
  if (daysOverdue === 30 && lastEscalationLevel < 3) return true;
  if (daysOverdue === 45 && lastEscalationLevel < 4) return true;
  
  return false;
}

/**
 * Get summary statistics for tasks
 */
export interface TaskStatistics {
  total: number;
  completed: number;
  onTrack: number;
  dueSoon: number;
  overdue: number;
  escalated: number;
  critical: number;
  severelyDelayed: number;
}

export function getTaskStatistics(tasks: Task[]): TaskStatistics {
  const stats: TaskStatistics = {
    total: tasks.length,
    completed: 0,
    onTrack: 0,
    dueSoon: 0,
    overdue: 0,
    escalated: 0,
    critical: 0,
    severelyDelayed: 0
  };
  
  tasks.forEach(task => {
    const status = getTaskStatus(task);
    
    if (task.status === 'completed') {
      stats.completed++;
    } else if (!status.isOverdue) {
      if (status.badge === '🟡') stats.dueSoon++;
      else stats.onTrack++;
    } else {
      // Overdue tasks
      if (status.escalationLevel === 0) stats.overdue++;
      else if (status.escalationLevel === 1) stats.escalated++;
      else if (status.escalationLevel === 2) stats.critical++;
      else if (status.escalationLevel >= 3) stats.severelyDelayed++;
    }
  });
  
  return stats;
}
