import TlReports from "@/pages/manager/tl-eod-reports";

type ReportPage = "eod" | "tasks" | "dailyWork";

function ITManagerReportPage({ page }: { page: ReportPage }) {
  const details = {
    eod: ["Daily EOD", "Review EOD reports from Amitha, Soubhagya, Rajshekar and Javed."],
    tasks: ["Tasks", "Review the Team Leads' assigned tasks and their status."],
    dailyWork: ["Daily Work", "Review daily work submitted by the Team Leads."],
  } as const;
  const [title, description] = details[page];
  return <div className="space-y-6">
    <div><h1 className="text-2xl font-bold text-gray-900">{title}</h1><p className="mt-1 text-gray-500">{description}</p></div>
    <TlReports embedded allowedTabs={[page]} defaultTab={page} />
  </div>;
}

export const ITManagerEod = () => <ITManagerReportPage page="eod" />;
export const ITManagerTasks = () => <ITManagerReportPage page="tasks" />;
export const ITManagerDailyWork = () => <ITManagerReportPage page="dailyWork" />;
