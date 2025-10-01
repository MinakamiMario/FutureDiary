# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# React Native
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }

# React Navigation
-keep class com.th3rdwave.safeareacontext.** { *; }
-keep class com.swmansion.rnscreens.** { *; }

# Vector Icons
-keep class com.oblador.vectoricons.** { *; }

# SQLite Storage
-keep class org.pgsqlite.** { *; }
-keep class net.sqlcipher.** { *; }
-keep class net.sqlcipher.database.** { *; }

# AsyncStorage
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# Samsung Health SDK
-keep class com.samsung.android.sdk.healthdata.** { *; }
-keep class com.samsung.android.sdk.health.** { *; }

# Strava Integration (WebView)
-keep class * extends android.webkit.WebViewClient { *; }
-keep class * extends android.app.Activity { *; }

# Keep all React Native classes
-dontwarn com.facebook.react.**
-dontwarn com.facebook.hermes.**

# Keep native modules
-keepclassmembers class * implements com.facebook.react.bridge.NativeModule {
    public *;
}

# Keep React methods and props
-keepclassmembers class * {
    @com.facebook.react.bridge.ReactMethod <methods>;
    @com.facebook.react.bridge.ReactProp <fields>;
    @com.facebook.react.bridge.ReactPropGroup <fields>;
}

# Keep build config
-keep class com.minakamiappfinal.BuildConfig { *; }

# Keep JavaScript engine classes
-keep class **.js { *; }
-keep class **.jsx { *; }
-keep class **.ts { *; }
-keep class **.tsx { *; }

# Keep enum classes
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# Keep parcelable classes
-keep class * implements android.os.Parcelable {
    public static final android.os.Parcelable$Creator *;
}

# Remove logging in production
-assumenosideeffects class android.util.Log {
    public static boolean isLoggable(java.lang.String, int);
    public static int v(...);
    public static int d(...);
}

# Optimize for size
-dontwarn java.nio.file.*
-dontwarn org.codehaus.mojo.animal_sniffer.IgnoreJRERequirement
-dontwarn okio.**
-dontwarn javax.annotation.**

# Keep application class
-keep class com.minakamiappfinal.** { *; }

# WebView ProGuard rules for react-native-webview
-keep class com.reactnativecommunity.webview.** { *; }
-dontwarn com.reactnativecommunity.webview.**

# Keep WebView JavaScript interface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep WebView classes
-keep class androidx.webkit.** { *; }
-dontwarn androidx.webkit.**

# Keep browser classes
-keep class androidx.browser.** { *; }
-dontwarn androidx.browser.**
