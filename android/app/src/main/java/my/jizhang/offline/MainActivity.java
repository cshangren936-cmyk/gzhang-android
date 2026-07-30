package my.jizhang.offline;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(SmartCapturePlugin.class);
        registerPlugin(FinanceReminderPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
