# Spec: 插件 Manifest（`dsh-plugin.json`）

> **状态：Draft v0.15（社区讨论稿，非官方标准）**
> 产出物：[`schemas/dsh-plugin.schema.json`](../schemas/dsh-plugin.schema.json) + `conformance/fixtures/manifest/{valid,invalid}/`

这份文件定义插件包根目录里那份 `dsh-plugin.json` 的每一个字段：它是插件的"身份证 + 需求清单"，宿主、市场和 CI 工具**不运行插件代码**就能读懂它。插件作者写它，宿主和工具链消费它。

## 1. 适用范围

本文规定 manifest 的**文件位置、静态性要求和逐字段语义**。以下内容不在本文：

- facet 的执行细节（entry 模块格式、执行环境）→ [facet-model.md](facet-model.md)
- 契约坐标与版本规则（`apiVersion + kind`、`v1alpha1` 的含义）→ [VERSIONING.md](../VERSIONING.md)
- 契约条目的权威清单 → [registry/](../registry/README.md)
- 宿主如何用 manifest 做兼容判定 → [negotiation.md](negotiation.md)
- 事件信封字段 → [event-envelope.md](event-envelope.md)

## 2. 文件位置与命名

manifest 必须满足：

1. 文件名为 **`dsh-plugin.json`**，位于 package 根目录。违反将被 `conformance/fixtures/manifest/invalid/`（发现阶段断言，见 [conformance/suites/](../conformance/suites/)）抓住。
2. 是**静态 JSON**：禁止通过运行 JavaScript 或其他代码动态生成。违反将被 suites 的发现检查抓住。

