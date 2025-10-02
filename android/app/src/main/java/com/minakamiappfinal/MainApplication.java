package com.minakamiappfinal;

import android.app.Application;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;
import com.facebook.react.PackageList;
import com.facebook.react.ReactApplication;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint;
import com.facebook.react.defaults.DefaultReactNativeHost;
import com.facebook.soloader.SoLoader;
import java.util.List;

public class MainApplication extends Application implements ReactApplication {

  private final ReactNativeHost mReactNativeHost =
      new DefaultReactNativeHost(this) {
        @Override
        public boolean getUseDeveloperSupport() {
          return BuildConfig.DEBUG;
        }

        @Override
        protected List<ReactPackage> getPackages() {
          @SuppressWarnings("UnnecessaryLocalVariable")
          List<ReactPackage> packages = new PackageList(this).getPackages();
          // Packages that cannot be autolinked yet can be added manually here, for example:
          // packages.add(new MyReactNativePackage());
          packages.add(new HealthConnectPackage()); // Health Connect native module
          return packages;
        }

        @Override
        protected String getJSMainModuleName() {
          return "index";
        }

        @Override
        protected boolean isNewArchEnabled() {
          return BuildConfig.IS_NEW_ARCHITECTURE_ENABLED;
        }

        @Override
        protected Boolean isHermesEnabled() {
          return BuildConfig.IS_HERMES_ENABLED;
        }
      };

  @Override
  public ReactNativeHost getReactNativeHost() {
    return mReactNativeHost;
  }

  @Override
  public void onCreate() {
    super.onCreate();
    SoLoader.init(this, /* native exopackage */ false);
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      // If you opted-in for the New Architecture, we load the native entry point for this app.
      DefaultNewArchitectureEntryPoint.load();
    }
    ReactNativeFlipper.initializeFlipper(this, getReactNativeHost().getReactInstanceManager());
    
    // Create notification channels for Android O+
    createNotificationChannels();
  }
  
  private void createNotificationChannels() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      NotificationManager notificationManager = getSystemService(NotificationManager.class);
      
      // Daily summary channel
      NotificationChannel dailyChannel = new NotificationChannel(
        "daily_summary",
        "Dagelijkse Samenvattingen",
        NotificationManager.IMPORTANCE_DEFAULT
      );
      dailyChannel.setDescription("Ontvang dagelijkse samenvattingen van je activiteiten");
      notificationManager.createNotificationChannel(dailyChannel);
      
      // Reminder channel
      NotificationChannel reminderChannel = new NotificationChannel(
        "reminders",
        "Herinneringen",
        NotificationManager.IMPORTANCE_HIGH
      );
      reminderChannel.setDescription("Herinneringen voor het bijhouden van je dag");
      notificationManager.createNotificationChannel(reminderChannel);
      
      // Activity alerts channel
      NotificationChannel activityChannel = new NotificationChannel(
        "activity_alerts",
        "Activiteit Waarschuwingen",
        NotificationManager.IMPORTANCE_DEFAULT
      );
      activityChannel.setDescription("Notificaties bij activiteit detectie");
      notificationManager.createNotificationChannel(activityChannel);
    }
  }
}
