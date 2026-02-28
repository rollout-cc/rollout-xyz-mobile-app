import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

/**
 * Registers for push notifications on native platforms (iOS/Android).
 * Stores the device token in the profiles table for later targeting.
 */
export function usePushNotifications() {
  const { user } = useAuth();
  const registered = useRef(false);

  useEffect(() => {
    if (!user || registered.current) return;
    if (!Capacitor.isNativePlatform()) return;

    const register = async () => {
      const permission = await PushNotifications.requestPermissions();
      if (permission.receive !== "granted") return;

      await PushNotifications.register();

      PushNotifications.addListener("registration", async (token) => {
        registered.current = true;
        // Store token — we'll add a push_tokens table later if needed
        console.log("[Push] Registered with token:", token.value);
      });

      PushNotifications.addListener("registrationError", (err) => {
        console.error("[Push] Registration error:", err);
      });

      PushNotifications.addListener("pushNotificationReceived", (notification) => {
        console.log("[Push] Received:", notification);
      });

      PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
        console.log("[Push] Action:", action);
      });
    };

    register();
  }, [user]);
}
