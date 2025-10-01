This is a new [**React Native**](https://reactnative.dev) project, bootstrapped using [`@react-native-community/cli`](https://github.com/react-native-community/cli).

# Getting Started

>**Note**: Make sure you have completed the [React Native - Environment Setup](https://reactnative.dev/docs/environment-setup) instructions till "Creating a new application" step, before proceeding.

## Step 1: Start the Metro Server

First, you will need to start **Metro**, the JavaScript _bundler_ that ships _with_ React Native.

To start Metro, run the following command from the _root_ of your React Native project:

```bash
# using npm
npm start

# OR using Yarn
yarn start
```

## Step 2: Start your Application

Let Metro Bundler run in its _own_ terminal. Open a _new_ terminal from the _root_ of your React Native project. Run the following command to start your _Android_ or _iOS_ app:

### For Android

```bash
# using npm
npm run android

# OR using Yarn
yarn android
```

### For iOS

```bash
# using npm
npm run ios

# OR using Yarn
yarn ios
```

If everything is set up _correctly_, you should see your new app running in your _Android Emulator_ or _iOS Simulator_ shortly provided you have set up your emulator/simulator correctly.

This is one way to run your app — you can also run it directly from within Android Studio and Xcode respectively.

## Step 3: Modifying your App

Now that you have successfully run the app, let's modify it.

1. Open `App.tsx` in your text editor of choice and edit some lines.
2. For **Android**: Press the <kbd>R</kbd> key twice or select **"Reload"** from the **Developer Menu** (<kbd>Ctrl</kbd> + <kbd>M</kbd> (on Window and Linux) or <kbd>Cmd ⌘</kbd> + <kbd>M</kbd> (on macOS)) to see your changes!

   For **iOS**: Hit <kbd>Cmd ⌘</kbd> + <kbd>R</kbd> in your iOS Simulator to reload the app and see your changes!

## Congratulations! :tada:

You've successfully run and modified your React Native App. :partying_face:

### Now what?

- If you want to add this new React Native code to an existing application, check out the [Integration guide](https://reactnative.dev/docs/integration-with-existing-apps).
- If you're curious to learn more about React Native, check out the [Introduction to React Native](https://reactnative.dev/docs/getting-started).

# Troubleshooting

If you can't get this to work, see the [Troubleshooting](https://reactnative.dev/docs/troubleshooting) page.

# MinakamiApp - Personal Life Tracking & AI Insights

Enterprise-level personal tracking app with AI-powered narrative generation, comprehensive data collection, and intelligent insights.

## 🚀 Features

- **AI Narrative Summaries** - WebLLM-powered daily life narratives
- **Complete Activity Tracking** - Real-time sensor data, location, fitness
- **Call Log Analysis** - Contact patterns and communication insights  
- **App Usage Monitoring** - Digital habits tracking
- **Strava Integration** - Sports and fitness data sync
- **OAuth Authentication** - Secure user authentication system
- **SQLite Database** - Local data storage with comprehensive schema
- **Performance Optimized** - Efficient data processing and caching

## 🛠 Technical Stack

- **React Native 0.72.15** - Cross-platform mobile development
- **react-native-sqlite-2** - Database management (90% less frustration than sqlite-storage!)
- **AppContext.js** - Central state management system
- **WebLLMBridge** - AI narrative generation
- **Expo Sensors** - Real-time accelerometer, gyroscope tracking
- **expo-location** - GPS and location services
- **Java 17** - Android build compatibility

## 🔧 Build Requirements

- **Java 17** (required for Android builds)
- **Android SDK 34** 
- **Node.js ≥16**
- **React Native CLI**

## 📦 Key Dependencies

- `react-native-screens: 3.17.0` (pinned for Kotlin compatibility)
- `react-native-gesture-handler: 2.6.0`
- `react-native-sqlite-2: ^3.2.1`
- `expo-location: ^16.1.0`
- `expo-sensors: ^12.4.0`

## 🔨 Build Instructions

```bash
# Install dependencies
npm install

# Set Java 17 (required for Android)
export JAVA_HOME=$(/opt/homebrew/bin/brew --prefix openjdk@17)/libexec/openjdk.jdk/Contents/Home

# Run on Android
npm run android

# Run on iOS  
npm run ios
```

## 🩹 Patches & Compatibility

This project uses **patch-package** to maintain compatibility:

### react-native-screens Kotlin Nullability Fix

**Issue**: Canvas? nullability conflict in ScreenStack.kt:310
**Solution**: Safe cast using `op.canvas?.let { canvas ->` pattern
**File**: `patches/react-native-screens+3.17.0.patch`

```kotlin
// Before (causes compilation error)
super.drawChild(op.canvas, op.child, op.drawingTime)

// After (safe nullability handling) 
op.canvas?.let { canvas ->
    super.drawChild(canvas, op.child, op.drawingTime)
}
```

**Installation**: Patches are automatically applied via `postinstall` script.

## 🎯 Production Ready Features

✅ Complete enterprise architecture with 20+ services  
✅ Kotlin 1.7 compatibility with forced dependency resolution  
✅ DEX compilation optimization with multidex support  
✅ Performance indexes for database queries  
✅ Error handling and logging throughout  
✅ Secure authentication and data encryption  
✅ Cross-platform compatibility (Android/iOS)  

## 📱 Navigation & Screens

- **Dashboard** - Real-time activity overview and AI insights
- **Journal** - Daily narrative summaries and reflections  
- **Stats** - Comprehensive analytics and trends
- **Settings** - App configuration and AI preferences
- **Data Import** - External data source integration

## 🔒 Security & Privacy

- Local SQLite storage (data stays on device)
- Encrypted sensitive data storage
- OAuth secure authentication
- No unauthorized data transmission
- User-controlled data export/import

# Learn More

To learn more about React Native, take a look at the following resources:

- [React Native Website](https://reactnative.dev) - learn more about React Native.
- [Getting Started](https://reactnative.dev/docs/environment-setup) - an **overview** of React Native and how setup your environment.
- [Learn the Basics](https://reactnative.dev/docs/getting-started) - a **guided tour** of the React Native **basics**.
- [Blog](https://reactnative.dev/blog) - read the latest official React Native **Blog** posts.
- [`@facebook/react-native`](https://github.com/facebook/react-native) - the Open Source; GitHub **repository** for React Native.
