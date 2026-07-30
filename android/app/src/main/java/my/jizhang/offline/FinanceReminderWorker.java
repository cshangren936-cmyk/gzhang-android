package my.jizhang.offline;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import org.json.JSONArray;
import org.json.JSONObject;

public class FinanceReminderWorker extends Worker {
    private static final String CHANNEL_ID = "gzhang_finance_reminders";

    public FinanceReminderWorker(
        @NonNull Context context,
        @NonNull WorkerParameters params
    ) {
        super(context, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        Context context = getApplicationContext();
        SharedPreferences prefs = context.getSharedPreferences(
            FinanceReminderPlugin.PREFS,
            Context.MODE_PRIVATE
        );
        createChannel(context);
        try {
            JSONArray items = new JSONArray(
                prefs.getString(FinanceReminderPlugin.KEY_ITEMS, "[]")
            );
            LocalDate today = LocalDate.now();
            for (int index = 0; index < items.length(); index++) {
                JSONObject item = items.getJSONObject(index);
                LocalDate dueDate = LocalDate.parse(item.getString("dueDate"));
                long days = ChronoUnit.DAYS.between(today, dueDate);
                String kind = item.optString("kind", "due");
                int reminderDays = item.optInt("reminderDays", 30);
                boolean shouldNotify;
                if ("warranty".equals(kind)) {
                    shouldNotify =
                        days == reminderDays ||
                        days == 7 ||
                        days == 1 ||
                        days == 0;
                } else {
                    shouldNotify = days == 1 || days == 0 || days < 0;
                }
                if (!shouldNotify) continue;
                String id = item.optString("id", "item_" + index);
                String dedupeKey = "notified_" + id;
                if (today.toString().equals(prefs.getString(dedupeKey, ""))) {
                    continue;
                }
                postNotification(
                    context,
                    id.hashCode(),
                    item.optString("title", "G.账"),
                    item.optString("message", "")
                );
                prefs.edit().putString(dedupeKey, today.toString()).apply();
            }
            return Result.success();
        } catch (Exception error) {
            return Result.failure();
        }
    }

    private static void createChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "G.账提醒",
            NotificationManager.IMPORTANCE_DEFAULT
        );
        channel.setDescription("周期账目、分期与保修到期提醒");
        context
            .getSystemService(NotificationManager.class)
            .createNotificationChannel(channel);
    }

    private static void postNotification(
        Context context,
        int id,
        String title,
        String message
    ) {
        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            context,
            id,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        NotificationCompat.Builder builder = new NotificationCompat.Builder(
            context,
            CHANNEL_ID
        )
            .setSmallIcon(R.drawable.ic_stat_gzhang)
            .setContentTitle(title)
            .setContentText(message)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(message))
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT);
        try {
            NotificationManagerCompat.from(context).notify(id, builder.build());
        } catch (SecurityException ignored) {
            // The user can enable notifications later in Android settings.
        }
    }
}

