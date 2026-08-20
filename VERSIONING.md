# 版本与契约坐标（Versioning）

> **状态：Draft v0.15（社区讨论稿，非官方标准）**

这份文件管一件事：这个标准里所有的"版本号"分别是什么意思、什么时候变、变了谁受影响。这是整个标准最容易被搞混的地方，所以单独成篇。**插件作者、宿主维护者、工具作者都该读**——读完你应该能回答："我要改的这个东西，该动哪个版本号？"

## 1. 六个版本维度

这个生态里同时存在六个版本，它们**不许混成一个字段**：

| # | 版本 | 含义 | 谁来动它 | 示例 |
| --- | --- | --- | --- | --- |
| 1 | 插件 `version` | 插件自身的 SemVer 版本 | 插件作者每次发版 | `"version": "1.2.0"` |
| 2 | `manifestVersion` | `dsh-plugin.json` 文件结构的版本 | 标准修订 manifest 结构时 | `"manifestVersion": "0.15"` |
| 3 | facet `apiVersion` | 插件 facet 要求的宿主 API 兼容范围 | 标准修订 facet 宿主 API 时 | 见 [spec/facet-model.md](spec/facet-model.md) |
| 4 | 领域契约版本 | 契约坐标（`apiVersion + kind`）里的 `apiVersion`，每项契约**独立演进** | 该契约自身修订时 | `commands.dsh/v1alpha1` |
| 5 | 宿主产品版本 | GUI / Web UI / TUI / 启动器各自的产品版本 | 宿主各自发版 | `dsh-webui 1.4.0` |
| 6 | SDK 发布版本 | 类型定义与开发工具包的发布版本 | SDK 每次发版 | `@dsh-std/sdk@0.15.2`（示意，以 Registry 定案为准） |

### 1.1 速查：我要改 X，该动哪个号？

| 场景 | 动哪个号 | 说明 |
| --- | --- | --- |
| 插件修 bug / 加功能，发新版 | #1 插件 `version` | 正常 SemVer，别的都不用碰 |
| 插件想用某契约的新版本 | manifest 里 `requires` 的坐标 | 改的是声明的坐标（#4 的引用），不是任何版本字段本身 |
| 标准调整了 manifest 的字段结构 | #2 `manifestVersion`（随标准版本） | 由标准修订触发，插件作者跟进迁移 |
| 某条契约要做 breaking 修改 | 发**新坐标**（#4） | 旧坐标进入弃用流程，见 §4；永远不在旧坐标上原地改语义 |
| 宿主产品发新版 | #5 宿主产品版本 | 对兼容判断**没有影响**——兼容看它声明的契约坐标，不看产品版本号 |
| SDK 发布新版本 | #6 SDK 版本 | 不代表任何契约变化；契约变化一定产生新坐标 |

三条推论：

- **兼容判断只看 2、3、4，不看 5。** 宿主兼不兼容，取决于它声明实现了哪些契约坐标，而不是 `gui>=2.0` 这类产品版本号。协商规则见 [spec/negotiation.md](spec/negotiation.md)。
- **SDK 版本不自动等于标准版本。** SDK 升级不代表任何契约变化；契约变化一定产生新坐标。
- **`manifestVersion` 不是协商轴。** 它只声明文件结构、配合 `$schema` 选择校验规则；插件"需要什么能力"永远通过契约坐标表达。见 [spec/manifest.md](spec/manifest.md)。

## 2. 契约坐标：`apiVersion + kind`

v0.15 起，所有能力、事件与扩展点都用二元坐标标识：**`apiVersion + kind`**。这一设计借鉴 Kubernetes 的 type metadata，但只取坐标与版本语义，不照搬整套 resource 语义（处置记录见 [decisions/round-1](decisions/round-1-issue-23.md)、[decisions/round-2](decisions/round-2-issue-24.md)）。

v0.15 首批三个坐标（权威定义在 Registry 条目里，此处只做索引）：

| 契约坐标 | kind | 内容 | Registry 条目 |
| --- | --- | --- | --- |
| `commands.dsh/v1alpha1` | Command | flat action leaf：一个全局 ID 对应一个 handler | [commands.dsh-v1alpha1](registry/capabilities/commands.dsh-v1alpha1.md) |
| `storage.dsh/v1alpha1` | LocalStorage | 按插件隔离的私有持久化 | [storage.dsh-v1alpha1](registry/capabilities/storage.dsh-v1alpha1.md) |
| `messages.dsh/v1alpha1` | MessageObserver | 不可修改的消息观察事件 | [messages.dsh-v1alpha1](registry/events/messages.dsh-v1alpha1.md) |

