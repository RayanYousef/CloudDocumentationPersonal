# Workflows Reference

This section contains the reference for the GitHub Actions workflows.

## Main Controller

The main controller workflow that orchestrates the builds.

[Download main-controller.yml](/downloads/workflows/main-controller.yml)

```yaml
name: Build Controller

on:
  workflow_dispatch:
    inputs:
      run_android_aab_store:
        description: 'Run Android AAB (upload to Play)'
        required: false
        type: boolean
        default: false
      run_android_apk_gdrive:
        description: 'Run Android APK (upload to Drive)'
        required: false
        type: boolean
        default: false
      run_ios_ipa_testflight:
        description: 'Run iOS IPA (upload to TestFlight)'
        required: false
        type: boolean
        default: false
      ios_upload_artifact:
        description: 'Upload iOS build artifact (when running iOS)'
        required: false
        type: boolean
        default: false

jobs:
  run-android-aab-store:
    if: ${{ github.event.inputs.run_android_aab_store == 'true' }}
    uses: ./reference/workflowsandroid-aab-store.yml
    secrets: inherit

  run-android-apk-gdrive:
    if: ${{ github.event.inputs.run_android_apk_gdrive == 'true' }}
    uses: ./reference/workflowsandroid-apk-gdrive.yml
    secrets: inherit

  run-ios-ipa-testflight:
    if: ${{ github.event.inputs.run_ios_ipa_testflight == 'true' }}
    uses: ./reference/workflows#ios-ipa-testflight
    with:
      upload_artifact: ${{ github.event.inputs.ios_upload_artifact == 'true' }}
    secrets: inherit



```

## Android AAB Store

Workflow to build Android App Bundle and upload to Play Store.

[Download android-aab-store.yml](/downloads/workflows/android-aab-store.yml)

