package com.minakamiappfinal;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;

/**
 * Health Connect Privacy Policy Activity
 * Shows privacy policy and permissions rationale for Health Connect integration
 */
public class HealthConnectPrivacyActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Create simple layout programmatically
        TextView textView = new TextView(this);
        textView.setText("MinakamiApp Health Connect Privacy Policy\n\n" +
                "MinakamiApp gebruikt Health Connect om uw gezondheidsdata veilig te lezen van Samsung Health.\n\n" +
                "Wat we doen met uw data:\n" +
                "• Lezen stappen, hartslag, en activiteit data\n" +
                "• Opslaan in lokale database voor uw dagelijkse verhalen\n" +
                "• Geen data wordt gedeeld met derden\n\n" +
                "Uw data blijft op uw toestel en onder uw controle.\n" +
                "U kunt toegang intrekken via Health Connect instellingen.");
        
        textView.setPadding(32, 32, 32, 32);
        textView.setTextSize(16);
        
        setContentView(textView);
        
        // Set result to indicate user saw the privacy policy
        setResult(RESULT_OK);
    }
}