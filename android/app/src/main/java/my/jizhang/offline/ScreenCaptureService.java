package my.jizhang.offline;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.PixelFormat;
import android.hardware.display.DisplayManager;
import android.hardware.display.VirtualDisplay;
import android.media.Image;
import android.media.ImageReader;
import android.media.projection.MediaProjection;
import android.media.projection.MediaProjectionManager;
import android.os.Handler;
import android.os.HandlerThread;
import android.os.IBinder;
import android.util.Base64;
import android.util.DisplayMetrics;
import androidx.core.app.NotificationCompat;
import java.io.ByteArrayOutputStream;
import java.nio.ByteBuffer;

public class ScreenCaptureService extends Service {
    public static final String EXTRA_RESULT_CODE = "resultCode";
    public static final String EXTRA_RESULT_DATA = "resultData";
    private static final String CHANNEL = "gzhang_capture";
    private static final int NOTIFICATION_ID = 303;

    private HandlerThread workerThread;
    private Handler worker;
    private ImageReader imageReader;
    private VirtualDisplay virtualDisplay;
    private MediaProjection projection;
    private boolean handled;

    @Override
    public void onCreate() {
        super.onCreate();
        createChannel();
        startForeground(
            NOTIFICATION_ID,
            notification(getString(R.string.capture_running), false)
        );
        workerThread = new HandlerThread("GZhangCapture");
        workerThread.start();
        worker = new Handler(workerThread.getLooper());
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        int resultCode = intent.getIntExtra(EXTRA_RESULT_CODE, 0);
        Intent resultData = intent.getParcelableExtra(EXTRA_RESULT_DATA);
        if (resultData == null) {
            finishWithMessage(getString(R.string.capture_failed));
            return START_NOT_STICKY;
        }
        MediaProjectionManager manager =
            (MediaProjectionManager) getSystemService(Context.MEDIA_PROJECTION_SERVICE);
        projection = manager.getMediaProjection(resultCode, resultData);
        projection.registerCallback(new MediaProjection.Callback() {
            @Override
            public void onStop() {
                releaseCapture();
            }
        }, worker);

        DisplayMetrics metrics = getResources().getDisplayMetrics();
        int width = metrics.widthPixels;
        int height = metrics.heightPixels;
        int density = metrics.densityDpi;
        imageReader = ImageReader.newInstance(
            width,
            height,
            PixelFormat.RGBA_8888,
            2
        );
        imageReader.setOnImageAvailableListener(this::handleImage, worker);
        virtualDisplay = projection.createVirtualDisplay(
            "GZhangSmartCapture",
            width,
            height,
            density,
            DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
            imageReader.getSurface(),
            null,
            worker
        );
        return START_NOT_STICKY;
    }

    private void handleImage(ImageReader reader) {
        if (handled) return;
        Image image = reader.acquireLatestImage();
        if (image == null) return;
        handled = true;
        try {
            Image.Plane plane = image.getPlanes()[0];
            ByteBuffer buffer = plane.getBuffer();
            int pixelStride = plane.getPixelStride();
            int rowStride = plane.getRowStride();
            int rowPadding = rowStride - pixelStride * image.getWidth();
            Bitmap padded = Bitmap.createBitmap(
                image.getWidth() + rowPadding / pixelStride,
                image.getHeight(),
                Bitmap.Config.ARGB_8888
            );
            padded.copyPixelsFromBuffer(buffer);
            Bitmap bitmap = Bitmap.createBitmap(
                padded,
                0,
                0,
                image.getWidth(),
                image.getHeight()
            );
            padded.recycle();
            image.close();
            releaseCapture();
            ReceiptOcr.recognize(bitmap, new ReceiptOcr.Callback() {
                @Override
                public void onSuccess(String text) {
                    savePending(bitmap, text);
                    bitmap.recycle();
                    finishWithMessage(getString(R.string.capture_ready));
                }

                @Override
                public void onFailure(Exception error) {
                    bitmap.recycle();
                    finishWithMessage(getString(R.string.capture_failed));
                }
            });
        } catch (Exception error) {
            image.close();
            releaseCapture();
            finishWithMessage(getString(R.string.capture_failed));
        }
    }

    private void savePending(Bitmap bitmap, String text) {
        int targetWidth = Math.min(900, bitmap.getWidth());
        int targetHeight = Math.max(
            1,
            Math.round(bitmap.getHeight() * (targetWidth / (float) bitmap.getWidth()))
        );
        Bitmap preview = Bitmap.createScaledBitmap(
            bitmap,
            targetWidth,
            targetHeight,
            true
        );
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        preview.compress(Bitmap.CompressFormat.JPEG, 72, output);
        preview.recycle();
        String image = "data:image/jpeg;base64," + Base64.encodeToString(
            output.toByteArray(),
            Base64.NO_WRAP
        );
        SharedPreferences prefs = getSharedPreferences(
            SmartCapturePlugin.PREFS,
            Context.MODE_PRIVATE
        );
        prefs.edit()
            .putString(SmartCapturePlugin.KEY_TEXT, text)
            .putString(SmartCapturePlugin.KEY_IMAGE, image)
            .apply();
    }

    private Notification notification(String text, boolean ready) {
        Intent open = new Intent(this, MainActivity.class);
        open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this,
            303,
            open,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        return new NotificationCompat.Builder(this, CHANNEL)
            .setSmallIcon(R.drawable.ic_qs_capture)
            .setContentTitle(getString(R.string.app_name))
            .setContentText(text)
            .setOngoing(!ready)
            .setAutoCancel(ready)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build();
    }

    private void finishWithMessage(String text) {
        NotificationManager manager =
            (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        manager.notify(NOTIFICATION_ID, notification(text, true));
        stopForeground(false);
        stopSelf();
    }

    private void releaseCapture() {
        if (virtualDisplay != null) {
            virtualDisplay.release();
            virtualDisplay = null;
        }
        if (imageReader != null) {
            imageReader.close();
            imageReader = null;
        }
        if (projection != null) {
            MediaProjection activeProjection = projection;
            projection = null;
            activeProjection.stop();
        }
    }

    private void createChannel() {
        NotificationManager manager =
            (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        NotificationChannel channel = new NotificationChannel(
            CHANNEL,
            getString(R.string.capture_channel),
            NotificationManager.IMPORTANCE_LOW
        );
        manager.createNotificationChannel(channel);
    }

    @Override
    public void onDestroy() {
        releaseCapture();
        if (workerThread != null) workerThread.quitSafely();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
