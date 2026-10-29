ALTER TABLE "users"
ADD COLUMN "notification_channels" "NotificationChannel"[] NOT NULL
DEFAULT ARRAY['CABINET'::"NotificationChannel", 'SMS'::"NotificationChannel"];
