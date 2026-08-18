import { defineConfig } from 'vitepress'

// 文档站配置：内容就是仓库根目录的 Markdown，不单独建 docs/ 目录。
// PR 合并到 main 后 Vercel 自动重新部署，PR 本身会生成预览链接。
export default defineConfig({
  lang: 'zh-CN',
  title: 'dsh 社区标准',
  description: 'dsh 插件生态的社区互操作标准（社区 Draft v0.15，非官方）',
  cleanUrls: true,
  lastUpdated: true,
  // 文档已全部成稿：死链直接让构建失败
  ignoreDeadLinks: false,
  srcExclude: ['.github/**', '.vitepress/**', 'node_modules/**'],

  // 让各目录的 README.md 成为该目录的首页
  rewrites: {
    'README.md': 'index.md',
    'registry/README.md': 'registry/index.md',
    'research/README.md': 'research/index.md',
    'conformance/fixtures/README.md': 'conformance/fixtures/index.md',
    'conformance/suites/README.md': 'conformance/suites/index.md',
  },

  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '文档规划', link: '/docs-plan' },
      { text: '规范', link: '/spec/manifest' },
      { text: 'RFC', link: '/rfcs/0001-core-contract' },
      { text: '参与讨论', link: 'https://github.com/omdsh-dev/community' },
    ],

    sidebar: [
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
    ],

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

    socialLinks: [
      { icon: 'github', link: 'https://github.com/oh-my-dsh/dsh-community-standard' },
    ],

    footer: {
      message: '社区 Draft，非 dsh 官方标准 | MIT License',
      copyright: 'dsh-community-standard contributors',
    },
  },
})
