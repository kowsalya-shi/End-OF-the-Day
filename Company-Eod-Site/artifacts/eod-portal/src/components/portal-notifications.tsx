import { useEffect, useState } from "react";
import { Bell, BellRing } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type PortalNotification = {
  id: number;
  type: string;
  title: string;
  message: string;
  targetDate: string;
};

export function PortalNotifications() {
  const [notifications, setNotifications] = useState<PortalNotification[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) return;

    fetch("http://localhost:8080/api/notifications", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => response.ok ? response.json() : [])
      .then((items) => setNotifications(items))
      .catch(() => setNotifications([]));
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Portal Alerts</CardTitle>
        {notifications.length > 0 ? <BellRing className="h-5 w-5 text-red-600" /> : <Bell className="h-5 w-5 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        {notifications.length > 0 ? (
          <div className="space-y-3">
            {notifications.slice(0, 5).map((notification) => (
              <div key={notification.id} className="border-l-4 border-red-500 bg-red-50 px-3 py-2">
                <p className="text-sm font-semibold text-gray-900">{notification.title}</p>
                <p className="mt-1 text-sm text-gray-700">{notification.message}</p>
                <p className="mt-1 text-xs text-gray-500">EOD date: {notification.targetDate}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-2 text-sm text-gray-500">No portal alerts.</p>
        )}
      </CardContent>
    </Card>
  );
}
