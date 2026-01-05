# Scripts Reference

This section contains the reference for the scripts used in the Unity Cloud Build pipeline. You can view the code below or download the files.

## CustomBuildProcessor.cs

Handles the build process customizations.

[Download CustomBuildProcessor.cs](/CloudDocumentationPersonal/downloads/scripts/CustomBuildProcessor.cs)

```csharp
using System;
using System.IO;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEngine;
#if UNITY_IOS
using UnityEditor.iOS.Xcode;
#endif

/// <summary>
/// Used mainly for cloud build
/// Auto incremeant android and ios per build
/// </summary>
internal class CustomBuildProcessor : IPreprocessBuildWithReport, IPostprocessBuildWithReport
{
    //Text file next to the asset and libary folders
    private const string fileName = "VersioningSettings.json";
    private CloudBuildData cloudBuildData;
    private string path;
    const string Android_keystorePw = "d9y#Kk22D%@U52";
    const string Android_aliasPw = "d9y#Kk22D%@U52";

    [System.Serializable]
    private struct CloudBuildData
    {
        public string AppVersion;
        public int BuildVersionAndroid;
        public int BuildNumberIOS;
        public bool AutoIncremeantVersionNumber;
        public bool AutoIncremeantAndroid;
        public bool AutoIncremeantIOS;
        public string BuildBranch;
    }



    public int callbackOrder
    { get { return 0; } }

    public void OnPostprocessBuild(BuildReport report)
    {
        GetFilePath();
        string buildInfo = "Build Ended With result : " + report.summary.result + "\\n";
        buildInfo += "Build size : " + report.summary.totalSize;
#if UNITY_IOS
        IOSPlistUpdate(report.summary.outputPath);
#endif
    }

    public void OnPreprocessBuild(BuildReport report)
    {
        GetFilePath();
        ReadJsonData();
        SetupProjectSetting();
        CreateVersionInfoFile(report.summary.platform);
        SaveUpdatedData();

        Debug.Log("MyCustomBuildProcessor.OnPreprocessBuild for target " + report.summary.platform + " at path " + report.summary.outputPath);
    }

    private void GetFilePath()
    {
        // Build absolute path to repo-root/CloudBuild/VersioningSettings.json
        string assetsPath = Application.dataPath;
        string projectRoot = Directory.GetParent(assetsPath).FullName; // SkrewClient
        string repoRoot = Directory.GetParent(projectRoot).FullName;    // repo root
        path = Path.Combine(repoRoot, "CloudBuild", fileName);
    }

    private void ReadJsonData()
    {
        string text = File.ReadAllText(path);
        cloudBuildData = JsonUtility.FromJson<CloudBuildData>(text);
    }

    private void SetupProjectSetting()
    {
        PlayerSettings.bundleVersion = cloudBuildData.AppVersion;
        PlayerSettings.Android.bundleVersionCode = cloudBuildData.BuildVersionAndroid;
        PlayerSettings.iOS.buildNumber = cloudBuildData.BuildNumberIOS.ToString();

        //Assigning Keystore pw
        PlayerSettings.Android.keystorePass = Android_keystorePw;
        PlayerSettings.Android.keyaliasPass = Android_aliasPw;
    }

    private void CreateVersionInfoFile(BuildTarget buildTarget)
    {
        // Create Resources folder if it doesn't exist
        string resourcesPath = Path.Combine(Application.dataPath, "Resources");
        if (!Directory.Exists(resourcesPath))
        {
            Directory.CreateDirectory(resourcesPath);
        }

        // Create version info based on platform
        VersionInfo versionInfo = new VersionInfo
        {
            versionNumber = cloudBuildData.AppVersion,
            buildTime = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss")
        };

        if (buildTarget == BuildTarget.Android)
        {
            versionInfo.buildVersion = cloudBuildData.BuildVersionAndroid;
            versionInfo.platform = "Android";
        }
        else if (buildTarget == BuildTarget.iOS)
        {
            versionInfo.buildVersion = cloudBuildData.BuildNumberIOS;
            versionInfo.platform = "iOS";
        }
        else
        {
            versionInfo.buildVersion = 0;
            versionInfo.platform = buildTarget.ToString();
        }

        // Save to Resources folder as JSON
        string json = JsonUtility.ToJson(versionInfo, true);
        string versionFilePath = Path.Combine(resourcesPath, "version_info.txt");
        File.WriteAllText(versionFilePath, json);

        Debug.Log($"Created version info file: {versionInfo.platform} v{versionInfo.versionNumber} ({versionInfo.buildVersion})");

        // Refresh the AssetDatabase to ensure Unity recognizes the new file
        AssetDatabase.Refresh();
    }

    private void SaveUpdatedData()
    {
        //save the data in case we need to adjust it manually
        string text = JsonUtility.ToJson(cloudBuildData, true);
        File.WriteAllText(path, text);
    }
#if UNITY_IOS
    private void IOSPlistUpdate(string pPath)
    {
string plistPath = pPath + "/Info.plist";
        PlistDocument plist = new PlistDocument();
        plist.ReadFromString(File.ReadAllText(plistPath));

        // Get root
        PlistElementDict rootDict = plist.root;

        // Add key with value
        rootDict.SetBoolean("ITSAppUsesNonExemptEncryption", false);

        // Write to file
        File.WriteAllText(plistPath, plist.WriteToString());
    }
#endif
}
```

