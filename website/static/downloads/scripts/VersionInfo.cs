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
