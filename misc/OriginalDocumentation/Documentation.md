# [Github Actions & Workflows]{.underline}

# Build For IOS

# [Bui\`ld For Android]{.underline}

**Actions & Workflows**

# Actions & Workflows

###### 

## Creating a YML File for Action Workflow:

1.  Open the desired project repository and then navigate to actions:

2.  ![](Github Cloud Build Configuration\media/media/image3.png){width="12.583333333333334in" height="0.9791666666666666in"}

3.  ![](Github Cloud Build Configuration\media/media/image2.png){width="11.90625in" height="1.96875in"}

4.  ![](Github Cloud Build Configuration\media/media/image1.png){width="13.927083333333334in" height="2.9583333333333335in"}

5.  ![](Github Cloud Build Configuration\media/media/image6.png){width="7.833333333333333in" height="0.75in"}

6.  Assign a name to your workflow

7.  Write the workflow code, check the preset codes [\[Here\]]{.underline}.

## Notes:

a.  When running a workflow for the first time, GitHub Actions generates a cache that speeds up subsequent runs by reusing previously computed data (e.g., Unity\'s Library folder). This cache remains valid for **7 days**. If no workflow run accesses the cache within this period, the cache expires and is permanently deleted.\[[[Source]{.underline}](https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/caching-dependencies-to-speed-up-workflows#usage-limits-and-eviction-policy)\]

    i.  **Tip:** To keep the cache alive, ensure that your workflow runs at least once a week, or schedule a periodic run to refresh the cache.

**Workflow Presets**

Workflow Presets

Notes:

**Workflow codes will not function without properly setting up their secrets and environment variables. It is essential to follow the setup instructions carefully; otherwise, the workflow code may fail to work as expected.**

# [AndroirdToStore.yml]{.underline}

## Set Up Instructions:

> Navigate to GitHub \> \<Your repository\> \> Settings \> Secrets and Variables \> Actions.

### **Setting Secrets (UNITY_LICENSE)**

a.  Get the license data by following the instructions in the [[link]{.underline}](https://game.ci/docs/github/activation#personal-license).

b.  Create a secret for **UNITY_LICENSE** and add the license data in it.

### **Setting Secrets (UNITY_EMAIL & UNITY_PASSWORD)**

a.  Create a secret for **Unity_Email** and Enter the email address associated with your Unity account

b.  Create a secret for **UNITY_PASSWORD** and Enter the password for your Unity account

### **Setting Secrets (SERVICE_ACCOUNT_JSON)**

a.  Create a secret for **SERVICE_ACCOUNT_JSON** and add the JSON data we downloaded from [[\[HERE\]]{.underline}](#creating-a-yml-file-for-action-workflow)

### **Setting (androidKeystorePass & androidKeyaliasPass)**

a.  To set up the **androidKeystorePass** and **androidKeyaliasPass** secrets, follow the instructions provided in the [[\[link\]]{.underline}](#keystore-management) to create the keystore data.

### **Setting packageName**

a.  The package name is created during the process of generating the keystore data. Follow the steps outlined in this [[\[link/step\].]{.underline}](#keystore-management)

### **Setting env(setting_versionNumber & setting_androidBuildVersion)**

a.  This is updated through the file **CloudBuildSettings.txt**. ENSURE UPDATING IT BEFORE COMMENCING CLOUD BUILDING**:**

    i.  Modify the [[CloudBuildSettings.txt]{.underline}](https://drive.google.com/file/d/1_1Ko0OIFugzIzDIZpkQc32xGZQTyefu7/view?usp=drive_link) file in the project folder as needed.

    ii. Commit the changes to your version control system.

    iii. Run the action to apply the updates.

### **Setting Track:**

> Internal/Release -\> Check them up
>
> Check Draft as well.

## Possible Errors:

- **API hasn't been enabled:** Enable it from your Google Cloud account..![](Github Cloud Build Configuration\media/media/image5.png){width="12.78125in" height="0.8541666666666666in"}

- **An unknown error:** This error could be caused by secrets.SERVICE_ACCOUNT_JSON not being set up correctly. While other reasons may exist, start by checking this first during debugging.\
  ![](Github Cloud Build Configuration\media/media/image4.png){width="4.854166666666667in" height="0.8958333333333334in"}

##  

# 

**AndroidToStore.yml**

name: ToStore - Automated Build - Android

on:

workflow_dispatch:

env:

UNITY_LICENSE: \${{ [[secrets.UNITY_LICENSE]{.underline}](#setting-secrets-unity_license) }}

jobs:

buildAndroid:

name: Build for Android 🖥️

runs-on: ubuntu-22.04

timeout-minutes: 220

strategy:

fail-fast: false

steps:

\- name: Delete huge unnecessary tools folder

run: rm -rf /opt/hostedtoolcache

\- name: Free Disk Space (Ubuntu)

uses: jlumbroso/free-disk-space@main

with:

\# this might remove tools that are actually needed,

\# if set to \"true\" but frees about 6 GB

tool-cache: false

\# all of these default to true, but feel free to set to

\# \"false\" if necessary for your workflow

android: false

dotnet: false

haskell: true

large-packages: true

docker-images: true

swap-storage: false

\- name: Checkout code

uses: actions/checkout@v4

with:

ref: main

lfs: true

\- name: Create LFS file list

run: git lfs ls-files -l \| cut -d\' \' -f1 \| sort \> .lfs-assets-id

\- name: Restore LFS cache

uses: actions/cache@v3

id: lfs-cache

with:

path: .git/lfs

key: \${{ runner.os }}-lfs-\${{ hashFiles(\'.lfs-assets-id\') }}

\- name: Git LFS Pull

run: \|

git lfs pull

git add .

git reset \--hard

\- name: Restore Library cache

uses: actions/cache@v3

with:

path: Library

key: Library-build-Android

restore-keys: \|

Library-build-Android

Library-build-

Library-

\- uses: game-ci/unity-builder@v4

id: myBuildStep

env:

UNITY_LICENSE: \${{ [[secrets.UNITY_LICENSE]{.underline}](#setting-secrets-unity_license) }}

UNITY_EMAIL: \${{ [[secrets.UNITY_EMAIL]{.underline}](#setting-secrets-unity_email-unity_password) }}

UNITY_PASSWORD: \${{ [[secrets.UNITY_PASSWORD]{.underline}](#setting-secrets-unity_email-unity_password) }}

with:

targetPlatform: Android

androidExportType: \'androidAppBundle\'

buildName: Build_Android_auto

versioning : None

androidVersionCode : 0

#Change them to your project's keystore data

[[androidKeystorePass]{.underline}](#setting-androidkeystorepass-androidkeyaliaspass): YOUR_ANDROID_KEYSTORE_PASSWORD

[[androidKeyaliasPass]{.underline}](#setting-androidkeystorepass-androidkeyaliaspass): YOUR_ANDROID_KEY_ALIAS_PASSWORD

\- name: check folders (can be removed)

run: \|

ls -a

cd build

ls -a

cd Android

ls -a

\- name: JSON to variables

uses: rgarcia-phi/json-to-variables@v1.1.0

with:

filename: \'CloudBuildSettings.txt\'

prefix: setting

\- uses: [[r0adkll/upload-google-play@v1.0.19]{.underline}](https://github.com/r0adkll/upload-google-play?tab=readme-ov-file)

with:

serviceAccountJsonPlainText: \${{ [[secrets.SERVICE_ACCOUNT_JSON]{.underline}](#setting-secrets-service_account_json) }}

[[packageName]{.underline}](#setting-packagename): YOUR_PACKAGE_NAME

releaseFiles: build/Android/Build_Android_auto.aab

whatsNewDirectory: Whatsnew

track: [[internal]{.underline}](#setting-track)

status: draft

releaseName: v\${{ env.setting_versionNumber }}\_bv\${{ env.setting_androidBuildVersion }}

notify:

permissions: read-all #required for the tool to read the push data

name: Discord Notification

runs-on: ubuntu-latest

needs: \# make sure the notification is sent AFTER the jobs you want included have completed

\- buildAndroid

if: \${{ success() \|\| failure() }} \# notified: success, failure

steps:

\- name: Notify

uses: nobrayner/discord-webhook@v1

with:

github-token: \${{ secrets.github_token }}

discord-webhook: \${{ secrets.DISCORD_WEBHOOK }}

username: \'Build Automator\'

include-details: true

**Build For Android**

# Build For Android

> Important Note:

- **The package name in the Play Store is determined by the package name of the very first build (AAB) uploaded to Google Play Store. Once set, it cannot be changed, so ensure it is correctly set in Unity Player Settings (com.CompanyName.AppName).**

## Google Cloud Console Setup:

1.  [[Create a Google Cloud Project.]{.underline}](https://console.cloud.google.com)

    a.  Name the project after your application.

2.  [[Create a Service Account.]{.underline}](https://console.cloud.google.com/iam-admin)

    a.  Assign **Admin/Owner** permissions to the service account.

    b.  Navigate to **Manage Keys** \> **Create Key** \> **JSON**, then download the key file. (in ServiceAccounts)

3.  Add Service Account Key to Repository.

    a.  Upload the downloaded JSON key to your repository\'s secrets as SERVICE_ACCOUNT_JSON.

## Google Play Console Setup

1.  [[Grant Service Account Permissions.]{.underline}](https://www.youtube.com/watch?v=oV5WGIJby8U)

    a.  Grant **Admin Access** to the service account you created in Google Cloud.

2.  Configure App Permissions

    a.  Enable required **App Permissions** and **Account Permissions** for the service account. (admin access)

        i.  This is found in google play console home screen/Users and Permissions (not in the app page)

3.  Link the Google Cloud Project.

    a.  Link the Google Cloud Project to your app under **App Integrity** in the Play Console.

## Unity Settings:

a.  Set Unity\'s minimum API level to 29 and target API level to 35 or 34

    i.  Keep in mind that these settings may need to be adjusted based on Google Play Store requirements or issues encountered during deployment.

## Cloud Build Settings:

a.  Application and Build Version Management.

    i.  Store the **Application Version Number** and **Build Version Number** in a text file named [[CloudBuildSettings.txt]{.underline}](https://drive.google.com/file/d/1_1Ko0OIFugzIzDIZpkQc32xGZQTyefu7/view?usp=sharing) located in the repository root folder.

    ii. Update the values in this file manually and push it to the repo before initiating a new build.

    iii. The content of this file must be in JSON format. Refer to the provided \[[[LINK]{.underline}](https://drive.google.com/file/d/1_1Ko0OIFugzIzDIZpkQc32xGZQTyefu7/view?usp=sharing)\] for the exact structure.

    iv. Create a folder named "[[whatsnew]{.underline}](https://drive.google.com/drive/folders/1UPPSXQPeIpiKXl7WPiGCKfhM9MNSNCSB?usp=drive_link)" in the root directory of the project. (located alongside the Assets folder) Inside the "whatsnew" folder, add the following file [[whatsnew-en-US]{.underline}](https://drive.google.com/file/d/1i7lZYKfFbDWc3-SDxVsoe38yGZ2S2Fdq/view?usp=drive_link). (This file name starts with small "w" the folder name can start with Capital or Small, just make sure it is exactly the same as in the YML file)

## Keystore Management

1.  Generate a Keystore in Unity.

    a.  In Unity, go to **Project Settings** \> **Publishing Settings** \> **Keystore Manager**.

    b.  Generate a keystore at Assets\\\_Release\\GooglePlay\\user.keystore.

2.  Create a Keystore Data File.

    a.  Save the keystore information in a text file named **KeystoreData**.

    b.  Follow the format provided in the \[[[LINK]{.underline}](https://drive.google.com/file/d/1B3V2bMWMzeNVYXpgG8Wh-7TeOKS30Zs6/view?usp=drive_link)\].

3.  Deploy The First Build.

    a.  Manually deploy the first build to Google Play to establish the Bundle ID. (Build App Bundle) Check the important notes above before commencing this.

**preBuildscript**

using System;

using System.IO;

using UnityEditor;

using UnityEditor.Build;

using UnityEditor.Build.Reporting;

using UnityEngine;

#if UNITY_IOS

using UnityEditor.iOS.Xcode;

#endif

/// \<summary\>

/// Used mainly for cloud build

/// Auto incremeant android and ios per build

/// \</summary\>

internal class CustomBuildProcessor : IPreprocessBuildWithReport, IPostprocessBuildWithReport

{

//Text file next to the asset and libary folders

private const string fileName = \"CloudBuildSettings.txt\";

private CloudBuildData cloudBuildData;

private string path;

const string Android_keystorePw = \"YOUR_ANDROID_KEYSTORE_PASSWORD\";

const string Android_aliasPw = \"YOUR_ANDROID_KEY_ALIAS_PASSWORD\";

\[System.Serializable\]

private struct CloudBuildData

{

public string versionNumber;

public int androidBuildVersion;

public int IOSBuildVersion;

public bool AutoIncremeantVersionNumber;

public bool AutoIncremeantAndroid;

public bool AutoIncremeantIOS;

public string BuildBranch;

}

public int callbackOrder

{ get { return 0; } }

public void OnPostprocessBuild(BuildReport report)

{

string path = Application.dataPath;

path = path.Remove(path.Length - 6) + fileName;

string buildInfo = \"Build Ended With result : \" + report.summary.result + \"\\\\n\";

buildInfo += \"Build size : \" + report.summary.totalSize;

#if UNITY_IOS

IOSPlistUpdate(report.summary.outputPath);

#endif

}

public void OnPreprocessBuild(BuildReport report)

{

GetFilePath();

ReadJsonData();

SetupProjectSetting();

SaveUpdatedData();

Debug.Log(\"MyCustomBuildProcessor.OnPreprocessBuild for target \" + report.summary.platform + \" at path \" + report.summary.outputPath);

}

private void GetFilePath()

{

path = Application.dataPath;

path = path.Remove(path.Length - 6) + fileName;

}

private void ReadJsonData()

{

string text = File.ReadAllText(path);

cloudBuildData = JsonUtility.FromJson\<CloudBuildData\>(text);

}

private void SetupProjectSetting()

{

//cloudBuildData.versionNumber = PlayerSettings.bundleVersion;

//cloudBuildData.androidBuildVersion = PlayerSettings.Android.bundleVersionCode;

//cloudBuildData.IOSBuildVersion = int.Parse(PlayerSettings.iOS.buildNumber);

////will only increament if the settings in text file allow it

//if (cloudBuildData.AutoIncremeantVersionNumber)

//{

// //separate the input in integer part and decimal part

// //and only increase the decimal part by one .. so the integer will increase unless manually

// //for example 0.9 will become 0.10

// string\[\] strArr = cloudBuildData.versionNumber.Split(\'.\');

// cloudBuildData.versionNumber = strArr\[0\]+ \'.\' + (int.Parse(strArr\[1\]) + 1 ).ToString();

//}

//if (cloudBuildData.AutoIncremeantAndroid)

//{

// cloudBuildData.androidBuildVersion += 1;

//}

//if (cloudBuildData.AutoIncremeantIOS)

//{

// cloudBuildData.IOSBuildVersion += 1;

//}

PlayerSettings.bundleVersion = cloudBuildData.versionNumber;

PlayerSettings.Android.bundleVersionCode = cloudBuildData.androidBuildVersion;

PlayerSettings.iOS.buildNumber = cloudBuildData.IOSBuildVersion.ToString();

//Assigning Keystore pw

PlayerSettings.keystorePass = Android_keystorePw;

PlayerSettings.keyaliasPass = Android_aliasPw;

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

string plistPath = pPath + \"/Info.plist\";

PlistDocument plist = new PlistDocument();

plist.ReadFromString(File.ReadAllText(plistPath));

// Get root

PlistElementDict rootDict = plist.root;

// Add key with value

var buildKey = \"method\";

rootDict.SetString(buildKey,\"app-store\");

// Add key with value

buildKey = \"provisioningProfiles\";

rootDict.CreateDict(buildKey).SetString(\"YOUR_IOS_BUNDLE_IDENTIFIER\",

PlayerSettings.iOS.iOSManualProvisioningProfileID);

// Write to file

File.WriteAllText(plistPath, plist.WriteToString());

}

#endif

}
