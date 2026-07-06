# EMIS Inspection System: Android Native Compilation Guide

This guide details how to build and deploy the **EMIS Inspection System** as a native **Android APK (Supporting Android 10 and above)**. 

Since the development workspace operates in a cloud container running Node.js, compiling a native `.apk` binary requires an environment with the Android SDK and Gradle (such as Android Studio on your local machine, or a cloud CI/CD pipeline). This codebase is pre-integrated with **CapacitorJS**, the industry standard for wrapping high-performance React/Vite single-page applications into high-efficiency native Android apps.

---

## 🚀 Step-by-Step Native APK Build Pipeline

Follow these steps on your local development machine to generate the APK:

### 1. Prerequisite Installations
Ensure your local machine has the following tools installed:
- **Node.js** (v18 or v20)
- **Java Development Kit (JDK 17)** (Required for Gradle & Android 10+)
- **Android Studio** (Includes Android SDK, SDK Build-Tools, and Emulator)

### 2. Export & Clone Codebase
Download this project as a ZIP or push it to a GitHub repository from the top-right settings menu in AI Studio. Extract it locally and open your terminal in the root directory.

### 3. Install Dependencies
Run the package installation:
```bash
npm install
```

### 4. Build the Web Assets
Generate the production-ready optimized SPA bundle:
```bash
npm run build
```
This produces the compiled assets inside the `dist/` directory.

### 5. Initialize & Add the Android Platform
Run the Capacitor command to initialize the native Android project structures:
```bash
# Add the native Android container files (runs once)
npx cap add android
```
This creates a native Gradle-based Android project in the `/android` folder.

### 6. Synchronize Web Assets with Android Project
Whenever you change your React components, sync the compiled files into the native Android shell:
```bash
npm run cap:sync
```

### 7. Compile the Android APK (via Command Line or Android Studio)

#### Option A: Compile via Android Studio (Recommended)
1. Open Android Studio.
2. Select **Open an Existing Project** and choose the `android` folder in your project root directory.
3. Wait for Gradle to sync.
4. Go to the top menu: **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
5. Android Studio will compile the app and output the file at:
   `android/app/build/outputs/apk/debug/app-debug.apk`

#### Option B: Compile via Command Line (CLI)
You can compile the debug APK directly from your terminal using Gradle wrapper:
```bash
cd android
./gradlew assembleDebug
```
The compiled APK will be available in:
`app/build/outputs/apk/debug/app-debug.apk`

---

## 🛠️ Mobile Native Configuration (Android 10+)

We have pre-configured key parameters in `capacitor.config.json` and the code to ensure compatibility with Android 10+ devices used in oil fields and remote warehouses:

### 1. Camera Permissions (Barcode, QR, & Nameplate OCR)
To ensure the camera opens natively for scanning documents, barcodes, and nameplates, Capacitor requires permissions declared in the Android Manifest.

When you open the `android/app/src/main/AndroidManifest.xml` file, verify that the following permissions are inside the `<manifest>` tag:
```xml
<!-- Permissions required for Field Camera & Uploads -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"/>
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="28"/>
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
```

### 2. Offline Mode & Local Persistence
- **Local Storage**: The system uses a highly resilient IndexedDB local state engine (configured inside `/src/services/dbService.ts`) to cache materials ledger and activity logs.
- **Offline Writes**: When an inspector registers a material, adds comments, or registers a verification, the changes are stored locally first.
- **Background Auto-Sync**: The background service automatically checks network connections and performs continuous retries (`syncToBackend`) to update the cloud Firestore database once a cellular or Wi-Fi signal is detected.

### 3. Cleartext Traffic (For Development Sync)
For testing the app against a local Express server on your Wi-Fi network, cleartext traffic is enabled in `capacitor.config.json` with:
`"cleartext": true`
This allows standard HTTP synchronization during internal development cycles.

---

## 📱 Features Preloaded for Mobile Inspection
1. **Nameplate OCR Reader**: Integrates with the backend server via `/api/gemini/scan-nameplate` to read machine specification plates directly from camera snapshots.
2. **Interactive Signature Pad**: Allows on-site field engineers to draw signatures on screen using capacitive touch or styluses, saving signatures directly into the inspection ledger.
3. **Responsive Interface**: Re-engineered with fluid responsive containers (`max-w-7xl mx-auto`), flexible grids, and large tap areas (44px target sizes) to ease operational entry for users wearing protective industrial gloves.