```yaml
name: ToStore - Automated Build - Android

on:
  workflow_dispatch:
  workflow_call:

env:
  UNITY_LICENSE: ${{ secrets.UNITY_LICENSE }}

jobs:
  buildAndroid:
    name: Build for Android 🖥️
    runs-on: ubuntu-22.04
    timeout-minutes: 220
    strategy:
      fail-fast: false
    steps:
      - name: Delete huge unnecessary tools folder
        run: rm -rf /opt/hostedtoolcache

      - name: Free Disk Space (Ubuntu)
        uses: jlumbroso/free-disk-space@main # https://github.com/jlumbroso/free-disk-space
        with:
          # this might remove tools that are actually needed,
          # if set to "true" but frees about 6 GB
          tool-cache: false

          # all of these default to true, but feel free to set to
          # "false" if necessary for your workflow
          android: false
          dotnet: false
          haskell: true
          large-packages: true
          docker-images: true
          swap-storage: false

      - name: Checkout code
        uses: actions/checkout@v4 # https://github.com/actions/checkout
        with:
         # ref: main
         lfs: true

      - name: Create LFS file list
        run: git lfs ls-files -l | cut -d' ' -f1 | sort > .lfs-assets-id

      - name: Restore LFS cache
        uses: actions/cache@v4 # https://github.com/actions/cache
        id: lfs-cache
        with:
          path: .git/lfs
          key: ${{ runner.os }}-lfs-${{ hashFiles('.lfs-assets-id') }}

      - name: Git LFS Pull
        run: |
          git lfs pull
          git add .
          git reset --hard
      - name: Restore Library cache
        uses: actions/cache@v4 # https://github.com/actions/cache
        with:
          path: SkrewClient/Library
          key: Library-build-Android
          restore-keys: |
            Library-build-Android
            Library-build-
            Library-

      - uses: game-ci/unity-builder@v4.3.0 # https://github.com/game-ci/unity-builder
        id: myBuildStep
        env:
          UNITY_LICENSE: ${{ secrets.UNITY_LICENSE }}
          UNITY_EMAIL: ${{ secrets.UNITY_EMAIL }}
          UNITY_PASSWORD: ${{ secrets.UNITY_PASSWORD }}
        with:
          projectPath: ./SkrewClient
          targetPlatform: Android
          androidExportType: 'androidAppBundle'
          buildName: Build_Android_auto
          versioning : None
          androidVersionCode : 4
          androidKeystorePass: ${{ secrets.ANDROID_KEYSTORE_PASS }}
          androidKeyaliasPass: ${{ secrets.ANDROID_KEYALIAS_PASS }}

      - name: check folders (can be removed)
        run: |
          ls -a
          cd build
          ls -a
          cd Android
          ls -a

      - name: JSON to variables
        uses: rgarcia-phi/json-to-variables@v1.1.0 # https://github.com/rgarcia-phi/json-to-variables
        with:
          filename: 'CloudBuild/VersioningSettings.json'
          prefix: setting

      - uses: r0adkll/upload-google-play@v1.1.3 # https://github.com/r0adkll/upload-google-play
        with:
          serviceAccountJsonPlainText: ${{ secrets.SERVICE_ACCOUNT_JSON }}
          packageName: com.yamp.skrew                                 #Change package name when changing project
          releaseFiles: build/Android/Build_Android_auto.aab
          whatsNewDirectory: CloudBuild/WhatsNew
          track: internal
          status: draft
          releaseName: v${{ env.setting_AppVersion }}_bv${{ env.setting_BuildVersionAndroid }}

  notifyAAB:
    permissions: read-all
    name: Discord Notification for AAB Build
    runs-on: ubuntu-latest
    needs:
      - buildAndroid
    if: ${{ success() || failure() }}

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: JSON to variables (for release name)
        uses: rgarcia-phi/json-to-variables@v1.1.0
        with:
          filename: 'CloudBuild/VersioningSettings.json'
          prefix: setting

      - name: Notify AAB Build
        uses: nobrayner/discord-webhook@v1 # https://github.com/nobrayner/discord-webhook
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          discord-webhook: ${{ secrets.DISCORD_WEBHOOK_SKREW }}
          username: 'Build Notifier'
          include-details: true
          title: 'AAB Build and Upload to Google Play'
          description: 'The AAB has been uploaded to Google Play. Release: v${{ env.setting_AppVersion }}_bv${{ env.setting_BuildVersionAndroid }} | File: Build_Android_auto.aab'



```

## Android APK Drive

Workflow to build Android APK and upload to Google Drive.

[Download android-apk-gdrive.yml](/downloads/workflows/android-apk-gdrive.yml)

