package my.jizhang.offline;

import android.graphics.Bitmap;
import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.TextRecognizer;
import com.google.mlkit.vision.text.chinese.ChineseTextRecognizerOptions;

final class ReceiptOcr {
    interface Callback {
        void onSuccess(String text);
        void onFailure(Exception error);
    }

    private ReceiptOcr() {}

    static void recognize(Bitmap bitmap, Callback callback) {
        InputImage image = InputImage.fromBitmap(bitmap, 0);
        TextRecognizer recognizer = TextRecognition.getClient(
            new ChineseTextRecognizerOptions.Builder().build()
        );
        recognizer
            .process(image)
            .addOnSuccessListener(result -> {
                callback.onSuccess(result.getText());
                recognizer.close();
            })
            .addOnFailureListener(error -> {
                callback.onFailure(error);
                recognizer.close();
            });
    }
}
