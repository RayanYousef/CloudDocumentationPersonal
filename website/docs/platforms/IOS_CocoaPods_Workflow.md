# iOS CocoaPods & Workspace Workflow

This guide documents the specific workflow configuration used in `ios-ipa-testflight.yml` to support iOS builds that require CocoaPods (e.g., for AdMob integration).

## 📋 Overview

The workflow differs from a standard Unity iOS build in one critical way: **it builds an `.xcworkspace` instead of an `.xcodeproj`**.

This is required because the External Dependency Manager for Unity (EDM4U) generates a `Podfile`, and running `pod install` creates a Workspace that links the Unity project with the native Pods (dependencies).

## ⚙️ Workflow Configuration

The following steps are taken from the active `ios-ipa-testflight.yml` workflow.

### 1. Plugin Cleanup
**Location:** `buildIOS` job

The workflow explicitly removes Android-specific plugins but **preserves the External Dependency Manager** so it can resolve iOS dependencies.

```yaml
      - name: Remove Android-specific plugins
        run: |
          rm -rf SkrewClient/Assets/Firebase
          rm -rf SkrewClient/Assets/Firebase.meta
          rm -rf SkrewClient/Assets/GooglePlayGames
          rm -rf SkrewClient/Assets/GooglePlayGames.meta
          # Note: ExternalDependencyManager is intentionally KEPT here
```

### 2. Pod Install
**Location:** `Mac-Xcode` job

Before building the Xcode project, the workflow installs the CocoaPods dependencies. This creates the `Unity-iPhone.xcworkspace`.

```yaml
      - name: Run Pod Install
        run: |
          cd build/iOS/Build_iOS_auto
          pod install
```

### 3. Build & Archive (Workspace)
**Location:** `Mac-Xcode` job

The build command is configured to use `-workspace` and point to `Unity-iPhone.xcworkspace`.

```yaml
      - name: sign and archive
        run: |
          sudo xcode-select -switch /Applications/Xcode_16.2.app
          # Code signing configuration is now handled automatically by Unity PostProcessBuild script
          xcodebuild -configuration "Release" ENABLE_BITCODE=NO DEBUGGING_SYMBOLS=NO \
            -workspace build/iOS/Build_iOS_auto/Unity-iPhone.xcworkspace \
            -scheme Unity-iPhone \
            -destination 'generic/platform=iOS' \
            -archivePath bb/build.xcarchive \
            clean archive
```

**Key flags used:**
*   `-workspace build/iOS/Build_iOS_auto/Unity-iPhone.xcworkspace`: Targets the workspace (required for Pods).
*   `ENABLE_BITCODE=NO`: Disables bitcode (often required for modern AdMob/Firebase SDKs).
*   `clean archive`: Cleans build artifacts and creates the archive.

### 4. Export IPA
**Location:** `Mac-Xcode` job

The archive is then exported to an IPA file using the export options plist.

```yaml
      # Exports the archive according to the export options specified by the plist
      xcodebuild -exportArchive -archivePath bb/build.xcarchive -exportPath bb/build.ipa -exportOptionsPlist CloudBuild/iOS/exportOptions.plist
```
