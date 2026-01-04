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