## IOSCodeSigningProcessor.cs

Handles iOS code signing and entitlements.

[Download IOSCodeSigningProcessor.cs](/CloudDocumentationPersonal/downloads/scripts/IOSCodeSigningProcessor.cs)

```csharp
using System;
using System.IO;
using System.Xml;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEngine;
#if UNITY_IOS
using UnityEditor.iOS.Xcode;
#endif

/// <summary>
/// iOS Code Signing Processor for Unity Builds
///
/// This script automatically configures code signing for iOS notification service extensions.
/// IMPORTANT: Before using this script, you MUST update the placeholder values below with your actual:
/// - Apple Developer Team ID
/// - Provisioning Profile UUID
/// - Apple Distribution Certificate details
///
/// Find these values in your Apple Developer Console and update the TODO sections.
/// </summary>
internal class IOSCodeSigningProcessor : IPostprocessBuildWithReport
{
    public int callbackOrder => 1;

    public void OnPostprocessBuild(BuildReport report)
    {
#if UNITY_IOS
        if (report.summary.platform == BuildTarget.iOS)
        {
            try
            {
                ConfigureIOSCodeSigning(report.summary.outputPath);
            }
            catch (Exception ex)
            {
                string errorMessage = $"iOS Code Signing configuration failed: {ex.Message}";
                Debug.LogError(errorMessage);
                throw new BuildFailedException(errorMessage);
            }
        }
#endif
    }

#if UNITY_IOS
    private void ConfigureIOSCodeSigning(string buildPath)
    {
        string projectPath = buildPath + "/Unity-iPhone.xcodeproj/project.pbxproj";

        if (!File.Exists(projectPath))
        {
            string errorMessage = "Xcode project file not found at: " + projectPath;
            Debug.LogError(errorMessage);
            throw new BuildFailedException(errorMessage);
        }

        PBXProject project = new PBXProject();
        project.ReadFromFile(projectPath);

        string mainTargetGuid = project.GetUnityMainTargetGuid();

        string bundleIdentifierForNotificationService = Application.identifier + ".notificationservice";
        int indexOfLastIdentifierSection = bundleIdentifierForNotificationService.LastIndexOf('.') + 1;
        string targetName = bundleIdentifierForNotificationService.Substring(indexOfLastIdentifierSection);

        string notificationServiceTargetGuid = project.TargetGuidByName(targetName);

        if (notificationServiceTargetGuid == null)
        {

            notificationServiceTargetGuid = project.TargetGuidByName("notificationservice");
            if (notificationServiceTargetGuid != null)
            {
                targetName = "notificationservice";
            }
            else
            {
                notificationServiceTargetGuid = project.TargetGuidByName("NotificationService");
                if (notificationServiceTargetGuid != null)
                {
                    targetName = "NotificationService";
                }
            }
        }

        if (notificationServiceTargetGuid == null)
        {
            string errorMessage = "Notification service target not found. Please check the target name in Xcode or add it manually.";
            Debug.LogError(errorMessage);
            throw new BuildFailedException(errorMessage);
        }

        if (notificationServiceTargetGuid != null)
        {
            // Configure code signing for notification service extension
            project.SetBuildProperty(notificationServiceTargetGuid, "CODE_SIGN_STYLE", "Manual");

            // TODO: Replace with your actual provisioning profile UUID from Apple Developer Console
            project.SetBuildProperty(notificationServiceTargetGuid, "PROVISIONING_PROFILE_SPECIFIER", "YOUR_PROVISIONING_PROFILE_UUID");

            // TODO: Replace with your Apple Developer Team ID
            project.SetBuildProperty(notificationServiceTargetGuid, "DEVELOPMENT_TEAM", "YOUR_TEAM_ID");

            // TODO: Replace with your Apple Distribution certificate name (format: "Apple Distribution: Your Name (TEAM_ID)")
            project.SetBuildProperty(notificationServiceTargetGuid, "CODE_SIGN_IDENTITY", "Apple Distribution: Your Name (YOUR_TEAM_ID)");

            project.SetBuildProperty(notificationServiceTargetGuid, "INFOPLIST_FILE", $"{targetName}/Info.plist");

            string notificationServicePath = Path.Combine(buildPath, targetName);
            string notificationServiceM = Path.Combine(notificationServicePath, "NotificationService.m");
            string notificationServiceH = Path.Combine(notificationServicePath, "NotificationService.h");
            string infoPList = Path.Combine(notificationServicePath, "Info.plist");
            string skrewEntitlements = Path.Combine(buildPath, "skrew.entitlements");

            ValidateRequiredPath(notificationServicePath, "Notification service directory", true);
            ValidateRequiredPath(notificationServiceM, "NotificationService.m");
            ValidateRequiredPath(notificationServiceH, "NotificationService.h");
            ValidateRequiredPath(infoPList, "Info.plist");
            ValidateRequiredPath(skrewEntitlements, "skrew.entitlements");

            string buildPhaseId = project.GetSourcesBuildPhaseByTarget(notificationServiceTargetGuid);
            if (string.IsNullOrEmpty(buildPhaseId))
            {
                buildPhaseId = project.AddSourcesBuildPhase(notificationServiceTargetGuid);
            }

            string mFileGuid = AddFileToProject(project, targetName, "NotificationService.m");
            string hFileGuid = AddFileToProject(project, targetName, "NotificationService.h");
            string infoPlistGuid = AddFileToProject(project, targetName, "Info.plist");
            string skrewEntitlementsGuid = AddFileToProject(project, "", "skrew.entitlements");

            if (!string.IsNullOrEmpty(mFileGuid) && !string.IsNullOrEmpty(buildPhaseId))
            {
                project.AddFileToBuildSection(notificationServiceTargetGuid, buildPhaseId, mFileGuid);
            }

            project.AddTargetDependency(mainTargetGuid, notificationServiceTargetGuid);
            UpdateXcodeScheme(buildPath, targetName, notificationServiceTargetGuid);
        }

        try
        {
            project.WriteToFile(projectPath);
        }
        catch (Exception ex)
        {
            string errorMessage = $"Failed to write Xcode project file: {ex.Message}";
            Debug.LogError(errorMessage);
            throw new BuildFailedException(errorMessage);
        }
    }

    private void ValidateRequiredPath(string path, string description, bool isDirectory = false)
    {
        bool exists = isDirectory ? Directory.Exists(path) : File.Exists(path);
        if (!exists)
        {
            string errorMessage = $"Required {(isDirectory ? "directory" : "file")} not found: {description} at {path}";
            Debug.LogError(errorMessage);
            throw new BuildFailedException(errorMessage);
        }
    }

    private void UpdateXcodeScheme(string buildPath,string targetName, string notificationServiceTargetGuid)
    {
        string schemePath = buildPath + "/Unity-iPhone.xcodeproj/xcshareddata/xcschemes/Unity-iPhone.xcscheme";
        if (!File.Exists(schemePath))
            return;

        XmlDocument schemeDoc = new XmlDocument();
        schemeDoc.Load(schemePath);

        XmlNode buildActionNode = schemeDoc.SelectSingleNode("//BuildAction");
        if (buildActionNode != null)
        {
            XmlNode buildActionEntriesNode = buildActionNode.SelectSingleNode("BuildActionEntries");
            if (buildActionEntriesNode != null)
            {
                bool included = false;
                XmlNodeList existingEntries = buildActionEntriesNode.SelectNodes("BuildActionEntry/BuildableReference[@BlueprintName='" + targetName + "']");
                if (existingEntries.Count > 0)
                {
                    included = true;
                }

                if (!included)
                {
                    XmlElement newBuildActionEntry = schemeDoc.CreateElement("BuildActionEntry");
                    newBuildActionEntry.SetAttribute("buildForTesting", "YES");
                    newBuildActionEntry.SetAttribute("buildForRunning", "YES");
                    newBuildActionEntry.SetAttribute("buildForProfiling", "YES");
                    newBuildActionEntry.SetAttribute("buildForArchiving", "YES");
                    newBuildActionEntry.SetAttribute("buildForAnalyzing", "YES");

                    XmlElement buildableReference = schemeDoc.CreateElement("BuildableReference");
                    buildableReference.SetAttribute("BuildableIdentifier", "primary");
                    buildableReference.SetAttribute("BlueprintIdentifier", notificationServiceTargetGuid);
                    buildableReference.SetAttribute("BuildableName", targetName + ".appex");
                    buildableReference.SetAttribute("BlueprintName", targetName);
                    buildableReference.SetAttribute("ReferencedContainer", "container:Unity-iPhone.xcodeproj");

                    newBuildActionEntry.AppendChild(buildableReference);
                    buildActionEntriesNode.AppendChild(newBuildActionEntry);
                }
            }
        }

        schemeDoc.Save(schemePath);
    }

    private string AddFileToProject(PBXProject project, string targetName, string fileName)
    {
        string projectPath = Path.Combine(targetName, fileName);
        string fileGuid = project.FindFileGuidByProjectPath(projectPath);
        if (!string.IsNullOrEmpty(fileGuid))
        {
            project.RemoveFile(fileGuid);
        }
        return project.AddFile(projectPath, projectPath, PBXSourceTree.Source);
    }
#endif
}
```

