# Unity Cloud Build Documentation

This repository provides comprehensive guides for setting up a robust cloud build pipeline for your Unity projects using GitHub Actions.

## 📋 Quick Navigation Guide

**🎯 What are you looking for?**

| 📋 **Prerequisites** | 🤖 **Android Builds** | 🍎 **IOS Builds** | ⚙️ **Automation** | 🔧 **Issues & Solutions** |
|----------------------|----------------------|------------------|-------------------|---------------------------|
| [**Prerequisites ⚠️**](./docs/prerequisites.md) | [**APK → Google Drive**](./docs/Android.md)       | [**IPA → TestFlight**](./docs/IOS.md)         | [**GitHub Actions**](#-github-actions-workflows) | [**Issues & Solutions**](./docs/Issues_and_Solutions.md) |
| [**Both Platforms**](#-platform-specific-guides) | [**AAB → Play Store**](./docs/Android.md)         | [**IOS APNS Code Signing**](./docs/IOS_APNS_CODE_SIGNING.md)             | [**Build Scripts**](#️-scripts--tools) |  |


**📍 Jump to the section you need:**

### **🚀 NEW TO THIS? START HERE**
- [**📚 Learn GitHub Actions (Optional)**](#-learn-github-actions-optional) - Watch a beginner-friendly intro video
- [**⚡ Quick Start Guide**](#-quick-start-guide) - Complete step-by-step setup walkthrough
- [**✅ Setup Checklist**](#-setup-checklist-get-your-builds-working) - Essential items needed before building

### **📋 PREREQUISITES FIRST**
- [**📋 Prerequisites Setup**](./docs/prerequisites.md) - ⚠️ **REQUIRED FIRST** - Common setup for both platforms

### **📱 PLATFORM-SPECIFIC GUIDES**
- [**🤖 Android Builds**](./docs/Android.md) - Build APK (Google Drive) or AAB (Play Store)
- [**🍎 IOS Builds**](./docs/IOS.md) - Build IPA and deploy to TestFlight

### **⚙️ WORKFLOWS & AUTOMATION**
- [**🔄 GitHub Actions Workflows**](#-github-actions-workflows) - Download and customize automation files
  - [Build Controller](#11-build-controller-workflow) - Run multiple platforms from one workflow
  - [Individual Workflows](#12-individual-platform-workflows) - Platform-specific automation
- [**🛠️ Scripts & Tools**](#️-scripts--tools) - Code, configuration files, and resources

## 🔄 GitHub Actions Workflows

Download and customize these workflow files for your CI/CD pipeline:

### **[📁 Download All Workflows](.github/workflows/)**

#### **1.1. Build Controller Workflow**
**[📥 Download main-controller.yml](.github/workflows/main-controller.yml)**

Use the Build Controller to run multiple builds from one place.

**Available Options:**
- `run_android_aab_store`: Build AAB and upload to Google Play Store
- `run_android_apk_gdrive`: Build APK and upload to Google Drive
- `run_ios_ipa_testflight`: Build IOS IPA and upload to TestFlight
- `ios_upload_artifact`: Upload IOS build artifacts

#### **1.2. Individual Platform Workflows**
- **[📥 Android AAB Store](.github/workflows/android-aab-store.yml)** - Build AAB & upload to Google Play Store
- **[📥 Android APK Drive](.github/workflows/android-apk-gdrive.yml)** - Build APK & upload to Google Drive
- **[📥 IOS TestFlight](.github/workflows/ios-ipa-testflight.yml)** - Build IOS IPA & upload to TestFlight

### **Workflow Usage:**
1. **Download** the workflow files you need
2. **Customize** them for your project (update package names, paths, etc.)
3. **Place** them in your `.github/workflows/` directory
4. **Configure** the required secrets in your repository
5. **Trigger** builds via GitHub Actions UI or automatically

---

## 🚀 Quick Start Guide

**Follow these steps to get your Unity cloud builds running:**

### **📹 Learn GitHub Actions (Optional)**
If you're new to GitHub Actions, watch this beginner-friendly introduction:
**[🎬 GitHub Actions for Absolute Beginners](https://www.youtube.com/watch?v=mFFXuXjVgkU)**

*Great foundation video to understand GitHub Actions basics before setting up your Unity builds.*

### **Step 1: Prerequisites Setup** 📋
**⚠️ IMPORTANT: Complete this FIRST before choosing your platform!**

Complete the **[Prerequisites Setup Guide](./docs/prerequisites.md)** - this is required for both Android and IOS:
- Set up core configuration files (`VersioningSettings.json`)
- Configure `WhatsNew` directory for localized release notes (located in `docs/CloudBuild/WhatsNew/`)
- Prepare build controller for multi-platform orchestration

### **Step 2: Choose Your Platform** 🤖

**🎯 Select your target platform:**

#### **🤖 ANDROID BUILDS**
> Build APK files (Google Drive) or AAB bundles (Play Store)
>
> **[📱 Open Android Build Guide](./docs/Android.md)** ← Click here for Android setup

#### **🍎 IOS BUILDS**
> Build IPA files and deploy to TestFlight
>
> **[📱 Open IOS Build Guide](./docs/IOS.md)** ← Click here for IOS setup

### **Step 3: Run Your Builds** ▶️
Choose from the workflows above:
- **Build Controller** - Run multiple platforms from one workflow
- **Individual Workflows** - Platform-specific automation

### **📖 Detailed Documentation**
All setup guides and reference materials:
- **[Prerequisites Setup](./docs/prerequisites.md)** - Complete setup requirements
- **[Android Guide](./docs/Android.md)** - Detailed Android deployment steps
- **[IOS Guide](./docs/IOS.md)** - Detailed IOS deployment steps

## ✅ **Setup Checklist: Get Your Builds Working**

**✨ Before you run your first build, let's make sure everything is ready!**

### **📋 Quick Setup Check**
Make sure you have these files in place:
- ✅ `VersioningSettings.json` in your project root
- ✅ `CustomBuildProcessor.cs` in `Assets/Editor/` folder
- ✅ `WhatsNew` folder with at least one release notes file (located in `docs/CloudBuild/WhatsNew/`)
- ✅ Build workflow files in `.github/workflows/`

### **🔧 Update Project Settings**

#### **1. CustomBuildProcessor.cs**
**Location**: `Assets/Editor/CustomBuildProcessor.cs`

Replace these placeholder values with your real ones:
- 🔑 `YOUR_ANDROID_KEYSTORE_PASSWORD` → Your Android keystore password
- 🔑 `YOUR_ANDROID_KEY_ALIAS_PASSWORD` → Your Android key alias password
- 📱 `YOUR_IOS_BUNDLE_IDENTIFIER` → Your app's bundle ID (like `com.yourcompany.yourapp`)

#### **2. IOSCodeSigningProcessor.cs** (IOS only)
**Location**: `Assets/Editor/IOSCodeSigningProcessor.cs`

Update these Apple-specific values:
- 🎯 `YOUR_PROVISIONING_PROFILE_UUID` → Your provisioning profile UUID
- 👥 `YOUR_TEAM_ID` → Your Apple Developer Team ID

#### **3. Documentation Examples**
**Files**: `docs/Android.md`, `docs/IOS.md`

Replace example values with your real ones:
- 📦 `com.CompanyName.AppName` → Your actual app identifier
- 👥 `YOUR_TEAM_ID` → Your Apple Developer Team ID

### **🎮 Platform Setup**
- **Android**: Set your package name in Unity Player Settings and configure your keystore
- **IOS**: Make sure your bundle ID matches your App Store Connect app

### **🔍 Need Help Finding Values?**
- **Android**: Check your keystore file and Unity Player Settings
- **IOS**: Look in Apple Developer Console under Account > Membership
- **Bundle IDs**: Must exactly match your store listings

## 🛠️ Scripts & Tools

### **🔧 Core Scripts**
- **[CustomBuildProcessor.cs](./docs/scripts/CustomBuildProcessor.cs)** - Unity Editor script for automated versioning and build processing
- **[IOSCodeSigningProcessor.cs](./docs/scripts/IOSCodeSigningProcessor.cs)** - iOS code signing processor for notification service extensions
- **[VersionInfo.cs](./docs/scripts/VersionInfo.cs)** - Shared version information structure for build-time and runtime use
- **[VersionText.cs](./docs/scripts/VersionText.cs)** - Runtime script to display version information in the UI

### **⚙️ Configuration Files**
- **[VersioningSettings.json](./docs/CloudBuild/VersioningSettings.json)** - Main configuration file for build versioning and settings
- **[StoreData.txt](./misc/StoreData.txt)** - Store-specific data and configuration

### **📝 Release Notes**
- **[whatsnew-en-US](./docs/CloudBuild/WhatsNew/whatsnew-en-US)** - English release notes template
- **[whatsnew-ar](./docs/CloudBuild/WhatsNew/whatsnew-ar)** - Arabic release notes template
- **[WhatsNew Directory](./docs/CloudBuild/WhatsNew/)** - All localized release notes

### **🔄 GitHub Actions Workflows**
- **[Build Controller](./.github/workflows/main-controller.yml)** - Multi-platform build orchestration
- **[Android AAB Store](./.github/workflows/android-aab-store.yml)** - Android App Bundle to Play Store
- **[Android APK Drive](./.github/workflows/android-apk-gdrive.yml)** - Android APK to Google Drive
- **[IOS TestFlight](./.github/workflows/ios-ipa-testflight.yml)** - IOS IPA to TestFlight
- **[All Workflows](./.github/workflows/)** - Complete workflow collection