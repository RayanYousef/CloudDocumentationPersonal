/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  docsSidebar: [
    {
      type: 'category',
      label: 'Getting Started',
      collapsed: false,
      items: [
        'intro',
        'prerequisites',
      ],
    },
    {
      type: 'category',
      label: 'Platforms',
      collapsed: false,
      items: [
        'platforms/Android',
        'platforms/IOS',
        'platforms/IOS_APNS_CODE_SIGNING',
        'platforms/IOS_CocoaPods_Workflow',
      ],
    },
    {
      type: 'category',
      label: 'Troubleshooting',
      collapsed: true,
      items: [
        'troubleshooting/Issues_and_Solutions',
        'troubleshooting/Unity_Android_Build_Issue_Solution',
        'troubleshooting/Unity_IDE_Package_Removal_Solution',
      ],
    },
    {
      type: 'category',
      label: 'Reference',
      collapsed: false,
      items: [
        'reference/scripts',
        'reference/workflows',
      ],
    },
  ],
};

export default sidebars;
