"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Bell } from "lucide-react";

/** Background notification check interval — pauses when tab is hidden */
const NOTIFICATION_CHECK_MS = 30000;

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [permission, setPermission] = useState<string>("granted");
  const checkingRef = useRef(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    }

    const checkNotifications = async () => {
      if (checkingRef.current || document.visibilityState !== "visible") return;
      checkingRef.current = true;
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
      } finally {
        checkingRef.current = false;
      }
    };

    // Initial check once the tab is visible
    checkNotifications();

    // Slow background check that stops entirely while the tab is hidden
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const startInterval = () => {
      if (intervalId === null) intervalId = setInterval(checkNotifications, NOTIFICATION_CHECK_MS);
    };
    const stopInterval = () => {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        checkNotifications();
        startInterval();
      } else {
        stopInterval();
      }
    };

    startInterval();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      stopInterval();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
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
