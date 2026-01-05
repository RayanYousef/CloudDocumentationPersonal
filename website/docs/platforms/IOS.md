# iOS Build Guide

This guide provides comprehensive instructions for setting up a robust cloud build pipeline for your Unity projects using GitHub Actions to build for iOS and deploy to TestFlight.

## 📋 Table of Contents

### 🔧 **Setup & Configuration**
- [**Prerequisites**](#prerequisites)
  - 🔐 [Required GitHub Secrets](#required-github-secrets)
  - 🎮 [Unity License Activation](#1-unity-license-activation)
  - 🍎 [Apple Developer Program Setup](#2-apple-developer-program-setup)
    - 📋 [Apple Developer Prerequisites](#apple-developer-prerequisites)
    - 🔑 [Create Required Certificates and Provisioning Profiles](#create-required-certificates-and-provisioning-profiles)
      - 📜 [Apple Distribution Certificate]
      - 🔔 [APNS Certificate (for Push Notifications)]
      - 📱 [Provisioning Profile]
      - 📄 [Export Options Plist](#24-export-options-plist)
    - ⚙️ [iOS Code Signing Configuration](#3-ios-code-signing-configuration)
      - 🔧 [Required: Basic Code Signing Setup](#required-basic-code-signing-setup)
      - 🔧 [Optional: Advanced Code Signing Processor](#optional-advanced-code-signing-processor)
    - 🏪 [App Store Connect Setup](#4-app-store-connect-setup)
      - 🔑 [Generate API Key for CI/CD](#generate-api-key-for-cicd)
      - 📱 [App Store Connect App Setup](#app-store-connect-app-setup)

### 🛠️ **Unity & Platform Setup**
- [**Step 2: Unity Project Configuration**](#step-2-unity-project-configuration)
  - 📦 [Bundle Identifier](#11-bundle-identifier)
  - ⚙️ [iOS Specific Settings](#12-ios-specific-settings)
  - 🔐 [iOS Code Signing Configuration](#3-ios-code-signing-configuration)
- [**Step 3: iOS-Specific Setup**](#step-3-ios-specific-setup)
- [**Step 4: Xcode Configuration & Workflow (OPTIONAL)**](#step-4-xcode-configuration--workflow-optional-only-if-you-need-ios-182-features)
- [**Step 5: Advanced Workflows (AdMob / CocoaPods)**](#step-5-advanced-workflows-admob--cocoapods)



### ⚠️ **Important Notes & Support**
- [**Important Notes**](#important-notes)
- [**Troubleshooting**](#troubleshooting)
  - 🚨 [Common Issues](#common-issues)
  - 📁 [File Structure Requirements](#file-structure-requirements)

## Prerequisites

### Required GitHub Secrets

Before proceeding, you must configure the following secrets in your GitHub repository. Go to **Settings > Secrets and variables > Actions** to add them:

| Secret Name | Description | Required For |
|-------------|-------------|--------------|
| `UNITY_LICENSE` | Complete .ulf license file content | Unity activation ([game-ci/unity-builder](https://github.com/game-ci/unity-builder)) |
| `UNITY_EMAIL` | Email address associated with your Unity account | Unity activation ([game-ci/unity-builder](https://github.com/game-ci/unity-builder)) |
| `UNITY_PASSWORD` | Password for your Unity account | Unity activation ([game-ci/unity-builder](https://github.com/game-ci/unity-builder)) |
| `APNS_P12_PASSWORD` | See SignCode guide | See [SignCode](../platforms/IOS_APNS_CODE_SIGNING.md) |
| `APPLE_DISTRIBUTION_P12_PASSWORD` | See SignCode guide | See [SignCode](../platforms/IOS_APNS_CODE_SIGNING.md) |
| `APPSTORE_ISSUER_ID` | App Store Connect API issuer ID | TestFlight upload ([apple-actions/upload-testflight-build](https://github.com/apple-actions/upload-testflight-build)) |
| `APPSTORE_KEY_ID` | App Store Connect API key ID | TestFlight upload ([apple-actions/upload-testflight-build](https://github.com/apple-actions/upload-testflight-build)) |
| `APPSTORE_P8` | App Store Connect private key (.p8 file content) | TestFlight upload ([apple-actions/upload-testflight-build](https://github.com/apple-actions/upload-testflight-build)) |
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

### 2. Apple Developer Program Setup

#### Apple Developer Prerequisites
- **Apple Developer Program**: You must be enrolled in the Apple Developer Program ($99/year)
- **App Store Connect**: Access to App Store Connect for your app

#### Create Required Certificates and Provisioning Profiles

##### 2.1–2.3. Certificates and Profiles
Moved to the dedicated guide: see [SignCode](../platforms/IOS_APNS_CODE_SIGNING.md) for creating the Apple Distribution certificate, APNS certificate, and provisioning profiles used for signing.

##### 2.4. Export Options Plist
Create an export options plist file for TestFlight deployment:
- **Save as**: `CloudBuild/iOS/exportOptions.plist`

Example content:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>app-store</string>
    <key>teamID</key>
    <string>YOUR_TEAM_ID</string>
    <key>uploadBitcode</key>
    <false/>
    <key>uploadSymbols</key>
    <true/>
</dict>
</plist>
```

### 3. iOS Code Signing Configuration

#### Required: Basic Code Signing Setup

**⚠️ Required**: You must configure these settings in Unity Player Settings > iOS > Other Settings:

- Signing Team Id
- Disable Automatically Sign (if you want to pin a specific profile)
- Profile ID (Provisioning Profile UUID)
- Profile Type (e.g., Distribution)

![Unity Player Settings - iOS Code Signing Configuration](/CloudDocumentationPersonal/img/IOS_Identification.png)

*Configure the highlighted fields in Unity Player Settings for manual code signing*

Then commit and push your Unity `ProjectSettings` so CI uses them. If you prefer Unity's automatic signing, keep "Automatically Sign" enabled and make sure your Apple account, certificates, and profiles are available to the Xcode environment.

#### Optional: Advanced Code Signing Processor

The `IOSCodeSigningProcessor.cs` is an optional Unity editor script that automates manual code signing for iOS builds. **If you want to use a Notification Service Extension, you must use this processor.** If you prefer configuring signing in Xcode and do not use a notification service extension, you can skip it.

➡️ For setup steps, prerequisites, and troubleshooting, see: [iOS Code Signing Processor](../platforms/IOS_APNS_CODE_SIGNING.md)

### 4. App Store Connect Setup

#### Generate API Key for CI/CD
1. Go to [App Store Connect > Users and Access > Keys](https://appstoreconnect.apple.com/access/api)
2. Click "+" to generate a new API key
3. **Note the Issuer ID** - you'll need this for `APPSTORE_ISSUER_ID`
4. **Note the Key ID** - you'll need this for `APPSTORE_KEY_ID`
5. Download the private key (.p8 file)
6. **Copy the .p8 file content** - you'll need this for `APPSTORE_P8`

#### App Store Connect App Setup
1. Create your app in App Store Connect (if not already done)
2. **Important**: The bundle ID in Unity must match your App Store Connect app exactly
3. Enable TestFlight for your app



## Step 2: Unity Project Configuration

### 1.1. Bundle Identifier

⚠️ **Important**: The bundle identifier in Unity Player Settings must match your App Store Connect app exactly. Once set, it **cannot be changed** for App Store submissions.

In Unity, go to **File > Build Settings > Player Settings** and set your **Bundle Identifier** (e.g., `com.CompanyName.AppName`).

### 1.2. iOS Specific Settings

1. In **Player Settings > iOS**:
   - Set **Target minimum iOS Version** (recommended: iOS 12.0 or higher)
   - Configure **Device Orientation** as needed
   - Set **Architecture** (recommended: ARM64)

2. **Code Signing**: The workflow handles automatic code signing, but ensure:
   - Your provisioning profile matches the bundle identifier
   - Certificates are valid and not expired



## Step 3: iOS-Specific Setup

> **📋 Prerequisites**: Ensure you've completed the [Prerequisites Setup](../prerequisites) first, including `VersioningSettings.json`, `WhatsNew` directory (located in `docs/CloudBuild/WhatsNew/`), and `CustomBuildProcessor.cs` script. If you opt into code signing automation, follow [SignCode](../platforms/IOS_APNS_CODE_SIGNING.md) to add `IOSCodeSigningProcessor.cs`.

## Step 4: Xcode Configuration & Workflow (OPTIONAL: Only if you need iOS 18.2 features)

The workflow uses **Xcode 16.2** specifically. If you need a different Xcode version, update the workflow file:

```yaml
- name: Install iOS 18.2 Platform
  run: |
    echo "Installing iOS 18.2 platform..."
    sudo xcode-select -switch /Applications/Xcode_16.2.app  # Change version here
    xcodebuild -downloadPlatform iOS -buildVersion 18.2 || echo "Platform download failed or already exists"
```

## Step 5: Advanced Workflows (AdMob / CocoaPods)

If your project uses plugins like **AdMob**, **Firebase**, or **Facebook SDK** that rely on CocoaPods and the External Dependency Manager for Unity (EDM4U), you must use a modified workflow.

These plugins require building an `.xcworkspace` (Workspace) instead of the standard `.xcodeproj`.

➡️ **[Read the CocoaPods & Workspace Workflow Guide](../platforms/IOS_CocoaPods_Workflow.md)**

You can find the complete iOS TestFlight workflow [here](../reference/workflows#ios-ipa-testflight).



## Important Notes

- **Bundle ID Permanence**: The bundle ID set in your first TestFlight upload cannot be changed
- **Certificate Expiry**: Monitor your Apple certificates and provisioning profiles expiry dates
- **Xcode Version**: The workflow uses Xcode 16.2 - ensure compatibility with your Unity version
- **Provisioning Profiles**: The workflow copies profiles to multiple locations for compatibility
- **Code Signing**: If you use the optional processor, it runs in Unity's PostProcessBuild pipeline. See [SignCode](../platforms/IOS_APNS_CODE_SIGNING.md).
- **License Security**: GameCI does not store your Unity credentials or license files - they're only used during build activation

- **Build Branch**: By default, builds target the `main` branch (configurable in `VersioningSettings.json`)
- **Build Controller**: Use this for multi-platform builds - set `run_ios_ipa_testflight: true` to include iOS
- **GitHub Actions Used**:
  - [game-ci/unity-builder](https://github.com/game-ci/unity-builder) - Unity builds and license activation
  - [apple-actions/upload-testflight-build](https://github.com/apple-actions/upload-testflight-build) - TestFlight deployment
  - [nobrayner/discord-webhook](https://github.com/nobrayner/discord-webhook) - Build notifications

## Troubleshooting

### Common Issues:

1. **Code Signing Errors**: Verify your certificates and provisioning profiles are valid
2. **Provisioning Profile Issues**: Ensure the profile matches your bundle ID exactly
3. **TestFlight Upload Failures**: Check your App Store Connect API credentials
4. **Xcode Version Mismatch**: Ensure your Unity version is compatible with Xcode 16.2

### File Structure Requirements:
```
CloudBuild/
└── iOS/
    ├── Certificates/
    │   └── Apple_Distribution.p12
    ├── ProvisioningProfiles/
    │   └── *.mobileprovision
    └── exportOptions.plist

Assets/
└── Editor/
    └── CustomBuildProcessor.cs
```
