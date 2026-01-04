# Android Build Guide

This guide provides comprehensive instructions for setting up a robust cloud build pipeline for your Unity projects using GitHub Actions to build for Android and deploy to the Google Play Store.

## 📋 Table of Contents

### 🔧 **Setup & Configuration**
- [**Prerequisites**](#prerequisites)
  - 🔐 [Required GitHub Secrets](#required-github-secrets)
  - 🎮 [Unity License Activation](#1-unity-license-activation)
  - ☁️ [Google Cloud Console Setup](#2-google-cloud-console-setup)
    - 📁 [Create Google Cloud Project](#create-google-cloud-project)
    - 🔑 [Create Service Account](#create-service-account)

### 🛠️ **Unity & Platform Setup**
- [**Step 1: Unity Project Configuration**](#step-1-unity-project-configuration)
  - 📦 [Package Name](#11-package-name)
  - 🔐 [Keystore](#12-keystore)
- [**Step 2: Google Play Console Setup**](#step-2-google-play-console-setup)
  - 👥 [Grant Permissions](#21-grant-permissions)
- [**Step 3: Android-Specific Setup**](#step-3-android-specific-setup)



### ⚠️ **Important Notes**
- [**Important Notes**](#important-notes)

## Prerequisites

### Required GitHub Secrets

Before proceeding, you must configure the following secrets in your GitHub repository. Go to **Settings > Secrets and variables > Actions** to add them:

| Secret Name | Description | Required For |
|-------------|-------------|--------------|
| `UNITY_LICENSE` | Complete .ulf license file content | Unity activation ([game-ci/unity-builder](https://github.com/game-ci/unity-builder)) |
| `UNITY_EMAIL` | Email address associated with your Unity account | Unity activation ([game-ci/unity-builder](https://github.com/game-ci/unity-builder)) |
| `UNITY_PASSWORD` | Password for your Unity account | Unity activation ([game-ci/unity-builder](https://github.com/game-ci/unity-builder)) |
| `ANDROID_KEYSTORE_PASS` | Password for your Android keystore | Android signing ([game-ci/unity-builder](https://github.com/game-ci/unity-builder)) |
| `ANDROID_KEYALIAS_PASS` | Password for your Android key alias | Android signing ([game-ci/unity-builder](https://github.com/game-ci/unity-builder)) |
| `SERVICE_ACCOUNT_JSON` | Plain JSON content of Google Cloud service account key | Play Store deployment ([r0adkll/upload-google-play](https://github.com/r0adkll/upload-google-play)) |
| `GOOGLE_SERVICE_ACCOUNT_CREDENTIALS` | **Base64 encoded** Google service account JSON | Google Drive upload ([Jumbo810/Upload_Github_Artifacts_TO_GDrive](https://github.com/Jumbo810/Upload_Github_Artifacts_TO_GDrive)) |
| `DISCORD_WEBHOOK_SKREW` | Discord webhook URL for build notifications | Build notifications ([nobrayner/discord-webhook](https://github.com/nobrayner/discord-webhook)) |

### 1. Unity License Activation

Follow these steps to set up your Unity license for CI/CD builds:

1. **Install Unity Hub**: Download and install Unity Hub on your local machine
2. **Log in to Unity Hub**: Use your Unity account credentials
3. **Activate License**: Navigate to `Unity Hub > Preferences > Licenses` and click `Add`
4. **Get License File**: Locate your `.ulf` file at:
   - **Windows**: `C:\ProgramData\Unity\Unity_lic.ulf`
   - **Mac**: `/Library/Application Support/Unity/Unity_lic.ulf`
   - **Linux**: `~/.local/share/unity3d/Unity/Unity_lic.ulf`

**📖 [Detailed Unity License Setup Guide](https://game.ci/docs/github/activation/#personal-license)**

**Note**: These credentials are used by [game-ci/unity-builder](https://github.com/game-ci/unity-builder) action for Unity license activation during the build process.

### 2. Google Cloud Console Setup

#### Create Google Cloud Project
1. Navigate to [Google Cloud Console](https://console.cloud.google.com/welcome?project=fresh-park-445109-b1)
2. Create a new project and name it after your application

#### Create Service Account
1. Go to [IAM & Admin > Service Accounts](https://console.cloud.google.com/iam-admin/iam)
2. Create a new service account with **Owner** permissions
3. Navigate to **Manage Keys > Create Key > JSON**
4. Download the JSON key file

















## Step 1: Unity Project Configuration

### 1.1. Package Name

⚠️ **Important**: The package name in the Play Store is determined by the package name of the very first build (AAB) uploaded to Google Play Store. Once set, it **cannot be changed**, so ensure it is correctly set in Unity Player Settings (e.g., `com.CompanyName.AppName`).

In Unity, go to **File > Build Settings > Player Settings** and set your **Package Name**.

### 1.2. Keystore

1. In **Player Settings > Publishing Settings**, open the **Keystore Manager**
2. Create a new keystore and save it securely outside your `Assets` folder
3. Note the passwords for the keystore and its alias
4. Add these passwords to your GitHub secrets as `ANDROID_KEYSTORE_PASS` and `ANDROID_KEYALIAS_PASS`

**Note**: These passwords are used by [game-ci/unity-builder](https://github.com/game-ci/unity-builder) for Android APK/AAB signing during the build process.

## Step 2: Google Play Console Setup

### 2.1. Grant Permissions

1. In the [Google Play Console](https://play.google.com/console/u/0/developers/users-and-permissions), go to **Users and permissions**
2. Invite the service account's email (created in the [Create Service Account](#create-service-account) section) and grant it **Admin** access
3. In your app's dashboard, go to **App integrity** and link your Google Cloud project

## Step 3: Android-Specific Setup

> **📋 Prerequisites**: Ensure you've completed the [Prerequisites Setup](../prerequisites) first, including `VersioningSettings.json`, `WhatsNew` directory (located in `docs/CloudBuild/WhatsNew/`), and `CustomBuildProcessor.cs` script.



## Important Notes

- **Package Name Permanence**: The package name set in your first Play Store upload cannot be changed
- **License Security**: GameCI does not store your Unity credentials or license files - they're only used during build activation

- **Service Account Permissions**: Ensure your service account has appropriate permissions:
  - For Play Store: Admin access in Google Play Console
  - For Google Drive: Editor access to the target folder
- **Build Branch**: By default, builds target the `main` branch (configurable in `VersioningSettings.json`)
- **Workflow Selection**: Use the Build Controller to choose your deployment targets:
  - Set `run_android_aab_store: true` → Google Play Store (requires Play Store setup)
  - Set `run_android_apk_gdrive: true` → Google Drive (requires Google Drive folder setup)
  - Both can run simultaneously for dual deployment
- **GitHub Actions Used**:
  - [Build Controller](../reference/workflows#main-controller) - Orchestrates multiple build workflows
  - [game-ci/unity-builder](https://github.com/game-ci/unity-builder) - Unity builds and signing
  - [r0adkll/upload-google-play](https://github.com/r0adkll/upload-google-play) - Play Store deployment
  - [Jumbo810/Upload_Github_Artifacts_TO_GDrive](https://github.com/Jumbo810/Upload_Github_Artifacts_TO_GDrive) - Google Drive upload
  - [nobrayner/discord-webhook](https://github.com/nobrayner/discord-webhook) - Build notifications
