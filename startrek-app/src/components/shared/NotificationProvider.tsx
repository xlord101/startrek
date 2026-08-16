"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [permission, setPermission] = useState<string>("granted");

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    }

    const checkNotifications = async () => {
      try {
        const res = await fetch("/api/notifications");
        if (!res.ok) return;
        const data = await res.json();
        
        if (data.notifications && data.notifications.length > 0) {
          const unreadIds = [];
          for (const notif of data.notifications) {
            unreadIds.push(notif.id);
            if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
              new Notification(notif.title, { body: notif.message, icon: "/images/kd-export-icon.png" });
            }
          }
          
          if (unreadIds.length > 0) {
            await fetch("/api/notifications", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ids: unreadIds }),
            });
          }
        }
      } catch (e) {
        // silently ignore fetch errors to avoid spamming the console
      }
    };

    const interval = setInterval(checkNotifications, 5000);
    return () => clearInterval(interval);
  }, []);

  const requestPermission = () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      Notification.requestPermission().then((perm) => {
        setPermission(perm);
      });
    }
  };

  return (
    <>
      {permission === "default" && (
        <div className="bg-sky-600 text-white px-4 py-2 flex items-center justify-center gap-3 text-sm font-semibold z-50">
          <Bell className="w-4 h-4" />
          <span>Enable system notifications to receive real-time alerts.</span>
          <button
            onClick={requestPermission}
            className="bg-white text-sky-700 px-3 py-1 rounded-md text-xs font-bold hover:bg-sky-50 transition-colors"
          >
            Allow Notifications
          </button>
        </div>
      )}
      {children}
    </>
  );
}
