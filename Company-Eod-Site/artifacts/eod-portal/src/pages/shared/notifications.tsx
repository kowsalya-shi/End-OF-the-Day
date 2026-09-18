import { PortalNotifications } from "@/components/portal-notifications";

export default function PortalNotificationsPage() {
  return <div className="space-y-6"><div><h1 className="text-2xl font-bold text-gray-900">Notifications</h1><p className="mt-1 text-gray-500">Task approvals, rejections, and important portal alerts.</p></div><PortalNotifications /></div>;
}
