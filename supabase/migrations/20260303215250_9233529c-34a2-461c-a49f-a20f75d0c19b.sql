
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS task_completed_email boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS budget_alert_email boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS new_artist_email boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS daily_checkin_email boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS preferred_notification_time time NOT NULL DEFAULT '08:00:00';
