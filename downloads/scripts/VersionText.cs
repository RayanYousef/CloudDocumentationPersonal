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
