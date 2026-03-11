

# Push Notifications + Twilio SMS Setup

## Current State
- `@capacitor/push-notifications` is installed and the `usePushNotifications` hook exists but **only logs the device token** — it never saves it to the database
- No `push_tokens` table exists — tokens have nowhere to go
- `send-notification` edge function only sends **email** via Resend — no push or SMS channel
- SMS toggles in NotificationSettings are disabled ("coming soon")
- iOS `AppDelegate.swift` is missing the required APNs delegate methods for push
- `profiles` table has a `phone_number` column already — can be used for SMS

## What Needs to Be Built

### 1. Database: `push_tokens` table
```sql
CREATE TABLE public.push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, token)
);
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
-- Users can manage their own tokens
CREATE POLICY "Users manage own tokens" ON public.push_tokens
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
```

### 2. Update `usePushNotifications.ts`
- After receiving the token, **upsert** it into `push_tokens` with `user_id`, `token`, and `platform` (detect via `Capacitor.getPlatform()`)
- On logout, delete the token from the table

### 3. iOS Native Setup (`AppDelegate.swift`)
Add the three required APNs delegate methods so Capacitor's push plugin receives tokens on iOS:
```swift
func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
}
func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
    NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
}
```

### 4. Capacitor config: Add PushNotifications plugin config
```ts
plugins: {
  PushNotifications: {
    presentationOptions: ["badge", "sound", "alert"],
  },
}
```

### 5. Edge Function: `send-push-notification`
New edge function that:
- Accepts `{ user_id, title, body, data? }`
- Queries `push_tokens` for that user
- Sends via **APNs** (iOS) using the APNs HTTP/2 API with a `.p8` key
- Sends via **FCM** (Android) using the FCM HTTP v1 API
- This requires two secrets: `APNS_KEY_P8` (base64-encoded .p8 file), `APNS_KEY_ID`, `APNS_TEAM_ID`, and `FCM_SERVER_KEY`

### 6. Integrate push into `send-notification`
After sending email, also call `send-push-notification` for the same user so all notification types (task assigned, due soon, etc.) also trigger a push.

### 7. Twilio SMS Setup
- **New secret needed**: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
- Add SMS sending logic to `send-notification` edge function — when a user has an SMS preference enabled and a `phone_number` on their profile, send via Twilio REST API
- Enable the SMS toggles in `NotificationSettings.tsx` (remove the `disabled` prop and "coming soon" label)

### 8. Add `push_notification_email` pref columns
Add `push_enabled` boolean to `notification_preferences` so users can toggle push on/off globally.

---

## Implementation Order
1. Create `push_tokens` table + RLS
2. Update `usePushNotifications.ts` to save tokens
3. Update `AppDelegate.swift` with APNs delegate methods
4. Update `capacitor.config.ts` with push plugin options
5. Request APNs credentials (p8 key, key ID, team ID) — **you'll need to provide these from your Apple Developer account**
6. Build `send-push-notification` edge function
7. Wire push into existing `send-notification` flow
8. Request Twilio credentials (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`)
9. Add SMS sending to `send-notification`
10. Enable SMS toggles in UI

## What You'll Need to Provide
- **Apple Push Notification key** (.p8 file) from [Apple Developer → Keys](https://developer.apple.com/account/resources/authkeys/list) — plus the Key ID and Team ID
- **Twilio account** credentials from [twilio.com/console](https://www.twilio.com/console) — Account SID, Auth Token, and a purchased phone number

## TestFlight Notes
After implementation, when you `git pull` and run `npx cap sync`, the push notification capability will be active. In Xcode, ensure:
- **Signing & Capabilities** → add "Push Notifications" capability
- **Signing & Capabilities** → add "Background Modes" → check "Remote notifications"
- Use a **real device** (push doesn't work on simulator)

