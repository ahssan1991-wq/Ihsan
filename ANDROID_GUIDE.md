# EMIS Engineering Material & Inspection System: Android Native APK Packaging Guide

This guide details all configuration adjustments and steps required to package the **EMIS Inspection System** into a production-grade native **Android APK** (supporting Android 10, 11, 12, 13, 14+).

---

## 📋 1. Project Configuration Overview

The application is pre-configured with **CapacitorJS 8**, bridging the React/Vite front-end to Android's native WebView environment with direct hardware capabilities (Camera, Local Storage, Biometrics/Touch).

### `capacitor.config.json`
```json
{
  "appId": "com.emis.inspection",
  "appName": "EMIS Inspection System",
  "webDir": "dist",
  "server": {
    "androidScheme": "https",
    "cleartext": true
  },
  "android": {
    "allowMixedContent": true,
    "captureInput": true,
    "backgroundColor": "#0b0f19"
  },
  "plugins": {
    "SplashScreen": {
      "launchShowDuration": 2000,
      "backgroundColor": "#0b0f19",
      "showSpinner": false
    }
  }
}
```

---

## 🛠️ 2. Step-by-Step APK Packaging Pipeline

### Step 1: Export Codebase to Your Local Machine
From AI Studio, click **Settings (⚙️)** > **Export to ZIP** (or push to GitHub), extract to a folder (e.g., `C:\EMIS-Inspection`).

### Step 2: Install Local Prerequisites
1. **Node.js** (v18 or v20 LTS): [nodejs.org](https://nodejs.org/)
2. **Android Studio** (includes Android SDK, Platform Tools, and JDK 17): [developer.android.com/studio](https://developer.android.com/studio)

### Step 3: Build Web Assets & Initialize Android Container
Open your terminal in the project root:

```bash
# 1. Install dependencies
npm install

# 2. Build the optimized web bundle
npm run build

# 3. Initialize native Android platform (runs once)
npx cap add android

# 4. Synchronize web assets into Android shell
npm run cap:sync
```

---

## 🔐 3. Android Manifest Configuration (`AndroidManifest.xml`)

Open `android/app/src/main/AndroidManifest.xml` and ensure the following permissions and hardware features are declared inside the `<manifest>` block:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.emis.inspection">

    <!-- Network & Sync Permissions -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <!-- Camera Permissions for Nameplate OCR & Document Scanning -->
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-feature android:name="android.hardware.camera" android:required="false" />
    <uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />

    <!-- Storage & File Upload Permissions -->
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="28" />
    <uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme"
        android:usesCleartextTraffic="true">

        <activity
            android:name=".MainActivity"
            android:label="@string/title_activity_main"
            android:theme="@style/AppTheme.NoActionBarLaunch"
            android:launchMode="singleTask"
            android:exported="true"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode">

            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
```

---

## 🎨 4. Icon Sets and Splash Screens

To generate native Android mipmap icon sets (`mipmap-hdpi`, `mipmap-mdpi`, `mipmap-xhdpi`, `mipmap-xxhdpi`, `mipmap-xxxhdpi`):

### Option A: Using Android Studio Asset Studio (Visual & Simple)
1. Open the `android` folder in **Android Studio**.
2. Right-click on the `app` folder in the project pane > **New > Image Asset**.
3. Under **Asset Type**, choose **Launcher Icons (Adaptive and Legacy)**.
4. Set **Source Asset > Path** to the provided `/public/icon-512.svg`.
5. Adjust background color to `#0B0F19` and click **Finish**.

### Option B: Automatic Generation via CLI
```bash
npx @capacitor/assets generate --android
```

---

## 💾 5. Offline Storage & Persistence Architecture

The app has built-in offline resilience:

1. **Storage Tier**: All material ledgers, logs, inspections, and user configurations are persisted using the browser's persistent `localStorage` and `IndexedDB` storage engines.
2. **Offline OCR & AI Fallback**: If an on-site engineer lacks cellular connection, the app uses an embedded heuristic parser to extract nameplate data without network latency.
3. **Queue & Auto-Sync**: When internet access is restored, the `dbService` triggers a synchronization loop with the Firestore and Cloud Run backend (`syncToBackend`).

---

## 📦 6. Compiling the Final `.apk` Binary

### Debug APK (For direct field device installation):
```bash
cd android
./gradlew assembleDebug
```
Output:
`android/app/build/outputs/apk/debug/app-debug.apk`

### Signed Release APK (For production deployment):
1. In Android Studio: **Build > Generate Signed Bundle / APK**.
2. Select **APK**, create or choose your keystore, and select **release**.
3. The resulting `.apk` is ready for direct installation on tablets and rugged field devices.

---

## ☁️ 7. Google Drive Vault & Google Sign-In in Android APK

### Why Web Popup (`signInWithPopup`) behaves differently in an APK:
Google applies a strict security policy (**Google Secure Browsers Policy / `disallowed_useragent`**) that blocks OAuth web popups inside embedded Android WebViews. 

### Solutions Available for Android:

#### 1. Instant Field Vault (No Google Cloud setup required - Recommended for Field Testing):
Click **"تشغيل الحاوية الميدانية / Field Storage Vault"** inside the app. This creates an isolated local storage vault directly on the device where you can upload, categorize, inspect, and export technical datasheets and inspection attachments offline.

#### 2. Native Google Sign-In via Google Cloud Console (For Live Google Drive in APK):
To enable direct Google Sign-In inside a compiled Android APK:
1. Go to **Google Cloud Console > Credentials**.
2. Create an **OAuth 2.0 Client ID** with Application type **Android**:
   - **Package Name**: `com.emis.inspection`
   - **SHA-1 Certificate Fingerprint**: Run `./gradlew signingReport` in your `android/` directory and copy the SHA-1 hash.
3. Install the Capacitor Google Auth plugin:
   ```bash
   npm install @codetrix-studio/capacitor-google-auth
   npx cap sync android
   ```
4. Or alternatively, open EMIS via the mobile Chrome browser as a PWA where Web OAuth works natively.

