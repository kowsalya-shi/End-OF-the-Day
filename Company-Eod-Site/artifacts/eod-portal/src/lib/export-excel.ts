/**
 * Export MIS data to Excel with multiple sheets
 * Uses CSV-based approach for compatibility without external dependencies
 */

export function exportMISToExcel(misData: any, filename: string = "MIS_Report.xlsx") {
  // Since we don't have xlsx library, we'll create a multi-sheet CSV format
  // that Excel can open. Each "sheet" will be a separate section in the file.
  
  const sections: string[] = [];
  
  // Sheet 1: MIS Summary
  sections.push("MIS SUMMARY");
  sections.push("=".repeat(80));
  sections.push(`Report Date,${misData.dateRange.label}`);
  sections.push(`Generated On,${new Date().toLocaleString()}`);
  sections.push("");
  
  sections.push("TASK SUMMARY");
  sections.push("Metric,Count");
  sections.push(`Total Tasks,${misData.summary.tasks.total}`);
  sections.push(`YTS,${misData.summary.tasks.yts}`);
  sections.push(`WIP,${misData.summary.tasks.wip}`);
  sections.push(`Holding,${misData.summary.tasks.holding}`);
  sections.push(`Completed,${misData.summary.tasks.completed}`);
  sections.push(`Overdue,${misData.summary.tasks.overdue}`);
  sections.push(`Ageing (5+ days),${misData.summary.tasks.ageing}`);
  sections.push("");
  
  sections.push("EOD SUMMARY");
  sections.push("Metric,Count");
  sections.push(`Total Users,${misData.summary.eod.total}`);
  sections.push(`Submitted,${misData.summary.eod.submitted}`);
  sections.push(`Missing,${misData.summary.eod.missing}`);
  sections.push(`Late,${misData.summary.eod.late}`);
  sections.push(`Submission Rate,${misData.summary.eod.submissionPercentage}%`);
  sections.push("");
  sections.push("");
  
  // Sheet 2: Employee Performance
  sections.push("EMPLOYEE PERFORMANCE");
  sections.push("=".repeat(80));
  sections.push("Employee,Email,Role,Total Tasks,Completed,WIP,YTS,Holding,Ageing,EOD Rate %");
  
  misData.employeePerformance.forEach((emp: any) => {
    sections.push([
      emp.employeeName,
      emp.email,
      emp.role,
      emp.tasks.total,
      emp.tasks.completed,
      emp.tasks.wip,
      emp.tasks.yts,
      emp.tasks.holding,
      emp.tasks.ageing,
      emp.eodSubmissionRate
    ].join(","));
  });
  sections.push("");
  sections.push("");
  
  // Sheet 3: TL Performance
  if (misData.tlPerformance && misData.tlPerformance.length > 0) {
    sections.push("TL PERFORMANCE");
    sections.push("=".repeat(80));
    sections.push("Team Leader,Team Name,Members,Total Tasks,Completed,WIP,YTS,Holding,Ageing,Missing EOD Today");
    
    misData.tlPerformance.forEach((tl: any) => {
      sections.push([
        tl.tlName,
        tl.teamName,
        tl.memberCount,
        tl.tasks.total,
        tl.tasks.completed,
        tl.tasks.wip,
        tl.tasks.yts,
        tl.tasks.holding,
        tl.tasks.ageing,
        tl.missingEodToday
      ].join(","));
    });
    sections.push("");
    sections.push("");
  }
  
  // Sheet 4: Ageing Tasks
  if (misData.ageing && misData.ageing.tasks.length > 0) {
    sections.push("AGEING TASKS (5+ DAYS)");
    sections.push("=".repeat(80));
    sections.push("Task ID,Task Name,Task Code,Status,Age (Days),Priority,Start Date");
    
    misData.ageing.tasks.forEach((task: any) => {
      sections.push([
        task.taskId,
        `"${task.taskName}"`,
        task.taskCode || "",
        task.status.toUpperCase(),
        task.ageDays,
        task.priority,
        task.startDate
      ].join(","));
    });
    sections.push("");
    sections.push("");
  }
  
  // Sheet 5: Overdue Tasks
  if (misData.overdue && misData.overdue.tasks.length > 0) {
    sections.push("OVERDUE TASKS");
    sections.push("=".repeat(80));
    sections.push("Task ID,Task Name,Task Code,Status,Overdue By (Days),Priority,Due Date");
    
    misData.overdue.tasks.forEach((task: any) => {
      sections.push([
        task.taskId,
        `"${task.taskName}"`,
        task.taskCode || "",
        task.status.toUpperCase(),
        task.overdueDays,
        task.priority,
        task.plannedEndDate
      ].join(","));
    });
  }
  
  // Create blob and download
  const csvContent = sections.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", filename.replace(".xlsx", ".csv"));
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export detailed MIS report with all data
 */
export function exportDetailedMISReport(misData: any) {
  const timestamp = new Date().toISOString().split('T')[0];
  exportMISToExcel(misData, `MIS_Report_${timestamp}.csv`);
}
