package my.jizhang.offline;

import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "SmartCapture")
public class SmartCapturePlugin extends Plugin {
    static final String PREFS = "gzhang.smart.capture";
    static final String KEY_TEXT = "pending_text";
    static final String KEY_IMAGE = "pending_image";

    @PluginMethod
    public void recognizeImage(PluginCall call) {
        String dataUrl = call.getString("dataUrl", "");
        int comma = dataUrl.indexOf(',');
        String encoded = comma >= 0 ? dataUrl.substring(comma + 1) : dataUrl;
        try {
            byte[] bytes = Base64.decode(encoded, Base64.DEFAULT);
            Bitmap bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
            if (bitmap == null) {
                call.reject("Invalid image");
                return;
            }
            ReceiptOcr.recognize(bitmap, new ReceiptOcr.Callback() {
                @Override
                public void onSuccess(String text) {
                    JSObject result = new JSObject();
                    result.put("rawText", text);
                    call.resolve(result);
                    bitmap.recycle();
                }

                @Override
                public void onFailure(Exception error) {
                    call.reject("OCR failed", error);
                    bitmap.recycle();
                }
            });
        } catch (Exception error) {
            call.reject("Invalid image", error);
        }
    }

    @PluginMethod
    public void consumePendingCapture(PluginCall call) {
        SharedPreferences prefs = getContext().getSharedPreferences(
            PREFS,
            Context.MODE_PRIVATE
        );
        String text = prefs.getString(KEY_TEXT, "");
        String image = prefs.getString(KEY_IMAGE, "");
        JSObject result = new JSObject();
        result.put("available", !text.isEmpty());
        result.put("rawText", text);
        if (!image.isEmpty()) result.put("imageDataUrl", image);
        prefs.edit().remove(KEY_TEXT).remove(KEY_IMAGE).apply();
        call.resolve(result);
    }
}