```yaml
name: ToDrive - APK Build and Upload - Android

on:
  workflow_dispatch:
  workflow_call:

env:
  UNITY_LICENSE: ${{ secrets.UNITY_LICENSE }}

jobs:
  buildAPK:
    name: Build APK for Android 🖥️
    runs-on: ubuntu-22.04
    timeout-minutes: 220
    strategy:
      fail-fast: false
    steps:
      - name: Delete huge unnecessary tools folder
        run: rm -rf /opt/hostedtoolcache

      - name: Free Disk Space (Ubuntu)
        uses: jlumbroso/free-disk-space@main # https://github.com/jlumbroso/free-disk-space
        with:
          tool-cache: false

          android: false
          dotnet: false
          haskell: true
          large-packages: true
          docker-images: true
          swap-storage: false

      - name: Checkout code
        uses: actions/checkout@v4 # https://github.com/actions/checkout
        with:
         # ref: main
         lfs: true

      - name: Create LFS file list
        run: git lfs ls-files -l | cut -d' ' -f1 | sort > .lfs-assets-id

      - name: Restore LFS cache
        uses: actions/cache@v4 # https://github.com/actions/cache
        id: lfs-cache
        with:
          path: .git/lfs
          key: ${{ runner.os }}-lfs-${{ hashFiles('.lfs-assets-id') }}

      - name: Git LFS Pull
        run: |
          git lfs pull
          git add .
          git reset --hard
      - name: Restore Library cache
        uses: actions/cache@v4 # https://github.com/actions/cache
        with:
          path: SkrewClient/Library
          key: Library-build-Android-APK
          restore-keys: |
            Library-build-Android-APK
            Library-build-
            Library-

      - name: JSON to variables
        uses: rgarcia-phi/json-to-variables@v1.1.0 # https://github.com/rgarcia-phi/json-to-variables
        with:
          filename: 'CloudBuild/VersioningSettings.json'
          prefix: setting

      - uses: game-ci/unity-builder@v4.3.0 # https://github.com/game-ci/unity-builder
        env:
          UNITY_LICENSE: ${{ secrets.UNITY_LICENSE }}
          UNITY_EMAIL: ${{ secrets.UNITY_EMAIL }}
          UNITY_PASSWORD: ${{ secrets.UNITY_PASSWORD }}
        with:
          projectPath: ./SkrewClient
          targetPlatform: Android
          androidExportType: 'androidPackage'
          buildName: v${{ env.setting_AppVersion }}_bv${{ env.setting_BuildVersionAndroid }}
          versioning : None
          androidVersionCode : 4
          androidKeystorePass: ${{ secrets.ANDROID_KEYSTORE_PASS }}
          androidKeyaliasPass: ${{ secrets.ANDROID_KEYALIAS_PASS }}

      - name: Upload Build Artifact
        uses: actions/upload-artifact@v4 # https://github.com/actions/upload-artifact
        with:
          name: Android-APK
          path: build/Android/v${{ env.setting_AppVersion }}_bv${{ env.setting_BuildVersionAndroid }}.apk

  uploadToDrive:
    name: Upload to Google Drive
    runs-on: ubuntu-latest
    needs: buildAPK
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: JSON to variables
        uses: rgarcia-phi/json-to-variables@v1.1.0
        with:
          filename: 'CloudBuild/VersioningSettings.json'
          prefix: setting

      - name: Download the Build Artifact
        uses: actions/download-artifact@v4 # https://github.com/actions/download-artifact
        with:
          name: Android-APK
          path: ./BuildData

      - name: run singleLine
        run: |
            ls -a
            cd BuildData
            ls -a

      - name: Verify the artifact download
        run: ls -l ./BuildData/v${{ env.setting_AppVersion }}_bv${{ env.setting_BuildVersionAndroid }}.apk

      - name: Upload Build to Google Drive
        uses: Jumbo810/Upload_Github_Artifacts_TO_GDrive@v2.3.1 # https://github.com/Jumbo810/Upload_Github_Artifacts_TO_GDrive
        with:
          target: ./BuildData/v${{ env.setting_AppVersion }}_bv${{ env.setting_BuildVersionAndroid }}.apk
          credentials: ${{ secrets.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS }}
          parent_folder_id: ${{ vars.GOOGLE_DRIVE_PARENT_FOLDER_ID }}

  notifyAPK:
    permissions: read-all
    name: Discord Notification for APK Build
    runs-on: ubuntu-latest
    needs:
      - uploadToDrive
    if: ${{ success() || failure() }}

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: JSON to variables (for build name)
        uses: rgarcia-phi/json-to-variables@v1.1.0
        with:
          filename: 'CloudBuild/VersioningSettings.json'
          prefix: setting

      - name: Notify APK Build
        uses: nobrayner/discord-webhook@v1 # https://github.com/nobrayner/discord-webhook
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          discord-webhook: ${{ secrets.DISCORD_WEBHOOK_SKREW }}
          username: 'Build Notifier'
          include-details: true
          title: 'APK Build and Upload to Google Drive'
          description: 'The APK has been uploaded to Google Drive. Release: v${{ env.setting_AppVersion }}_bv${{ env.setting_BuildVersionAndroid }} | File: v${{ env.setting_AppVersion }}_bv${{ env.setting_BuildVersionAndroid }}.apk'



```

