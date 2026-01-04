# Unity Cloud Build Issues and Solutions

This document serves as a directory and quick reference guide for common Unity build issues encountered in CI/CD environments. Each issue has its own dedicated documentation file with detailed analysis, solutions, and troubleshooting steps.

## Issues Directory

| **Issue** | **Symptoms** | **Solution Document** |
|-----------|-------------|---------------------|
| **Android SDK Manager Missing** | `No sdkmanager found`, `find: '/cmdline-tools': No such file or directory` | [→ Unity Android Build Issue Solution](Unity_Android_Build_Issue_Solution.md) |
| **IDE Package Certificate Error** | `No cache entry for certificate-crl`, Package resolution failures in Docker containers | [→ Unity IDE Package Removal Solution](Unity_IDE_Package_Removal_Solution.md) |

---

## How to Use This Guide

1. **Identify your issue** using the symptoms in the table above
2. **Click the solution document link** for detailed analysis and fixes
3. **Follow the step-by-step solutions** provided in each dedicated issue file
4. **Check the "Alternative Solutions" sections** if the primary fix doesn't work

## Contributing

If you encounter new issues or have improved solutions, please create a new issue document following the same format as the existing ones and add it to this directory table.

---

## Related Documentation

- [Prerequisites Setup](../prerequisites.md) - Complete setup requirements
- [Android Build Guide](../Android.md) - Detailed Android deployment steps
- [IOS Build Guide](../IOS.md) - Detailed IOS deployment steps

---

*This document provides a centralized directory for Unity build issues and their dedicated solution guides.*
