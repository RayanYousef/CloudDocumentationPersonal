---
slug: /
sidebar_position: 1
title: Introduction
---

# Unity Cloud Build Documentation

This repository provides comprehensive guides for setting up a robust cloud build pipeline for your Unity projects using GitHub Actions.

## 📋 Quick Navigation Guide

**🎯 What are you looking for?**

| 📋 **Prerequisites** | 🤖 **Android Builds** | 🍎 **IOS Builds** | ⚙️ **Automation** | 🔧 **Issues & Solutions** |
|----------------------|----------------------|------------------|-------------------|---------------------------|
| [**Prerequisites ⚠️**](prerequisites) | [**APK → Google Drive**](platforms/Android)       | [**IPA → TestFlight**](platforms/IOS)         | **GitHub Actions** | [**Issues & Solutions**](troubleshooting/Issues_and_Solutions) |
| [**Both Platforms**](#-platform-specific-guides) | [**AAB → Play Store**](platforms/Android)         | [**IOS APNS Code Signing**](platforms/IOS_APNS_CODE_SIGNING)             | [**Build Scripts**](#️-scripts--tools) |  |


**📍 Jump to the section you need:**

### **🚀 NEW TO THIS? START HERE**
- [**📚 Learn GitHub Actions (Optional)**](#-learn-github-actions-optional) - Watch a beginner-friendly intro video
- [**⚡ Quick Start Guide**](#-quick-start-guide) - Complete step-by-step setup walkthrough
- [**✅ Setup Checklist**](#-setup-checklist-get-your-builds-working) - Essential items needed before building

### **📋 PREREQUISITES FIRST**
- [**📋 Prerequisites Setup**](prerequisites) - ⚠️ **REQUIRED FIRST** - Common setup for both platforms

### **📱 PLATFORM-SPECIFIC GUIDES**
- [**🤖 Android Builds**](platforms/Android) - Build APK (Google Drive) or AAB (Play Store)
- [**🍎 IOS Builds**](platforms/IOS) - Build IPA and deploy to TestFlight

### **⚙️ WORKFLOWS & AUTOMATION**
- **🔄 GitHub Actions Workflows** - Download and customize automation files
  - [Build Controller](#11-build-controller-workflow) - Run multiple platforms from one workflow
  - [Individual Workflows](#12-individual-platform-workflows) - Platform-specific automation
- [**🛠️ Scripts & Tools**](#️-scripts--tools) - Code, configuration files, and resources

## 🔄 GitHub Actions Workflows

Download and customize these workflow files for your CI/CD pipeline:

### **[📁 Download All Workflows](reference/workflows)**

#### **1.1. Build Controller Workflow**
**[📥 Download main-controller.yml](reference/workflows#main-controller)**

Use the Build Controller to run multiple builds from one place.

**Available Options:**
- `run_android_aab_store`: Build AAB and upload to Google Play Store
- `run_android_apk_gdrive`: Build APK and upload to Google Drive
- `run_ios_ipa_testflight`: Build IOS IPA and upload to TestFlight
- `ios_upload_artifact`: Upload IOS build artifacts

#### **1.2. Individual Platform Workflows**
- **[📥 Android AAB Store](reference/workflows#android-aab-store)** - Build AAB & upload to Google Play Store
- **[📥 Android APK Drive](reference/workflows#android-apk-drive)** - Build APK & upload to Google Drive
- **[📥 IOS TestFlight](reference/workflows#ios-ipa-testflight)** - Build IOS IPA & upload to TestFlight

### **Workflow Usage:**
1. **Download** the workflow files you need
2. **Customize** them for your project (update package names, paths, etc.)
3. **Place** them in your `reference/workflows` directory
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

Complete the **[Prerequisites Setup Guide](prerequisites)** - this is required for both Android and IOS:
- Set up core configuration files (`VersioningSettings.json`)
- Configure `WhatsNew` directory for localized release notes (located in `docs/CloudBuild/WhatsNew/`)
- Prepare build controller for multi-platform orchestration

### **Step 2: Choose Your Platform** 🤖

**🎯 Select your target platform:**

#### **🤖 ANDROID BUILDS**
> Build APK files (Google Drive) or AAB bundles (Play Store)
>
> **[📱 Open Android Build Guide](platforms/Android)** ← Click here for Android setup

#### **🍎 IOS BUILDS**
> Build IPA files and deploy to TestFlight
>
> **[📱 Open IOS Build Guide](platforms/IOS)** ← Click here for IOS setup

### **Step 3: Run Your Builds** ▶️
Choose from the workflows above:
- **Build Controller** - Run multiple platforms from one workflow
- **Individual Workflows** - Platform-specific automation

### **📖 Detailed Documentation**
All setup guides and reference materials:
- **[Prerequisites Setup](prerequisites)** - Complete setup requirements
- **[Android Guide](platforms/Android)** - Detailed Android deployment steps
- **[IOS Guide](platforms/IOS)** - Detailed IOS deployment steps

## ✅ **Setup Checklist: Get Your Builds Working**

**✨ Before you run your first build, let's make sure everything is ready!**

### **📋 Quick Setup Check**
Make sure you have these files in place:
- ✅ `VersioningSettings.json` in your project root
- ✅ `CustomBuildProcessor.cs` in `Assets/Editor/` folder
- ✅ `WhatsNew` folder with at least one release notes file (located in `docs/CloudBuild/WhatsNew/`)
- ✅ Build workflow files in `reference/workflows`

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
**Files**: `platforms/Android`, `platforms/IOS`

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
- **[CustomBuildProcessor.cs](reference/scripts#custombuildprocessorcs)** - Unity Editor script for automated versioning and build processing
- **[IOSCodeSigningProcessor.cs](reference/scripts#ioscodesigningprocessorcs)** - iOS code signing processor for notification service extensions
- **[VersionInfo.cs](reference/scripts#versioninfocs)** - Shared version information structure for build-time and runtime use
- **[VersionText.cs](reference/scripts#versiontextcs)** - Runtime script to display version information in the UI

### **⚙️ Configuration Files**
- **[VersioningSettings.json](https://github.com/repository/blob/main/docs/CloudBuild/VersioningSettings.json)** - Main configuration file for build versioning and settings
- **[StoreData.txt](https://github.com/repository/blob/main/misc/StoreData.txt)** - Store-specific data and configuration

### **📝 Release Notes**
- **[whatsnew-en-US](https://github.com/repository/blob/main/docs/CloudBuild/WhatsNew/whatsnew-en-US)** - English release notes template
- **[whatsnew-ar](https://github.com/repository/blob/main/docs/CloudBuild/WhatsNew/whatsnew-ar)** - Arabic release notes template
- **[WhatsNew Directory](https://github.com/repository/tree/main/docs/CloudBuild/WhatsNew/)** - All localized release notes

### **🔄 GitHub Actions Workflows**
- **[Build Controller](./reference/workflows#main-controller)** - Multi-platform build orchestration
- **[Android AAB Store](./reference/workflows#android-aab-store)** - Android App Bundle to Play Store
- **[Android APK Drive](./reference/workflows#android-apk-drive)** - Android APK to Google Drive
- **[IOS TestFlight](./reference/workflows#ios-ipa-testflight)** - IOS IPA to TestFlight
- **[All Workflows](./reference/workflows)** - Complete workflow collection