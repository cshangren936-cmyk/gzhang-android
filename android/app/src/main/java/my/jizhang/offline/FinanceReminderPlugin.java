package my.jizhang.offline;

import android.Manifest;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import androidx.core.app.ActivityCompat;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.OneTimeWorkRequest;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import com.getcapacitor.JSArray;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.time.Duration;
import java.time.ZonedDateTime;
import java.util.concurrent.TimeUnit;

@CapacitorPlugin(name = "FinanceReminder")
public class FinanceReminderPlugin extends Plugin {
    static final String PREFS = "gzhang.finance.reminders";
    static final String KEY_ITEMS = "items";
    private static final String UNIQUE_WORK = "gzhang-daily-finance-reminders";

    @PluginMethod
    public void schedule(PluginCall call) {
        JSArray items = call.getArray("items", new JSArray());
        SharedPreferences prefs = getContext().getSharedPreferences(
            PREFS,
            Context.MODE_PRIVATE
        );
        prefs.edit().putString(KEY_ITEMS, items.toString()).apply();

        if (
            Build.VERSION.SDK_INT >= 33 &&
            ActivityCompat.checkSelfPermission(
                getContext(),
                Manifest.permission.POST_NOTIFICATIONS
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            ActivityCompat.requestPermissions(
                getActivity(),
                new String[] { Manifest.permission.POST_NOTIFICATIONS },
                2404
            );
        }

        ZonedDateTime now = ZonedDateTime.now();
        ZonedDateTime nextRun = now.withHour(9).withMinute(0).withSecond(0).withNano(0);
        if (!nextRun.isAfter(now)) nextRun = nextRun.plusDays(1);
        long initialDelayMinutes = Math.max(
            1,
            Duration.between(now, nextRun).toMinutes()
        );
        PeriodicWorkRequest periodic = new PeriodicWorkRequest.Builder(
            FinanceReminderWorker.class,
            24,
            TimeUnit.HOURS
        )
            .setInitialDelay(initialDelayMinutes, TimeUnit.MINUTES)
            .build();
        WorkManager.getInstance(getContext()).enqueueUniquePeriodicWork(
            UNIQUE_WORK,
            ExistingPeriodicWorkPolicy.UPDATE,
            periodic
        );
        WorkManager.getInstance(getContext()).enqueue(
            new OneTimeWorkRequest.Builder(FinanceReminderWorker.class).build()
        );
        call.resolve();
    }
}