## iOS IPA TestFlight

Workflow to build iOS IPA and upload to TestFlight.

[Download ios-ipa-testflight.yml](/downloads/workflows/ios-ipa-testflight.yml)

```yaml
name: ToStore - Automated Build - IOS

on:
  #push:
   # branches:
   #   - master
  workflow_dispatch:
    inputs:
      upload_artifact:
        description: 'Upload iOS build artifact'
        required: false
        type: boolean
        default: true
  workflow_call:
    inputs:
      upload_artifact:
        required: false
        type: boolean
        default: true

env:
  UNITY_LICENSE: ${{ secrets.UNITY_LICENSE }}

jobs:
  buildIOS:
    name: Build xCode 🖥️
    runs-on: ubuntu-latest
    permissions: write-all
    timeout-minutes: 120
    strategy:
      fail-fast: false
    steps:
      - name: Delete huge unnecessary tools folder
        run: rm -rf /opt/hostedtoolcache

      - name: Free Disk Space (Ubuntu)
        uses: jlumbroso/free-disk-space@main # https://github.com/jlumbroso/free-disk-space
        with:
          # Set to "true" to remove cached tools like Go, Node.js, etc.
          # Frees ~6 GB. Recommended unless your build specifically needs these pre-cached tools.
          tool-cache: true

          # Set to "true" to remove Android SDKs/NDKs.
          # Recommended for iOS builds as these are not needed and take up significant space.
          # Default is true, but explicitly set to 'false' here. Consider changing to 'true'.
          android: false

          # Set to "true" to remove .NET SDKs.
          # Unity uses .NET, but often bundles its own runtime. Removing system .NET is usually safe.
          # Keep as "false" only if you are certain your build depends on the pre-installed .NET SDKs.
          # Default is true.
          dotnet: true

          # Set to "true" to remove Haskell tools (GHC, Cabal).
          # Unnecessary for Unity/iOS builds. Recommended to keep "true".
          # Default is true.
          haskell: true

          # Set to "true" to remove large packages like CodeQL, firefox, google-chrome.
          # Unlikely needed for a Unity build. Recommended to keep "true" for more space.
          # Default is true.
          large-packages: true

          # Set to "true" to remove cached Docker images.
          # Unnecessary unless your build process uses Docker. Recommended to keep "true".
          # Default is true.
          docker-images: true

          # Set to "true" to remove swap storage.
          # Keeping swap ("false") is recommended to prevent potential out-of-memory errors during large builds.
          # Default is true.
          swap-storage: false

      - name: Checkout code
        uses: actions/checkout@v4 # https://github.com/actions/checkout
        with:
        #  ref: main
         lfs: true

      - name: Create LFS file list
        run: git lfs ls-files -l | cut -d' ' -f1 | sort > .lfs-assets-id

      - name: Restore LFS cache
        uses: actions/cache@v4 # https://github.com/actions/cache
        id: lfs-cache
        with:
          path: .git/lfs
          key: ${{ runner.os }}-lfs-${{ hashFiles('.lfs-assets-id') }}

      - name: Git LFS Pull
        run: |
          git lfs pull
          git add .
          git reset --hard
      - name: Remove Android-specific plugins
        run: |
          rm -rf SkrewClient/Assets/ExternalDependencyManager
          rm -rf SkrewClient/Assets/ExternalDependencyManager.meta
          rm -rf SkrewClient/Assets/Firebase
          rm -rf SkrewClient/Assets/Firebase.meta
          rm -rf SkrewClient/Assets/GooglePlayGames
          rm -rf SkrewClient/Assets/GooglePlayGames.meta
      - name: Restore Library cache
        uses: actions/cache@v4 # https://github.com/actions/cache
        with:
          path: SkrewClient/Library
          key: Library-build-iOS
          restore-keys: |
            Library-build-iOS
            Library-build-
            Library-

      - uses: game-ci/unity-builder@v4.3.0 # https://github.com/game-ci/unity-builder
        id: myBuildStep
        env:
          UNITY_LICENSE: ${{ secrets.UNITY_LICENSE }}
          UNITY_EMAIL: ${{ secrets.UNITY_EMAIL }}
          UNITY_PASSWORD: ${{ secrets.UNITY_PASSWORD }}
        with:
          projectPath: ./SkrewClient
          targetPlatform: iOS
          buildName: Build_iOS_auto
          versioning: None
          # versioning: Custom
          # version: 1.0.${{ github.run_number }}
          # allowDirtyBuild: true


      - uses: actions/cache/save@v4 # https://github.com/actions/cache
        id: cachesave
        with:
          path: build
          key: Build_iOS_${{ github.run_id }}


        # Uploading the Xcode project
      - name: Upload iOS Build Artifact
        if: ${{ inputs.upload_artifact || github.event.inputs.upload_artifact == 'true' }}
        uses: actions/upload-artifact@v4
        with:
          name: iOS-Build-Output
          path: build/iOS/Build_iOS_auto

  Mac-Xcode:
    permissions: read-all
    name: Archive and Upload
    runs-on: macos-latest
    needs:
      - buildIOS
    outputs:
      ipa_path: ${{ steps.expose_ipa.outputs.ipa_path }}

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: JSON to variables (for naming)
        uses: rgarcia-phi/json-to-variables@v1.1.0 # https://github.com/rgarcia-phi/json-to-variables
        with:
          filename: 'CloudBuild/VersioningSettings.json'
          prefix: setting

      - uses: actions/cache/restore@v4 # https://github.com/actions/cache
        id: cacheLoad
        with:
          path: build
          key: Build_iOS_${{ github.run_id }}

      - name: Clean DerivedData
        run: rm -rf ~/Library/Developer/Xcode/DerivedData/*

      - name: Install the Apple certificate and provisioning profile
        env:
          P12_PASSWORD: ${{ secrets.APNS_P12_PASSWORD }}
          APPLE_DISTRIBUTION_P12_PASSWORD: ${{ secrets.APPLE_DISTRIBUTION_P12_PASSWORD }}
          KEYCHAIN_PASSWORD: 123
        run: |
          # create variables
          CERTIFICATE_PATH=CloudBuild/iOS/Certificates/Apple_Distribution.p12
          APNS_CERTIFICATE_PATH=CloudBuild/iOS/Certificates/Skrew_APNS_Prod.p12
          PP_PATH=CloudBuild/iOS/ProvisioningProfiles/
          KEYCHAIN_PATH=$RUNNER_TEMP/app-signing.keychain-db

          # create temporary keychain
          security create-keychain -p "$KEYCHAIN_PASSWORD" $KEYCHAIN_PATH
          security set-keychain-settings -lut 21600 $KEYCHAIN_PATH
          security unlock-keychain -p "$KEYCHAIN_PASSWORD" $KEYCHAIN_PATH

          # import certificate to keychain
          security import $CERTIFICATE_PATH -P "$APPLE_DISTRIBUTION_P12_PASSWORD" -A -t cert -f pkcs12 -k $KEYCHAIN_PATH
          security import $APNS_CERTIFICATE_PATH -P "$P12_PASSWORD" -A -t cert -f pkcs12 -k $KEYCHAIN_PATH
          security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k $KEYCHAIN_PASSWORD $KEYCHAIN_PATH
          security list-keychain -d user -s $KEYCHAIN_PATH

          # apply provisioning profile
          echo "Current user: $(whoami)"

          # Create both possible provisioning profile directories as fallback
          mkdir -p ~/Library/Developer/Xcode/UserData/Provisioning\ Profiles
          mkdir -p ~/Library/MobileDevice/Provisioning\ Profiles

          # Copy to both locations to ensure compatibility
          cp -R $PP_PATH* ~/Library/Developer/Xcode/UserData/Provisioning\ Profiles/
          cp -R $PP_PATH* ~/Library/MobileDevice/Provisioning\ Profiles/

          cd ~/Library/Developer/Xcode/UserData/Provisioning\ Profiles
          ls -a

          echo "Checking MobileDevice directory:"
          cd ~/Library/MobileDevice/Provisioning\ Profiles
          ls -a

      - name: Check notificationservice folder
        run: ls -la build/iOS/Build_iOS_auto/notificationservice/

      - name: Install iOS 18.2 Platform
        run: |
          echo "Installing iOS 18.2 platform..."
          sudo xcode-select -switch /Applications/Xcode_16.2.app
          xcodebuild -downloadPlatform iOS -buildVersion 18.2 || echo "Platform download failed or already exists"
          xcodebuild -showsdks | grep -i ios

      - name: sign and archive
        run: |
          sudo xcode-select -switch /Applications/Xcode_16.2.app
          # Code signing configuration is now handled automatically by Unity PostProcessBuild script
          xcodebuild -configuration "Release" ENABLE_BITCODE=NO DEBUGGING_SYMBOLS=NO -project build/iOS/Build_iOS_auto/Unity-iPhone.xcodeproj -scheme Unity-iPhone -destination 'generic/platform=iOS' -archivePath bb/build.xcarchive clean archive

          # Exports the archive according to the export options specified by the plist
          xcodebuild -exportArchive -archivePath bb/build.xcarchive -exportPath bb/build.ipa -exportOptionsPlist CloudBuild/iOS/exportOptions.plist

      - name: Find IPA file
        run: |
          IPA_PATH=$(find bb/build.ipa -type f -name "*.ipa" -exec du -sh {} + | sort -rh | head -n1 | awk '{print $2}')
          echo "IPA_PATH=$IPA_PATH" >> $GITHUB_ENV

      - name: Expose IPA path output
        id: expose_ipa
        run: echo "ipa_path=${{ env.IPA_PATH }}" >> $GITHUB_OUTPUT

      - name: List files for debugging
        run: |
          ls -a
          cd bb
          ls -a
          cd build.ipa
          ls -a

      - name: 'Upload app to TestFlight'
        uses: apple-actions/upload-testflight-build@v1 # https://github.com/apple-actions/upload-testflight-build
        with:
          app-path: ${{ env.IPA_PATH }}
          issuer-id: ${{ secrets.APPSTORE_ISSUER_ID }}
          api-key-id: ${{ secrets.APPSTORE_KEY_ID }}
          api-private-key: ${{ secrets.APPSTORE_P8 }}

  notify:
    permissions: read-all
    name: Discord Notification
    runs-on: ubuntu-latest
    needs:
      - buildIOS
      - Mac-Xcode
    if: ${{ success() || failure() }}

    steps:
      - name: Checkout code
        uses: actions/checkout@v4 # https://github.com/actions/checkout

      - name: JSON to variables (for version)
        uses: rgarcia-phi/json-to-variables@v1.1.0 # https://github.com/rgarcia-phi/json-to-variables
        with:
          filename: 'CloudBuild/VersioningSettings.json'
          prefix: setting

      - name: Notify
        uses: nobrayner/discord-webhook@v1 # https://github.com/nobrayner/discord-webhook
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          discord-webhook: ${{ secrets.DISCORD_WEBHOOK_SKREW }}
          username: 'Build Notifier'
          include-details: true
          title: 'iOS Build and Upload to TestFlight'
          description: 'The IPA has been uploaded to TestFlight. Release: v${{ env.setting_AppVersion }}_bv${{ env.setting_BuildNumberIOS }} | File: ${{ needs.Mac-Xcode.outputs.ipa_path }}'



```
