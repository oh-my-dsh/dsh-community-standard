import { defineConfig, type DefaultTheme } from 'vitepress'

// 文档站配置：内容就是仓库根目录的 Markdown，不单独建 docs/ 目录。
// 中文版位于根路径，英文版镜像在 en/ 目录（URL /en/ 前缀）。
// PR 合并到 main 后 Vercel 自动重新部署，PR 本身会生成预览链接。

const zhSidebar: DefaultTheme.SidebarItem[] = [
  {
    text: '开始',
    items: [
      { text: '介绍', link: '/' },
      { text: '文档规划（先读）', link: '/docs-plan' },
      { text: '版本与契约坐标', link: '/VERSIONING' },
      { text: '术语表', link: '/GLOSSARY' },
    ],
  },
  {
    text: 'RFC 提案',
    items: [
      { text: 'RFC 模板', link: '/rfcs/template' },
      { text: '0000 治理规则', link: '/rfcs/0000-governance' },
      { text: '0001 核心契约（主 RFC）', link: '/rfcs/0001-core-contract' },
      { text: '0002 Runtime/Presentation 分层', link: '/rfcs/0002-runtime-presentation' },
      { text: '0003 Service 组合', link: '/rfcs/0003-service-composition' },
      { text: '0004 溯源与诊断', link: '/rfcs/0004-provenance-diagnostics' },
    ],
  },
  {
    text: '规范（spec）',
    items: [
      { text: '插件 Manifest', link: '/spec/manifest' },
      { text: 'Host Descriptor', link: '/spec/host-descriptor' },
      { text: '协商内核', link: '/spec/negotiation' },
      { text: '生命周期', link: '/spec/lifecycle' },
      { text: '事件信封', link: '/spec/event-envelope' },
      { text: 'Facet 对象模型', link: '/spec/facet-model' },
      { text: 'Facet API 参考', link: '/spec/facet-api' },
      { text: '一致性', link: '/spec/conformance' },
    ],
  },
  {
    text: '契约注册表',
    items: [
      { text: 'Registry 说明', link: '/registry/' },
      { text: 'commands.dsh/v1alpha1', link: '/registry/capabilities/commands.dsh-v1alpha1' },
      { text: 'storage.dsh/v1alpha1', link: '/registry/capabilities/storage.dsh-v1alpha1' },
      { text: 'messages.dsh/v1alpha1', link: '/registry/events/messages.dsh-v1alpha1' },
    ],
  },
  {
    text: '指南',
    items: [
      { text: '从零开始：Hello World', link: '/guides/hello-world' },
      { text: '插件作者', link: '/guides/plugin-author' },
      { text: '宿主维护者', link: '/guides/host-maintainer' },
      { text: '迁移指南', link: '/guides/migration' },
    ],
  },
  {
    text: '一致性测试',
    items: [
      { text: 'Fixtures', link: '/conformance/fixtures/' },
      { text: '测试套件', link: '/conformance/suites/' },
    ],
  },
  {
    text: '调研',
    items: [
      { text: '调研总览', link: '/research/' },
      { text: '插件需求调研', link: '/research/dsh-plugin-needs' },
      { text: '成熟框架调研', link: '/research/mature-plugin-frameworks' },
      { text: 'VS Code 扩展模型', link: '/research/vscode-extension-model' },
      { text: 'issue #23 评论存档', link: '/research/community-issue-23-review' },
    ],
  },
  {
    text: '决策记录',
    items: [
      { text: '第一轮：issue #23', link: '/decisions/round-1-issue-23' },
      { text: '第二轮：issue #24', link: '/decisions/round-2-issue-24' },
      { text: '第三轮：discussion #2714', link: '/decisions/round-3-discussion-2714' },
    ],
  },
]

const enSidebar: DefaultTheme.SidebarItem[] = [
  {
    text: 'Getting Started',
    items: [
      { text: 'Introduction', link: '/en/' },
      { text: 'Docs Plan (read first)', link: '/en/docs-plan' },
      { text: 'Versioning & Contract Coordinates', link: '/en/VERSIONING' },
      { text: 'Glossary', link: '/en/GLOSSARY' },
    ],
  },
  {
    text: 'RFCs',
    items: [
      { text: 'RFC Template', link: '/en/rfcs/template' },
      { text: '0000 Governance', link: '/en/rfcs/0000-governance' },
      { text: '0001 Core Contract (main RFC)', link: '/en/rfcs/0001-core-contract' },
      { text: '0002 Runtime/Presentation Layers', link: '/en/rfcs/0002-runtime-presentation' },
      { text: '0003 Service Composition', link: '/en/rfcs/0003-service-composition' },
      { text: '0004 Provenance & Diagnostics', link: '/en/rfcs/0004-provenance-diagnostics' },
    ],
  },
  {
    text: 'Specification',
    items: [
      { text: 'Plugin Manifest', link: '/en/spec/manifest' },
      { text: 'Host Descriptor', link: '/en/spec/host-descriptor' },
      { text: 'Negotiation Kernel', link: '/en/spec/negotiation' },
      { text: 'Lifecycle', link: '/en/spec/lifecycle' },
      { text: 'Event Envelope', link: '/en/spec/event-envelope' },
      { text: 'Facet Object Model', link: '/en/spec/facet-model' },
      { text: 'Conformance', link: '/en/spec/conformance' },
    ],
  },
  {
    text: 'Contract Registry',
    items: [
      { text: 'Registry Overview', link: '/en/registry/' },
      { text: 'commands.dsh/v1alpha1', link: '/en/registry/capabilities/commands.dsh-v1alpha1' },
      { text: 'storage.dsh/v1alpha1', link: '/en/registry/capabilities/storage.dsh-v1alpha1' },
      { text: 'messages.dsh/v1alpha1', link: '/en/registry/events/messages.dsh-v1alpha1' },
    ],
  },
  {
    text: 'Guides',
    items: [
      { text: 'Plugin Authors', link: '/en/guides/plugin-author' },
      { text: 'Host Maintainers', link: '/en/guides/host-maintainer' },
      { text: 'Migration Guide', link: '/en/guides/migration' },
    ],
  },
  {
    text: 'Conformance Testing',
    items: [
      { text: 'Fixtures', link: '/en/conformance/fixtures/' },
      { text: 'Test Suites', link: '/en/conformance/suites/' },
    ],
  },
  {
    text: 'Research',
    items: [
      { text: 'Research Overview', link: '/en/research/' },
      { text: 'Plugin Needs Survey', link: '/en/research/dsh-plugin-needs' },
      { text: 'Mature Plugin Frameworks', link: '/en/research/mature-plugin-frameworks' },
      { text: 'VS Code Extension Model', link: '/en/research/vscode-extension-model' },
      { text: 'Issue #23 Comment Archive', link: '/en/research/community-issue-23-review' },
    ],
  },
  {
    text: 'Decision Records',
    items: [
      { text: 'Round 1: issue #23', link: '/en/decisions/round-1-issue-23' },
      { text: 'Round 2: issue #24', link: '/en/decisions/round-2-issue-24' },
      { text: 'Round 3: discussion #2714', link: '/en/decisions/round-3-discussion-2714' },
    ],
  },
]

