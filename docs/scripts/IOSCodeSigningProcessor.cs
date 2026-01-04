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