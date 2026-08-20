# Spec: 插件 Manifest（`dsh-plugin.json`）

> **状态：Draft v0.15（社区讨论稿，非官方标准）**
> 产出物：[`schemas/dsh-plugin.schema.json`](../schemas/dsh-plugin.schema.json) + `conformance/fixtures/manifest/{valid,invalid}/`
> 每条"必须"对应的测试样本，统一列在文末 [§5 错误表](#5-错误与边界情况) 和 [§6 fixtures 清单](#6-对应-fixtures-清单)，正文不再逐条标注。

`dsh-plugin.json` 是插件的"身份证 + 需求清单"：放在包根目录，宿主、市场和 CI 工具**不运行插件代码**就能读懂它——这个插件是谁、需要什么能力、往产品里贡献了什么。插件作者写它，宿主和工具链消费它。

为什么非要一个静态文件？因为今天的现实是：用户在 TUI 里装一个需要图形界面的插件，唯一的"报错方式"是崩溃。有了 manifest，"装上才知道炸"变成"装之前就知道装不了"。

## 1. 适用范围

本文规定 manifest 的**文件位置、静态性要求和逐字段语义**。以下内容不在本文：

- facet 的执行细节（entry 模块格式、执行环境）→ [facet-model.md](facet-model.md)
- 契约坐标与版本规则（`apiVersion + kind`、`v1alpha1` 的含义）→ [VERSIONING.md](../VERSIONING.md)
- 契约条目的权威清单 → [registry/](../registry/README.md)
- 宿主如何用 manifest 做兼容判定 → [negotiation.md](negotiation.md)
- 事件信封字段 → [event-envelope.md](event-envelope.md)

## 2. 文件位置与命名

manifest 必须满足两条：

1. 文件名为 **`dsh-plugin.json`**，位于 package 根目录。
2. 是**静态 JSON**：禁止通过运行 JavaScript 或其他代码动态生成。

为什么特意不叫 `plugin.json`：[Agent Plugins Specification](https://agent-plugins.org/specification) 已经把根目录的 `plugin.json` 保留给它自己的 manifest 格式了。一个 package 可以同时携带两份文件、支持两套生态，但两者不得互相覆盖或隐式扩展。

## 3. 规范性定义

### 3.1 静态性要求

- 宿主对标准管理的插件**必须**只读取静态 manifest，不得执行任何动态 manifest 代码。
- 宿主加载插件时**必须**使用本地随宿主提供的 schema，不得从网络获取 schema 或其他校验策略。断网状态下校验必须照常工作。

### 3.2 顶层字段总览

| 字段 | 类型 | 必填 | 含义 |
| --- | --- | --- | --- |
| `$schema` | string | **是** | canonical schema identifier——一个固定的标识 URL，宿主据此选择本地校验规则（§3.3） |
| `id` | string | **是** | 插件全局唯一 ID，反向域名语法（§3.4） |
| `name` | string | **是** | 人读名称 |
| `version` | string | **是** | 插件自身的 SemVer 版本（六个版本维度见 [VERSIONING.md](../VERSIONING.md)） |
| `manifestVersion` | string | **是** | manifest 结构版本，v0.15 必须等于 `"0.15"`（§3.3） |
| `facets` | object | **是** | 插件在各执行位置的分面声明（§3.5） |
| `requires` | object | 否 | 依赖的契约（§3.7） |
| `permissions` | array | 否 | 申请用户/策略授权的敏感 scope（§3.8） |
| `contributes` | object | 否 | 声明式贡献元数据（§3.9） |
| `subscriptions` | array | 否 | 事件订阅（§3.10） |

顶层**必须**只包含上表字段。出现任何其他字段——包括 `provides`——必须被拒绝，而不是静默忽略。理由：静默忽略未知字段，等于允许"半兼容"的 manifest 悄悄流通，作者以为声明生效了，实际上没有。

### 3.3 `$schema` 与 `manifestVersion`

- `$schema` **必须**存在，且必须是宿主可识别的 canonical identifier。正式 schema 发布后，这个标识不得被重新赋予其他内容——它是永久门牌号，不是可回收的域名。
- `manifestVersion` **必须**与 `$schema` 选中的 schema 版本一致；v0.15 中其值**必须**为 `"0.15"`。它是给人和工具快速看的版本标签，不是另一个可以独立协商的版本轴。
- 当前 canonical identifier 为 `https://dsh-std.example/schemas/dsh-plugin/v0.15.json`（示意，以 Registry 定案为准）。

### 3.4 `id`：语法与命名空间所有权

- `id` **必须**是小写反向域名形式：至少两段，以点分隔，段内仅允许小写字母、数字与连字符。例如 `com.example.better-sidebar`。
- 为什么用反向域名：全局唯一的 id 让工具可以在**装之前**做冲突检测（见 §3.9），而"用自己控制的域名"是最不需要中心协调就能保证唯一的办法。
- 插件作者**应该**只使用自己控制的域名前缀；命名空间所有权的证明与转移规则归治理流程（[RFC 0000](../rfcs/0000-governance.md)），本版不规定。
- 注意区分两个命名空间：插件 `id` 是这里说的反向域名；私有契约坐标用的是 `x-org.example.*` 形式（规则见 [VERSIONING.md](../VERSIONING.md)）。两者长得像，但不要混用。

### 3.5 `facets`

facet 是插件在某个执行位置的"分身"（完整对象模型见 [facet-model.md](facet-model.md)）。v0.15 规则：

- `facets` **必须**包含 `host` facet；每个 facet 声明**必须**包含 `entry`（入口文件，位于 package 根目录内）与 `apiVersion`（要求的 Host API 版本）。
- `client` / `worker` 是**保留名**：v0.15 manifest 出现这两个 key 必须被拒绝。它们的语义要等 [RFC 0002](../rfcs/0002-runtime-presentation.md) 定案——现在接受它们，等于让插件依赖一个还不存在的行为。

### 3.6 五类声明的语义边界

manifest 里有五种声明。它们写在同一个文件里，但语义互相独立，**不得**当成同一种兼容或安全对象——"声明了权限"不等于"拿到了授权"，"贡献了命令"不等于"命令能跑"：

| 声明 | 一句话含义 | v0.15 状态 |
| --- | --- | --- |
| `requires` | 我依赖哪些版本化契约（分 required 和 optional） | 仅接受 `requires.contracts` |
| `permissions` | 我申请哪些需要用户或策略点头的敏感 scope；宿主支持 ≠ 已授权 | 接受（§3.8） |
| `provides` | 我能向其他插件或宿主导出什么 service | **拒绝**（归 [RFC 0003](../rfcs/0003-service-composition.md)） |
| `contributes` | 不执行我的代码就能发现的元数据（命令、面板……） | 仅接受 `contributes.commands` |
| `subscriptions` | 激活之后给我投递哪些事件；**不是**激活触发器 | 接受（§3.10） |

在插件间 service 的组合规则（谁提供、冲突怎么办、坏了怎么换）被 RFC 0003 定义之前，v0.15 **必须**直接拒绝 `provides` 与 `requires.services`——而不是静默保存后展示成"已经生效"。

### 3.7 `requires.contracts`

- 数组，每个元素**必须**包含 `apiVersion` 与 `kind` 两个字段。这两个字段合起来叫**契约坐标**——能力的唯一门牌号，例如 `storage.dsh/v1alpha1` + `LocalStorage`（坐标规则见 [VERSIONING.md](../VERSIONING.md)）。
- `optional` 字段可以省略，默认为 `false`（required 依赖）。
- 两种缺失，两种结局：required 契约缺失 → 装之前拒载；optional 契约缺失 → 插件照常激活，按声明过的降级路径运行。判定规则见 [negotiation.md](negotiation.md)。
- v0.15 的标准契约条目（`commands.dsh/v1alpha1`、`storage.dsh/v1alpha1`、`messages.dsh/v1alpha1`，均为示意）以 [registry/](../registry/README.md) 为唯一权威来源；实现方不得从本文正文发明"等价"名称。

### 3.8 `permissions`

- 字符串数组，声明**契约坐标之外**的敏感 scope。
- v0.15 尚未标准化任何独立敏感 scope，此数组通常为空（`"permissions": []`）。消息观察等敏感能力的授权由 registry 条目的敏感级别驱动（见 [registry/](../registry/README.md) 与 [negotiation.md](negotiation.md)），**不要**在 `permissions` 里重复声明契约。

### 3.9 `contributes`

- v0.15 只定义 `contributes.commands`：数组，每项**必须**含 `id` 与 `title`。
- 每个 `id` **必须**在所有已安装插件间全局唯一，**应该**以插件自身 `id` 为前缀。
- 宿主与市场**必须**在安装前做跨插件静态冲突检测：两个插件贡献了同一个 id，装之前就报"冲突，不能共存"——而不是加载时互相覆盖、谁后加载谁赢。
- `contributes` 只是元数据：不隐含运行时访问、授权或激活。命令 contribution 还需在 `requires.contracts` 中声明 `commands.dsh/v1alpha1`（kind: Command），插件代码只按 `id` 绑定 handler。"声明了但没绑定"和"绑定了但没声明"都是不一致，应被开发工具与一致性测试报告（见 [conformance.md](conformance.md)）。

### 3.10 `subscriptions`

- 字符串数组，元素为**事件名**。事件的规范名由 registry 事件条目定义，实现方不得发明"等价"名称。v0.15 唯一的标准事件名是 `messages.observe`（不可修改的观察事件；契约坐标 `messages.dsh/v1alpha1`，kind: MessageObserver——示意，以 Registry 定案为准）。权威条目见 [registry/events/messages.dsh-v1alpha1.md](../registry/events/messages.dsh-v1alpha1.md)，信封格式见 [event-envelope.md](event-envelope.md)。
- 划重点：`subscriptions` 只控制**事件投递给谁**，不是激活触发器——事件命中一个还没激活的插件，不会把它叫醒（激活模型见 [lifecycle.md](lifecycle.md)）。

### 3.11 与 npm metadata 重复字段的权威来源

`name`、`version` 等字段可能与 `package.json` 重复。规则一句话：**对标准消费方（宿主、市场、协商器），`dsh-plugin.json` 是唯一权威来源**；`package.json` 继续服务包管理器。两个文件**应该**保持一致，校验工具应该在不一致时告警。

## 4. 示例

一份声明齐全的 v0.15 manifest（即 `conformance/fixtures/manifest/valid/full.json` 的内容；坐标与 URL 均为示意，以 Registry 定案为准）：

```json
{
  "$schema": "https://dsh-std.example/schemas/dsh-plugin/v0.15.json",
  "id": "com.example.better-sidebar",
  "name": "Better Sidebar",
  "version": "1.2.0",
  "manifestVersion": "0.15",
  "facets": {
    "host": { "entry": "dist/host.js", "apiVersion": "v1alpha1" }
  },
  "requires": {
    "contracts": [
      { "apiVersion": "storage.dsh/v1alpha1", "kind": "LocalStorage" },
      { "apiVersion": "messages.dsh/v1alpha1", "kind": "MessageObserver", "optional": true }
    ]
  },
  "permissions": [],
  "contributes": {
    "commands": [{ "id": "com.example.better-sidebar.toggle", "title": "Toggle Sidebar" }]
  },
  "subscriptions": ["messages.observe"]
}
```

最小合法 manifest 只需 `$schema`、`id`、`name`、`version`、`manifestVersion`、`facets` 六个字段（见 `conformance/fixtures/manifest/valid/minimal.json`）。

## 5. 错误与边界情况

| 情况 | 规定行为 | 抓住它的 fixture / 测试 |
| --- | --- | --- |
| 缺 `$schema` 或值不可识别 | 拒绝加载 | `invalid/missing-schema.json` |
| `manifestVersion` 与 `$schema` 不一致 | 拒绝加载 | `invalid/wrong-manifest-version.json` |
| 缺 `facets` 或缺 `host` facet | 拒绝加载 | `invalid/missing-facets.json` |
| `id` 不符合反向域名语法 | 拒绝加载 | `invalid/bad-id.json` |
| 顶层出现未定义字段 | 拒绝加载（fail closed——宁可拒绝也不静默忽略） | `invalid/unknown-field.json` |
| 出现 `provides` | 拒绝加载（归 RFC 0003） | `invalid/provides-rejected.json` |
| 出现 `requires.services` | 拒绝加载（归 RFC 0003） | `invalid/requires-services-rejected.json` |
| 出现保留 facet 名 `client` / `worker` | 拒绝加载（归 RFC 0002） | `invalid/reserved-facet-client.json` |
| `contributes` 内 `id` 重复 | 拒绝加载 | `invalid/duplicate-contributes-id.json` |
| 跨插件 `contributes.id` 冲突 | 安装前拒装，报告"冲突，不能共存" | suites 冲突场景 |
| entry 路径越出包根目录 | 拒绝加载 | `invalid/entry-outside-root.json` |
| manifest 不是静态 JSON / 需运行代码生成 | 不参与标准管理加载 | suites 发现阶段断言 |
| 断网环境下校验 | 必须照常工作（不联网取 schema） | suites 离线环境断言 |

## 6. 对应 fixtures 清单

fixtures 由后续任务创建，路径约定如下（非法样本一个文件只违反一条规则）：

- `conformance/fixtures/manifest/valid/minimal.json`
- `conformance/fixtures/manifest/valid/full.json`
- `conformance/fixtures/manifest/invalid/missing-schema.json`
- `conformance/fixtures/manifest/invalid/wrong-manifest-version.json`
- `conformance/fixtures/manifest/invalid/missing-facets.json`
- `conformance/fixtures/manifest/invalid/bad-id.json`
- `conformance/fixtures/manifest/invalid/unknown-field.json`
- `conformance/fixtures/manifest/invalid/provides-rejected.json`
- `conformance/fixtures/manifest/invalid/requires-services-rejected.json`
- `conformance/fixtures/manifest/invalid/reserved-facet-client.json`
- `conformance/fixtures/manifest/invalid/duplicate-contributes-id.json`
- `conformance/fixtures/manifest/invalid/entry-outside-root.json`

两个特殊样本：`duplicate-contributes-id.json`（按 `id` 去重是跨元素语义）与 `entry-outside-root.json`（"位于根目录内"是文件系统语义）**无法由 JSON Schema 表达**——它们能通过 schema 校验，但必须被校验器在 schema 之外的静态检查拒绝（约定见 [conformance/fixtures/README.md](../conformance/fixtures/README.md)）。

## 7. 变更记录

| 版本 | 变更 |
| --- | --- |
| v0.15 | 首版成稿。契约引用全面转向 `apiVersion + kind` 坐标；引入 `facets`（本轮仅 `host`）；五类声明语义冻结，`provides` / `requires.services` 明确拒绝。源自 v0.1 设计稿 §3.1/§4.1 与第二轮讨论处置（[decisions/round-2](../decisions/round-2-issue-24.md)）。 |
