# Unity CI Build Issue: IDE Package Certificate CRL Error - Solution Guide

## Problem Description

During Unity builds in CI/CD environments, the following error occurs:

```
An error occurred while resolving packages:
  One or more packages could not be added to the local file system:
    com.unity.ide.rider: No cache entry for certificate-crl|crl3.digicert.com/DigiCertTrustedRootG4.crl found in /root/.cache/Unity/upm/db
```

This error prevents successful package resolution and causes builds to fail, particularly in Docker containers used by CI systems like GitHub Actions.

## Root Cause Analysis

### The Issue Chain

1. **IDE Packages in Manifest**: Unity projects often include IDE-specific packages like:
   - `com.unity.ide.rider` (JetBrains Rider)
   - `com.unity.ide.visualstudio` (Visual Studio)
   - `com.unity.ide.vscode` (Visual Studio Code)

2. **Certificate Validation**: These packages attempt to download and validate security certificates during package resolution

3. **CI Environment Limitations**:
   - Docker containers have restricted network access
   - Certificate revocation lists (CRLs) may be blocked or inaccessible
   - No GUI environment for IDE interactions

4. **Build Failure**: The package manager cannot resolve dependencies due to failed certificate validation

## Solution Implemented

### Removing IDE Packages from manifest.json

Added the following step to both Android workflows before the Unity build:

```bash
- name: Remove IDE packages from manifest.json
  run: |
    sed -i '/com.unity.ide.rider/d' SkrewClient/Packages/manifest.json
    sed -i '/com.unity.ide.visualstudio/d' SkrewClient/Packages/manifest.json
    cat SkrewClient/Packages/manifest.json
```

### Why This Works

- ✅ **Removes Unnecessary Packages**: IDE packages are not needed for headless CI builds
- ✅ **Avoids Certificate Issues**: Prevents CRL download attempts in restricted environments
- ✅ **Faster Builds**: Reduces package resolution time and potential failure points
- ✅ **Clean Dependencies**: Only includes packages required for building

---

*This document explains the IDE package removal solution for Unity CI builds experiencing certificate CRL errors.*
