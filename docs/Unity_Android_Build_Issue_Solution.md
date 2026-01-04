# Unity Android Build Issue: "No sdkmanager found" - Solution Guide

## Problem Description

After upgrading Unity Editor to version **6000.0.58f1** or **6000.0.58f2** (Unity 6), Android builds started failing with the error. This issue has also been reported with other Unity 6 versions released after the security update that included critical patches.

```
find: '/cmdline-tools': No such file or directory
find: '/tools/bin': No such file or directory
No sdkmanager found
```

This error occurred during the `game-ci/unity-builder` step in GitHub Actions workflows, preventing successful Android APK/AAB builds.

## Root Cause Analysis

### The Issue Chain

1. **Unity 6000.0.58f1 Security Update**: The upgrade included critical security patches (CVE-2025-59489) but changed internal Android SDK handling

2. **Docker Container Isolation**: `game-ci/unity-builder` runs Unity inside a Docker container, which doesn't have access to the GitHub runner's Android SDK

3. **Missing Android SDK Tools**: The Docker container looked for `sdkmanager` in `/opt/unity/Editor/Data/PlaybackEngines/AndroidPlayer/SDK/cmdline-tools`, but this directory was missing

4. **Version Compatibility**: The `game-ci/unity-builder@v4.3.0` used initially was outdated and didn't properly support Unity 6's Android SDK requirements

## Solution Implemented

### Using Official GameCI Unity 6 Docker Images

The solution was to use the **official GameCI Unity 6 Docker image** with Android support:

```yaml
customImage: unityci/editor:ubuntu-6000.0.58f1-android-3.1.0
```

> **📍 Available Docker Images**: Check [Docker Hub - Unity CI Images](https://hub.docker.com/r/unityci/editor) for all available Unity versions and tags.

### Why This Works

- ✅ **Unity 6 Compatible**: Matches your exact Unity version (6000.0.58f1)
- ✅ **Android SDK Included**: Pre-configured Android SDK with proper paths
- ✅ **Official Image**: Maintained by GameCI team with security updates
- ✅ **Proven Solution**: Based on [GitHub issue #746](https://github.com/game-ci/unity-builder/issues/746) resolution

## Files Modified

### 1. `.github/workflows/android-aab-store.yml`
- Updated `game-ci/unity-builder` to `v4.7.0`
- Added `customImage: unityci/editor:ubuntu-6000.0.58f1-android-3.1.0`

### 2. `.github/workflows/android-apk-gdrive.yml`
- Updated `game-ci/unity-builder` to `v4.7.0`
- Added `customImage: unityci/editor:ubuntu-6000.0.58f1-android-3.1.0`

## Best Practices
### For Troubleshooting Similar Issues
1. **Try Normal Build First**: Before using custom images, try building with the default `unityci/editor` image for your Unity version to see if the issue persists
2. **Check GitHub Issues**: Search [game-ci/unity-builder issues](https://github.com/game-ci/unity-builder/issues) for your Unity version
3. **Use Latest Builder**: Keep `game-ci/unity-builder` updated to latest version
4. **Verify Docker Images**: Check [Docker Hub](https://hub.docker.com/r/unityci/editor) for your Unity version's available tags

## References

- [GameCI Unity Builder GitHub](https://github.com/game-ci/unity-builder)
- [GameCI Docker Images](https://github.com/game-ci/docker)
- [Docker Hub - Unity CI Images](https://hub.docker.com/r/unityci/editor)

---

*This document was created to document the Android build issue resolution after Unity 6000.0.58f1 upgrade.*
