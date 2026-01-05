---
slug: /
sidebar_position: 1
title: Introduction
---

# Unity Cloud Build Documentation

This repository provides comprehensive guides for setting up a robust cloud build pipeline for your Unity projects using GitHub Actions.

## 🚀 Quick Start Guide

**Follow these steps to get your Unity cloud builds running:**

### **📹 Learn GitHub Actions (Optional)**
If you're new to GitHub Actions, watch this beginner-friendly introduction:
**[🎬 GitHub Actions for Absolute Beginners](https://www.youtube.com/watch?v=mFFXuXjVgkU)**

*Great foundation video to understand GitHub Actions basics before setting up your Unity builds.*

### **Step 1: Prerequisites Setup** 📋
**⚠️ IMPORTANT: Complete this FIRST before choosing your platform!**

Complete the **[Prerequisites Setup Guide](prerequisites.md)** - this is required for both Android and IOS:
- Set up core configuration files (`VersioningSettings.json`)
- Configure `WhatsNew` directory for localized release notes (located in `docs/CloudBuild/WhatsNew/`)
- Prepare build controller for multi-platform orchestration

### **Step 2: Choose Your Platform** 🤖

**🎯 Select your target platform:**

#### **🤖 ANDROID BUILDS**
> Build APK files (Google Drive) or AAB bundles (Play Store)
>
> **[📱 Open Android Build Guide](../platforms/android/index.md)** ← Click here for Android setup

#### **🍎 IOS BUILDS**
> Build IPA files and deploy to TestFlight
>
> **[📱 Open IOS Build Guide](../platforms/ios/index.md)** ← Click here for IOS setup

### **Step 3: Run Your Builds** ▶️
Choose from the workflows above:
- **Build Controller** - Run multiple platforms from one workflow
- **Individual Workflows** - Platform-specific automation

### **📖 Detailed Documentation**
All setup guides and reference materials:
- **[Prerequisites Setup](prerequisites)** - Complete setup requirements
- **[Android Guide](../platforms/android/index.md)** - Detailed Android deployment steps
- **[IOS Guide](../platforms/ios/index.md)** - Detailed IOS deployment steps

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