export default defineConfig({
  cleanUrls: true,
  lastUpdated: true,
  // 文档已全部成稿：死链直接让构建失败
  ignoreDeadLinks: false,
  srcExclude: ['.github/**', '.vitepress/**', 'node_modules/**', 'fable-file/**'],

  // 让各目录的 README.md 成为该目录的首页（中英文树都适用）
  rewrites: {
    'README.md': 'index.md',
    'registry/README.md': 'registry/index.md',
    'research/README.md': 'research/index.md',
    'conformance/fixtures/README.md': 'conformance/fixtures/index.md',
    'conformance/suites/README.md': 'conformance/suites/index.md',
    'en/README.md': 'en/index.md',
    'en/registry/README.md': 'en/registry/index.md',
    'en/research/README.md': 'en/research/index.md',
    'en/conformance/fixtures/README.md': 'en/conformance/fixtures/index.md',
    'en/conformance/suites/README.md': 'en/conformance/suites/index.md',
  },

  locales: {
    root: {
      label: '简体中文',
      lang: 'zh-CN',
      title: 'dsh 社区标准',
      description: 'dsh 插件生态的社区互操作标准（社区 Draft v0.15，非官方）',
      themeConfig: {
        nav: [
          { text: '首页', link: '/' },
          { text: '文档规划', link: '/docs-plan' },
          { text: '规范', link: '/spec/manifest' },
          { text: 'RFC', link: '/rfcs/0001-core-contract' },
          { text: '参与讨论', link: 'https://github.com/omdsh-dev/community' },
        ],
        sidebar: zhSidebar,
        outline: { label: '本页目录' },
        lastUpdated: { text: '最后更新' },
        docFooter: { prev: '上一页', next: '下一页' },
        darkModeSwitchLabel: '主题',
        lightModeSwitchTitle: '切换到浅色模式',
        darkModeSwitchTitle: '切换到深色模式',
        sidebarMenuLabel: '菜单',
        returnToTopLabel: '回到顶部',
        editLink: {
          pattern: 'https://github.com/oh-my-dsh/dsh-community-standard/edit/main/:path',
          text: '在 GitHub 上编辑此页',
        },
        footer: {
          message: '社区 Draft，非 dsh 官方标准 | MIT License',
          copyright: 'dsh-community-standard contributors',
        },
      },
    },
    en: {
      label: 'English',
      lang: 'en-US',
      link: '/en/',
      title: 'dsh Community Standard',
      description: 'A community interoperability standard for the dsh plugin ecosystem (community Draft v0.15, unofficial)',
      themeConfig: {
        nav: [
          { text: 'Home', link: '/en/' },
          { text: 'Docs Plan', link: '/en/docs-plan' },
          { text: 'Spec', link: '/en/spec/manifest' },
          { text: 'RFCs', link: '/en/rfcs/0001-core-contract' },
          { text: 'Join the Discussion', link: 'https://github.com/omdsh-dev/community' },
        ],
        sidebar: enSidebar,
        outline: { label: 'On this page' },
        editLink: {
          pattern: 'https://github.com/oh-my-dsh/dsh-community-standard/edit/main/:path',
          text: 'Edit this page on GitHub',
        },
        footer: {
          message: 'Community Draft — not an official dsh standard | MIT License',
          copyright: 'dsh-community-standard contributors',
        },
      },
    },
  },

  themeConfig: {
    socialLinks: [
      { icon: 'github', link: 'https://github.com/oh-my-dsh/dsh-community-standard' },
    ],

    search: {
      provider: 'local',
      options: {
        locales: {
          root: {
            translations: {
              button: { buttonText: '搜索', buttonAriaLabel: '搜索' },
              modal: {
                displayDetails: '显示详细列表',
                resetButtonTitle: '重置搜索',
                backButtonTitle: '关闭搜索',
                noResultsText: '没有结果',
                footer: {
                  selectText: '选择',
                  selectKeyAriaLabel: '输入',
                  navigateText: '导航',
                  navigateUpKeyAriaLabel: '上箭头',
                  navigateDownKeyAriaLabel: '下箭头',
                  closeText: '关闭',
                  closeKeyAriaLabel: 'Esc',
                },
              },
            },
          },
        },
      },
    },
  },
})