三条使用规则：

- **坐标当作整串比对，不许拆开解读。** 工具不得从坐标字符串里解析出 `dsh` 之类的段，再据此自行推断语义（术语上这叫坐标是 opaque 的）；语义一律以 Registry 条目为准。
- **名称只在 Registry 登记。** 实现方不得从 RFC 正文或源码里自行发明"等价"名称；manifest 与 Host Descriptor 只能引用 Registry 精确条目。登记流程见 [RFC 0000](rfcs/0000-governance.md) 与 [registry/README.md](registry/README.md)。
- **契约独立版本化是有意为之。** Model Provider、工具渐进式披露等领域被上游模型生态推着跑，演进极快，中心化的固定 SDK 扛不住这个节奏。某领域契约升级时，只有那份契约和用它的插件需要动，内核、无关插件和宿主都不用重新发版。已有独立探索实现验证：[Yan-Zero/dsh-std](https://github.com/Yan-Zero/dsh-std)。（历史注脚：v0.1 阶段契约版本曾暂时跟随统一 `apiVersion`，v0.15 起转为随坐标独立演进。）

## 3. `v1alpha1` 与 `0.x` 的语义

- **`v1alpha1` 是实验期坐标：可能 breaking，不作任何稳定性承诺。** alpha 的意思必须讲清楚：它不是"稳定 1.0 的第一个小版本"。升级路径是发布新坐标（`v1alpha2` → `v1beta1` → `v1`），而不是在旧坐标上原地修改。
- **`manifestVersion: "0.x"` 同理**：v0 阶段按"**minor 可能 breaking**"的实验规则明确标注——`0.15` → `0.16` 可以调整 manifest 结构，不伪装成稳定 `1.x`。
- 任何文档、工具或市场页面不得把 alpha / 0.x 版本展示成"稳定版"。

## 4. Breaking change 与弃用窗口

- **契约的 breaking change 必须发布新坐标**（新 `apiVersion` 或新 kind），不得在旧坐标下原地修改语义。想象一下反面：同一个坐标昨天和今天含义不同，那坐标就不再是承诺，整个协商体系失去地基。新坐标登记走 [RFC 0000](rfcs/0000-governance.md) 规定的 RFC 流程。
- 旧坐标进入**弃用（deprecated）**状态：Registry 条目必须标注弃用信息、替代坐标与移除计划。条目格式见 [registry/README.md](registry/README.md)。
- **弃用窗口逐条声明，不设全局一刀切**：每条坐标的窗口写在它自己的 Registry 条目里，窗口期内宿主应当继续支持。窗口长度由登记该契约的 RFC 给出理由——使用面越广，窗口越长。
- manifest 结构的 breaking 变更同理：新标准版本发布时，旧结构的迁移要求随变更 RFC 一并写明。

## 5. 命名空间：私有扩展与官方保留

### 5.1 `x-org.*` 私有命名空间

- 私有 / 实验能力使用带组织归属的显式命名空间，例如 `x-org.example.tui.keymap`、`x-web.panel.urlState`（后者来历见 [decisions/round-2](decisions/round-2-issue-24.md)）。不得使用容易冲突的短名称。
- 私有坐标可以写进 Host Descriptor 与 manifest 参与协商，但**不得伪装成标准坐标**，也不得省略 `x-` 前缀。
- `x-` 是逃生舱，不是正路：一项私有能力被多个宿主独立实现、语义被证明可移植之后，应当通过 RFC 登记为标准坐标。

### 5.2 官方保留命名空间

- Registry 为 dsh 官方保留一组命名空间，社区条目不得占用；未来官方能力可以直接以一等身份入驻。保留清单见 [registry/README.md](registry/README.md)。
- `dsh-plugin.json` 文件名与 `dsh-*` 命名前缀已向官方发出不冲突确认请求（见 [RFC 0001](rfcs/0001-core-contract.md) §7.2）；确认结果会按反馈链路登记到 `decisions/` 处置记录。