## VersionInfo.cs

Defines the structure for version information.

[Download VersionInfo.cs](/CloudDocumentationPersonal/downloads/scripts/VersionInfo.cs)

```csharp
/// <summary>
/// Shared version information structure for build-time and runtime use
/// </summary>
[System.Serializable]
public struct VersionInfo
{
    public string versionNumber;
    public int buildVersion;
    public string platform;
    public string buildTime;
}

```

## VersionText.cs

Displays the version information in the UI.

[Download VersionText.cs](/CloudDocumentationPersonal/downloads/scripts/VersionText.cs)

```csharp
using UnityEngine;
using TMPro;

public class VersionText : MonoBehaviour
{
    [SerializeField] TextMeshProUGUI txt_version;

    // Start is called once before the first execution of Update after the MonoBehaviour is created
    void Start()
    {
        SetVersionTexts();
    }

    private void SetVersionTexts()
    {
        try
        {
            // Try to load version info from Resources
            TextAsset versionAsset = Resources.Load<TextAsset>("version_info");
            if (versionAsset != null)
            {
                VersionInfo versionInfo = JsonUtility.FromJson<VersionInfo>(versionAsset.text);
                txt_version.text = $"v{versionInfo.versionNumber}_bv{versionInfo.buildVersion}";
                return;
            }
        }
        catch (System.Exception e)
        {
            Debug.LogWarning($"Failed to load version info: {e.Message}");
        }

        // Fallback to Application.version if version_info.txt is not available
        Debug.Log("Using fallback version from Application.version");
        txt_version.text = $"v{Application.version}";
    }


}

```
