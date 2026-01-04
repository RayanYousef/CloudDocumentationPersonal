## IOS Code Signing Processor

### Required GitHub Secrets

Before setting up the IOS code signing processor, you must configure the following GitHub Secrets in your repository:

| Secret Name | Description | Required For |
|-------------|-------------|--------------|
| `APPLE_DISTRIBUTION_P12_PASSWORD` | Password for your Apple Distribution certificate (.p12 file) | Code signing |
| `APNS_P12_PASSWORD` | Password for your APNS certificate (.p12 file) | Push notifications |

This guide extends the base IOS build guide. Use it only when you need precise, scripted control of signing (for example, when adding a Notification Service Extension) beyond what Unity/Xcode automatic signing provides. If you are fine with Unity's automatic signing, you do not need this guide.

This guide explains how to set up the Unity editor script `IOSCodeSigningProcessor.cs` to automate manual code signing for IOS builds, particularly for a Notification Service Extension used by push notifications. If you want to use a Notification Service Extension, you must use this processor. If you prefer to configure signing directly in Xcode and do not use a notification service extension, you can skip this guide.

### When to use this
- You need a Notification Service Extension bundled with the app.
- You want CI builds to apply manual signing values without opening Xcode.

### What the script does
- Configures manual code signing on the generated Xcode project for the extension target.
- Sets provisioning profile UUID, development team, and code sign identity.
- Ensures required notification service files are added to the Xcode project and scheme.

### Prerequisites
- Apple Developer Program account and Team ID.
- Valid provisioning profile for the extension/app that matches your bundle identifier.
- Apple Distribution certificate installed/exported (.p12) and its password.
- If you use APNS, an APNS certificate (.p12).

### Files used by the script
- `notificationservice/NotificationService.m`
- `notificationservice/NotificationService.h`
- `notificationservice/Info.plist`
- `skrew.entitlements`

### Setup steps
1. Copy the script into your Unity project:
   - Source: `docs/scripts/IOSCodeSigningProcessor.cs`
   - Destination: `Assets/Editor/IOSCodeSigningProcessor.cs`

2. Open the script and replace the placeholder values with your own:
   - Provisioning Profile UUID (e.g., `YOUR_PROVISIONING_PROFILE_UUID`)
   - Apple Developer Team ID (e.g., `YOUR_TEAM_ID`)
   - Code Sign Identity (e.g., `Apple Distribution: Your Name (YOUR_TEAM_ID)`)

3. In Unity, configure Player Settings for IOS signing (manual):
   - Set `Signing Team Id` to your Team ID.
   - Disable `Automatically Sign`.
   - Set `Profile ID` to your provisioning profile UUID.
   - Choose the correct `Profile Type` (e.g., Distribution).

4. Commit and push the Unity project settings so CI uses them:
   - Ensure changes in `ProjectSettings/ProjectSettings.asset` are included.

5. Trigger your IOS build workflow. The script runs during Unity's post-process build and applies the signing to the Xcode project.

### Create certificates and provisioning profiles
1. Apple Distribution Certificate
   - Visit Apple Developer Certificates and create an "Apple Distribution" certificate.
   - Download the .p12 and store it as `CloudBuild/IOS/Certificates/Apple_Distribution.p12`.
   - Keep the password and set it as `APPLE_DISTRIBUTION_P12_PASSWORD` secret.

2. APNS Certificate (if using push notifications)
   - Create "Apple Push Notification service SSL (Sandbox & Production)" for your App ID.
   - Download the .p12 and store it as `CloudBuild/IOS/Certificates/Skrew_APNS_Prod.p12`.
   - Keep the password and set it as `APNS_P12_PASSWORD` secret.

3. Provisioning Profile
   - Create an "App Store" provisioning profile for your app/extension.
   - Download and place under `CloudBuild/IOS/ProvisioningProfiles/`.
   - CI will copy profiles to `~/Library/Developer/Xcode/UserData/Provisioning Profiles/` and `~/Library/MobileDevice/Provisioning Profiles/`.

### Notes
- If you skip this script, configure signing in Xcode or rely on your preferred signing tool during export.
- Keep certificates and profiles up to date to avoid CI failures.

### Troubleshooting
- "No matching provisioning profile": Verify the UUID and that the profile includes the app/extension bundle ID.
- Code sign identity mismatch: Ensure the installed certificate matches the identity string used.

### File structure (SignCode-related)
```
CloudBuild/
└── IOS/
    ├── Certificates/
    │   ├── Apple_Distribution.p12
    │   └── YOUR_APP_NAME_APNS_Prod.p12
    ├── ProvisioningProfiles/
    │   └── *.mobileprovision
    └── exportOptions.plist

Assets/
└── Editor/
    ├── CustomBuildProcessor.cs
    └── IOSCodeSigningProcessor.cs (optional, only if you use the processor)
```

Back to the IOS build guide: [IOS.md](../platforms/IOS.md)