特意不叫 `plugin.json`：[Agent Plugins Specification](https://agent-plugins.org/specification) 已把根目录 `plugin.json` 保留给它自己的 manifest contract。一个 package 可以同时携带两份文件支持两套生态，但两者不得互相覆盖或隐式扩展。

## 3. 规范性定义

### 3.1 静态性要求

- 宿主对标准管理的插件**必须**只读取静态 manifest，不得执行任何动态 manifest 代码（fixture：suites 发现阶段断言）。
- 宿主加载插件时**必须**使用本地随宿主提供的 schema，不得从网络获取 schema 或其他校验策略（fixture：suites 离线环境断言）。

### 3.2 顶层字段总览

| 字段 | 类型 | 必填 | 含义 |
| --- | --- | --- | --- |
| `$schema` | string | **是** | canonical schema identifier，宿主据此选择本地校验规则 |
| `id` | string | **是** | 插件全局唯一 ID，反向域名语法（§3.4） |
| `name` | string | **是** | 人读名称 |
| `version` | string | **是** | 插件自身的 SemVer 版本（版本维度见 [VERSIONING.md](../VERSIONING.md)） |
| `manifestVersion` | string | **是** | manifest 结构版本，v0.15 必须等于 `"0.15"`（§3.3） |
| `facets` | object | **是** | 插件在各执行位置的分面声明（§3.5） |
| `requires` | object | 否 | 依赖的契约（§3.7） |
| `permissions` | array | 否 | 申请用户/策略授权的敏感 scope（§3.8） |
| `contributes` | object | 否 | 声明式贡献元数据（§3.9） |
| `subscriptions` | array | 否 | 事件订阅（§3.10） |

顶层**必须**只包含上表字段；出现任何其他字段（包括 `provides`）必须被拒绝。fixture：`conformance/fixtures/manifest/invalid/unknown-field.json`、`conformance/fixtures/manifest/invalid/provides-rejected.json`。

### 3.3 `$schema` 与 `manifestVersion`

- `$schema` **必须**存在，且必须是宿主可识别的 canonical identifier。正式 schema 发布后，其 canonical identifier 不得被重新赋予其他内容。fixture：`conformance/fixtures/manifest/invalid/missing-schema.json`。
- `manifestVersion` **必须**与 `$schema` 选中的 schema 版本一致，不能成为另一个协商轴；v0.15 中其值**必须**为 `"0.15"`。fixture：`conformance/fixtures/manifest/invalid/wrong-manifest-version.json`。
- 当前 canonical identifier 为 `https://dsh-std.example/schemas/dsh-plugin/v0.15.json`（示意，以 Registry 定案为准）。

### 3.4 `id`：语法与命名空间所有权

- `id` **必须**是小写反向域名形式：至少两段，以点分隔，段内仅允许小写字母、数字与连字符（如 `com.example.better-sidebar`）。fixture：`conformance/fixtures/manifest/invalid/bad-id.json`。
- 插件作者**应该**只使用自己控制的域名前缀；命名空间所有权的证明与转移规则归治理流程（[RFC 0000](../rfcs/0000-governance.md)），本版不规定。
- 私有/实验性契约的坐标命名空间（`x-org.example.*` 形式）规则见 [VERSIONING.md](../VERSIONING.md)，与插件 `id` 是两个命名空间，不要混用。

### 3.5 `facets`

- `facets` **必须**包含 `host` facet；每个 facet 声明**必须**包含 `entry`（入口文件，位于 package 根目录内）与 `apiVersion`（要求的 Host API 版本）。fixture：`conformance/fixtures/manifest/invalid/missing-facets.json`。
- `client` / `worker` 是**保留名**：v0.15 manifest 出现这两个 key 必须被拒绝（归属与契约见 [RFC 0002](../rfcs/0002-runtime-presentation.md)）。fixture：`conformance/fixtures/manifest/invalid/reserved-facet-client.json`。
- v0.15 只规范 `host` facet 的完整契约；entry 的模块格式与执行环境见 [facet-model.md](facet-model.md)。

### 3.6 五类声明的语义边界

manifest 里有五种声明，语义互相独立，**不得**因为都写在一个文件里就当成同一种兼容或安全对象：

| 声明 | 含义 | v0.15 状态 |
| --- | --- | --- |
| `requires` | 插件依赖的版本化契约（required 与 optional） | 仅接受 `requires.contracts` |
| `permissions` | 需要用户或策略授权的敏感 scope；宿主支持 ≠ 已授权 | 接受（§3.8） |
| `provides` | 向其他插件或宿主导出 service / Provider contract | **拒绝**（归 [RFC 0003](../rfcs/0003-service-composition.md)） |
| `contributes` | 插件代码执行前即可发现的声明式元数据 | 仅接受 `contributes.commands` |
| `subscriptions` | eager activation 后控制事件投递；**不是**激活触发器 | 接受（§3.10） |

在 service 组合契约被接受前，v0.15 **必须**直接拒绝 `provides` 与 `requires.services`，而不是静默保存后展示成"已经生效"。fixture：`conformance/fixtures/manifest/invalid/provides-rejected.json`、`conformance/fixtures/manifest/invalid/requires-services-rejected.json`。

### 3.7 `requires.contracts`

- 数组，每个元素**必须**包含 `apiVersion` 与 `kind` 两个字段，合起来构成一个契约坐标（如 `storage.dsh/v1alpha1` + `LocalStorage`；坐标规则见 [VERSIONING.md](../VERSIONING.md)）。
- `optional` 字段可以省略，默认为 `false`（required 依赖）。
- required 契约缺失 → 拒载；optional 契约缺失 → 按声明过的降级路径运行。判定规则见 [negotiation.md](negotiation.md)。
- v0.15 的标准契约条目（`commands.dsh/v1alpha1`、`storage.dsh/v1alpha1`、`messages.dsh/v1alpha1`，均为示意，以 Registry 定案为准）以 [registry/](../registry/README.md) 为唯一权威来源；实现方不得从本文正文发明"等价"名称。

### 3.8 `permissions`

- 字符串数组，声明**契约坐标之外**的敏感 scope。
- v0.15 尚未标准化任何独立敏感 scope，此数组通常为空（`"permissions": []`）。消息观察等敏感能力的授权由 registry 条目的敏感级别驱动（见 [registry/](../registry/README.md) 与 [negotiation.md](negotiation.md)），**不要**在 `permissions` 里重复声明契约。

### 3.9 `contributes`

- v0.15 只定义 `contributes.commands`：数组，每项**必须**含 `id` 与 `title`。
- 每个 `id` **必须**在所有已安装插件间全局唯一，**应该**以插件自身 `id` 为前缀。fixture：`conformance/fixtures/manifest/invalid/duplicate-contributes-id.json`（单 manifest 内重复）。
- 宿主与市场**必须**在安装前做跨插件静态冲突检测：发现冲突时拒绝共存安装并明确报告"冲突，不能共存"，而不是加载时互相覆盖（由 suites 冲突场景断言）。
- `contributes` 只是元数据：不隐含运行时访问、授权或激活。命令 contribution 还需在 `requires.contracts` 中声明 `commands.dsh/v1alpha1`（kind: Command），插件代码只按 `id` 绑定 handler；"声明但未绑定"与"绑定但未声明"都应被开发工具与一致性测试报告（见 [conformance.md](conformance.md)）。

### 3.10 `subscriptions`

- 字符串数组，元素为**事件名**；事件的规范名由 registry 事件条目定义，实现方不得从本文正文发明"等价"名称。v0.15 唯一的标准事件的事件名是 `messages.observe`（不可修改的观察事件；契约坐标 `messages.dsh/v1alpha1`，kind: MessageObserver——示意，以 Registry 定案为准），权威条目见 [registry/events/messages.dsh-v1alpha1.md](../registry/events/messages.dsh-v1alpha1.md)，信封格式见 [event-envelope.md](event-envelope.md)。
- `subscriptions` 只控制事件投递，不是激活触发器——匹配 subscription 不会激活一个 inactive 插件（激活模型见 [lifecycle.md](lifecycle.md)）。

### 3.11 与 npm metadata 重复字段的权威来源

`name`、`version` 等字段可能与 `package.json` 重复。规则：**对标准消费方（宿主、市场、协商器），`dsh-plugin.json` 是唯一权威来源**；`package.json` 继续服务包管理器。两个文件**应该**保持一致，校验工具应该在不一致时告警。

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
| 顶层出现未定义字段 | 拒绝加载（fail closed，不静默忽略） | `invalid/unknown-field.json` |
| 出现 `provides` | 拒绝加载（归 RFC 0003） | `invalid/provides-rejected.json` |
| 出现 `requires.services` | 拒绝加载（归 RFC 0003） | `invalid/requires-services-rejected.json` |
| 出现保留 facet 名 `client` / `worker` | 拒绝加载（归 RFC 0002） | `invalid/reserved-facet-client.json` |
| `contributes` 内 `id` 重复 | 拒绝加载 | `invalid/duplicate-contributes-id.json` |
| 跨插件 `contributes.id` 冲突 | 安装前拒装，报告"冲突，不能共存" | suites 冲突场景 |
| manifest 不是静态 JSON / 需运代码生成 | 不参与标准管理加载 | suites 发现阶段断言 |

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

其中 `duplicate-contributes-id.json`（按 `id` 去重是跨元素语义）与 `entry-outside-root.json`（根目录内是文件系统语义）无法由 JSON Schema 表达：两者能通过 schema 校验，但必须被校验器在 schema 之外的静态检查拒绝（约定见 [conformance/fixtures/README.md](../conformance/fixtures/README.md)）。

## 7. 变更记录

| 版本 | 变更 |
| --- | --- |
| v0.15 | 首版成稿。契约引用全面转向 `apiVersion + kind` 坐标；引入 `facets`（本轮仅 `host`）；五类声明语义冻结，`provides` / `requires.services` 明确拒绝。源自 v0.1 设计稿 §3.1/§4.1 与第二轮讨论处置（[decisions/round-2](../decisions/round-2-issue-24.md)）。 |
