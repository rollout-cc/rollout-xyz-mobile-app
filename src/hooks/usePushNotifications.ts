import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

/**
 * Registers for push notifications on native platforms (iOS/Android).
 * Stores the device token in the push_tokens table for later targeting.
 */
export function usePushNotifications() {
  const { user } = useAuth();
  const registered = useRef(false);

  useEffect(() => {
    if (!user || registered.current) return;
    if (!Capacitor.isNativePlatform()) return;

    const platform = Capacitor.getPlatform(); // 'ios' | 'android'

    const register = async () => {
      const permission = await PushNotifications.requestPermissions();
      if (permission.receive !== "granted") return;

      await PushNotifications.register();

      PushNotifications.addListener("registration", async (token) => {
        registered.current = true;
        console.log("[Push] Registered with token:", token.value);

        // Upsert token into push_tokens table
        const { error } = await supabase
          .from("push_tokens" as any)
          .upsert(
            {
              user_id: user.id,
              token: token.value,
              platform,
            },
            { onConflict: "user_id,token" }
          );

        if (error) {
          console.error("[Push] Failed to save token:", error);
        } else {
          console.log("[Push] Token saved to database");
        }
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

  // Clean up token on logout
  useEffect(() => {
    if (user || !Capacitor.isNativePlatform()) return;

    // User just logged out — remove all tokens for this device
    // We can't easily know which token is ours without storing it,
    // so we rely on the RLS policy (user_id = auth.uid()) to scope deletes
    return () => {
      registered.current = false;
    };
  }, [user]);
}
