# conformance/fixtures

> **状态：Draft v0.15**。fixtures 已随各 spec 产出——**每一条 spec 里的"必须"都要能在这里找到抓住它的 fixture**（写作纪律第 2 条）。

## 目录结构

```text
fixtures/
├── manifest/              # 随 spec/manifest.md 产出
│   ├── valid/             # 合法 manifest 样本（minimal / full）
│   └── invalid/           # 非法样本：一个文件只违反一条规则，文件名说明违反哪条
├── host-descriptor/       # 随 spec/host-descriptor.md 产出（同样分 valid/ 与 invalid/）
├── negotiation/           # 随 spec/negotiation.md 产出：每个用例一个目录
│   └── <case>/            #   manifest.json + host-descriptor.json + expected-report.json
├── lifecycle/             # 随 spec/lifecycle.md 产出：场景化 fixture
├── events/                # 随 spec/event-envelope.md 产出：场景化 fixture
└── facet/                 # 随 spec/facet-model.md 产出：package inspection 类 fixture
    └── invalid/<case>/    #   entry.js（被检查的入口）+ scenario.json（断言描述）
```

## 约定

- **命名**：manifest / host-descriptor 的非法样本为 `invalid/<规则简称>.json`，一个文件只埋一个错，文件名说明违反哪条规则。
- **schema 可校验的 fixture**（manifest / host-descriptor / negotiation 的输入与预期报告）：`valid/` 下的样本必须通过对应 schema 校验，`invalid/` 下的样本必须被 schema 拒绝。验证命令：`npx --yes ajv-cli@5 validate -s schemas/<对应schema>.json -d <fixture>`。
- **negotiation fixtures**：协商是纯函数，每个用例目录是"输入对 + 预期输出"结构——`manifest.json` 与 `host-descriptor.json` 须各自通过对应 schema（协商的前置条件，见 [spec/negotiation.md](../../spec/negotiation.md) §2.2），`expected-report.json` 须通过 `schemas/negotiation-report.schema.json`；suites 对同一输入跑协商器，断言报告与 `expected-report.json` 一致。
- **场景化 fixture**（lifecycle/ 与 events/）：规范行为是运行时语义，JSON Schema 表达不了，所以每个文件描述一个场景：`rule`（被断言的"必须"与 spec 出处）、`steps`（suites 驱动宿主执行的动作序列）、`expect`（断言列表）。它们不是 schema 校验对象。
- **package inspection fixture**（facet/）：目录即一个最小插件包——`entry.js` 是被检查的入口文件，`scenario.json` 描述违规点与预期断言。
- **schema 表达不了的 manifest 规则**（由校验器 / suites 在 schema 校验之外断言，见 [spec/conformance.md](../../spec/conformance.md)）：
  - `manifest/invalid/duplicate-contributes-id.json`：`contributes.commands` 按 `id` 去重是跨元素语义，draft-07 无法表达——该文件能通过 schema，但必须被静态冲突检查拒绝。
  - `manifest/invalid/entry-outside-root.json`：`entry` 必须位于 package 根目录内是文件系统语义——该文件能通过 schema，但必须被路径校验拒绝。
- **RFC 0005 视图/设置/主题贡献 fixtures**（manifest/，全部 schema 可校验）：
  - `manifest/valid/views-theme.json`：含 `contributes.views`（list 型、keyed 型带 `key`、纯声明 `static` 各一）、`settings`、`themes` 的完整合法样本。
  - `manifest/invalid/unknown-view-location.json`：`location` 写了枚举之外的 `sidebar.left`。
  - `manifest/invalid/view-numeric-order.json`：view 条目带禁止的数字排序字段 `order`（被 `additionalProperties: false` 拒绝）。
  - `manifest/invalid/view-keyed-missing-key.json`：`location: chat.node`（keyed 位置）但没有 `key`（被 if/then 拒绝）。
  - `manifest/invalid/view-component-and-static.json`：`component` 与 `static` 同时出现（被 oneOf 拒绝）。
  - `manifest/invalid/theme-unknown-token.json`：`themes[].tokens` 含不以 `--dsw-` 开头的键（被 propertyNames 拒绝）。
