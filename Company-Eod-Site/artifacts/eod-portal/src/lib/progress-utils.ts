/**
 * Auto Progress Management Utility
 * 
 * This utility manages automatic progress calculation based on status
 * to prevent users from entering incorrect progress values.
 * 
 * Status Rules:
 * - Yet to Start (YTS): 0% (auto, disabled)
 * - Work In Progress (WIP): 1-99% (manual, enabled)
 * - Completed: 100% (auto, disabled)
 * - On Hold: Keep current progress (disabled)
 * - Cancelled: 0% (auto, disabled)
 */

/**
 * Calculate progress based on status
 * @param status - Current status value
 * @param currentProgress - Current progress value (for "hold" status)
 * @returns Calculated progress percentage
 */
export const getProgressFromStatus = (status: string, currentProgress?: number): number => {
  switch(status) {
    case "yts": return 0; // Yet to Start
    case "completed": return 100; // Completed
    case "cancelled": return 0; // Cancelled
    case "hold": return currentProgress ?? 0; // Keep existing progress
    case "wip": return currentProgress ?? 0; // WIP - user can edit manually
    // Training specific statuses
    case "learning": return currentProgress ?? 0; // User can edit
    case "practicing": return currentProgress ?? 0; // User can edit
    default: return currentProgress ?? 0;
  }
};

/**
 * Check if progress field should be disabled
 * @param status - Current status value
 * @returns true if progress should be disabled, false if editable
 */
export const isProgressDisabled = (status: string): boolean => {
  // Disable progress input for these statuses (auto-managed)
  return status === "yts" || 
         status === "completed" || 
         status === "hold" || 
         status === "cancelled";
};

/**
 * Get helper text for progress field based on status
 * @param status - Current status value
 * @returns Helper text to display below progress field
 */
export const getProgressHelperText = (status: string): string => {
  switch(status) {
    case "yts": return "Progress is automatically set to 0% for Yet to Start";
    case "completed": return "Progress is automatically set to 100% for Completed";
    case "cancelled": return "Progress is automatically reset to 0% for Cancelled";
    case "hold": return "Progress is locked at current value for On Hold status";
    default: return "Enter progress between 1-99%";
  }
};
