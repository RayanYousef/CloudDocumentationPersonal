# Prerequisites Setup

This guide covers the common project setup required for both Android and IOS cloud builds. Complete these steps before proceeding to platform-specific guides.

## 📋 Table of Contents

- [**📋 Common Project Setup**](#-common-project-setup)
  - [Core Configuration Files](#11-core-configuration-files)
    - [`VersioningSettings.json`](#versioningsettingsjson)
    - [`CustomBuildProcessor.cs` Script](#custombuildprocessorcs-script)
  - [`WhatsNew` Directory](#12-whatsnew-directory)
  - [`Build Controller` Workflow](#13-build-controller-workflow)
- [**📝 Next Steps**](#-next-steps)

## 📋 Common Project Setup

These files and configurations are shared between Android and IOS builds. Set them up first before proceeding to platform-specific guides.

### 1.1. Core Configuration Files

#### `VersioningSettings.json`

Create a `VersioningSettings.json` file in the root of your repository to manage your application's versioning. This file must be in JSON format and is used by the CustomBuildProcessor script.

**Location**: `VersioningSettings.json` (in project root)

**📥 [Download Template](../docs/CloudBuild/VersioningSettings.json)** - Use this as a starting point for your configuration

**Example content**:
```json
{
    "AppVersion": "1.65",
    "BuildVersionAndroid": 58,
    "BuildNumberIOS": 58,
    "AutoIncrementVersionNumber": false,
    "AutoIncrementAndroid": false,
    "AutoIncrementIOS": false,
    "BuildBranch": "main"
}
```

**Configuration Options**:
- `AppVersion`: Your app's version (e.g., "1.65", "2.1.0")
- `BuildVersionAndroid`: Android version code (integer, auto-increments)
- `BuildNumberIOS`: IOS build number (integer, auto-increments)
- `AutoIncrementVersionNumber`: Whether to auto-increment version on each build
- `AutoIncrementAndroid`: Whether to auto-increment Android version code
- `AutoIncrementIOS`: Whether to auto-increment IOS build number
- `BuildBranch`: Target branch for builds (usually "main")

#### `CustomBuildProcessor.cs` Script

**📥 [Download Script](./scripts/CustomBuildProcessor.cs)**

This Unity Editor script is a comprehensive build automation tool that handles versioning, configuration, and post-processing for both Android and IOS cloud builds. It implements both pre-build and post-build hooks to ensure consistent build setup and artifact generation.

**Location**: `Assets/Editor/CustomBuildProcessor.cs` (create the Editor folder if it doesn't exist)

**📦 Optional Companion Scripts**:
- **[VersionInfo.cs](./scripts/VersionInfo.cs)** - Shared version information structure for build-time and runtime use
- **[VersionText.cs](./scripts/VersionText.cs)** - Runtime script to display version information in the UI

*These companion scripts are optional and work together with CustomBuildProcessor.cs to provide runtime version display functionality.*

**Key Features**:

**🔧 Pre-Build Processing** (`OnPreprocessBuild`):
- **Version Management**: Reads versioning settings from `VersioningSettings.json` and applies them to Unity Player Settings
- **Platform Configuration**: Sets bundle version, Android version code, and IOS build number
- **Security Setup**: Automatically configures Android keystore passwords for signing
- **Version Info Generation** *(Optional)*: Creates a runtime-accessible version info file in `Assets/Resources/version_info.txt`
- **Build Metadata**: Captures build timestamp and platform-specific details

**📦 Post-Build Processing** (`OnPostprocessBuild`):
- **Build Logging**: Records build results and total build size
- **IOS Compliance**: Updates `Info.plist` to set `ITSAppUsesNonExemptEncryption` to false for App Store compliance

**📋 Version Info File Structure** *(Optional Feature)*:

**🎯 Purpose**: This feature enables programmers to display version and build information in their Unity application at runtime. The script generates a JSON file that can be accessed by game code to show current app version, build number, and other metadata.

The script can generate a JSON file in `Assets/Resources/version_info.txt` with the following structure:
```json
{
  "versionNumber": "1.65",
  "buildVersion": 58,
  "platform": "Android",
  "buildTime": "2024-01-15 14:30:22"
}
```

**🔧 Usage with VersionText.cs**: Use the included `VersionText.cs` script to automatically display this version information in your UI. Simply attach the script to a GameObject with a TextMeshPro text component, and it will automatically load and display the version info (e.g., "v1.65_bv58"). If the version info file is unavailable, it falls back to Unity's Application.version.

**⚙️ How to Disable Version Info Generation**:
If you don't want to use the VersionText.cs or VersionInfo.cs functionality, you can easily disable it by commenting out the `CreateVersionInfoFile()` function call in the `OnPreprocessBuild()` method. Simply add `//` before the line:
```csharp
// CreateVersionInfoFile(report.summary.platform);  // Commented out to disable version info generation
```

**💡 When to disable this feature:**
- If you don't plan to use VersionText.cs to display version info in your UI
- If you don't need runtime access to build version information
- If you want to keep your build process minimal

This feature is completely optional and doesn't affect the core versioning functionality of the script.

**🔄 File Path Resolution**:
- Automatically locates `VersioningSettings.json` in the repository's `CloudBuild/` directory
- Creates necessary directories (Resources folder) if they don't exist
- Maintains compatibility with cloud build environments

**Setup**:
1. Download the script from [here](./scripts/CustomBuildProcessor.cs)
2. Place it in your Unity project's `Assets/Editor/` folder
3. Ensure `VersioningSettings.json` exists in your repository's `CloudBuild/` folder
4. **Optional**: If you want runtime version display, also download and use [VersionInfo.cs](./scripts/VersionInfo.cs) and [VersionText.cs](./scripts/VersionText.cs)
5. **Important**: If you don't plan to use VersionText.cs or VersionInfo.cs, comment out the `CreateVersionInfoFile()` call in the `OnPreprocessBuild()` method to disable version info generation
6. The script will automatically execute during both local and cloud builds

### 1.2. `WhatsNew` Directory

Create a `WhatsNew` directory in your project's `docs/CloudBuild/WhatsNew/` folder with localized release notes as `whatsnew-{language}-{region}` files (e.g., `whatsnew-en-US`, `whatsnew-ar-SA`).

**File Format**: `whatsnew-{language}-{region}` using [BCP 47](https://tools.ietf.org/html/bcp47) standard
**Examples**:
- `whatsnew-en-US` (US English)
- `whatsnew-ar-SA` (Arabic - Saudi Arabia)
- `whatsnew-es-ES` (Spanish - Spain)
- `whatsnew-fr-FR` (French - France)

**Requirements**:
- UTF-8 plain text
- One change per line
- Supports 100+ language-region combinations

**Fallback Rules**:
- Google Play & App Store prefer region-specific files (e.g., `whatsnew-ar-SA`)
- Falls back to language-only files (e.g., `whatsnew-ar`)
- Finally falls back to default (usually `whatsnew-en-US`)