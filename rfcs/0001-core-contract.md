# RFC 0001: 核心契约（Core Contract）—— Manifest、Capability 协商与事件契约

> **状态：Draft v0.15（社区讨论稿，非官方标准）**

| 字段 | 内容 |
| --- | --- |
| 编号 | 0001 |
| 标题 | 核心契约：Manifest、Capability 协商与事件契约 |
| 状态 | Draft（v0.15 正文） |
| 目标版本 | v0.15 |
| 范围 | 插件与宿主的互操作契约：manifest、宿主自述、协商、生命周期、事件 |
| 依赖 | [RFC 0000 治理规则](0000-governance.md) |
| 讨论方式 | [community#23](https://github.com/omdsh-dev/community/issues/23) → [community#24](https://github.com/omdsh-dev/community/issues/24) |
| 迁移自 | dsh-community-fabric RFC 0001（v0.1 底稿）+ community#24 第二轮修订 |

这是主 RFC，回答"**这套标准是什么、为什么长这样**"。规范性条文不在本文——它们在 [spec/](../spec/manifest.md) 与 [registry/](../registry/README.md)，本文只讲决定和理由。**只有五分钟的读者读 §0 和 §9；dsh 官方读者读 §7 和 §9。**

## 0. 一页摘要

**问题。** dsh 插件生态在快速膨胀：awesome 目录快照已收录 **3,809 个插件仓库**。对 12 个代表性开源插件的源码调研显示，多数插件依赖源码 patch、内部函数或私有 service 探测实现功能——上游一更新即批量失效；GUI / Web UI / TUI 各宿主插件互不兼容；用户在安装前无法判断兼容性，装上炸了才知道。

**社区做了什么。** 生态内主要插件作者、三端宿主维护者与分发渠道进行了两轮公开讨论（issue #23 共 13 条实质评论、issue #24 共 5 条），收敛出一套四层互操作模型和一个**刻意做小**的 v0.15：

```text
插件代码 ──只依赖──▶ Fabric SDK / 稳定 contract
                        ▼
              Capability Broker（校验、协商、授权、生命周期、资源归属）
                        ▼
              版本化 DSH Adapter（唯一允许吸收上游变化的层）
                        ▼
              官方 dsh / Cordis runtime（不要求任何修改）
```

**v0.15 是什么（五句话）。** 一个静态 JSON manifest（`dsh-plugin.json`）+ 机器可读的宿主能力描述（Host Descriptor）；一个纯函数的 required/optional 契约协商器；一套顺序确定的激活/停用生命周期；三个低风险契约坐标——`commands.dsh/v1alpha1`（Command）、`storage.dsh/v1alpha1`（LocalStorage）、`messages.dsh/v1alpha1`（MessageObserver）；以及可在 headless 环境运行的一致性测试。**没有沙箱承诺、没有可修改拦截、没有插件间 service、没有跨端 UI——这些全部显式延期为独立 RFC（§4.5）。**

**对官方的请求（§7）：** ① 核心观察点变更的 changelog 提前标注；② `dsh-plugin.json` 文件名与命名空间的不冲突确认；③ 以任意深度参与标准治理。**明确不请求：** 修改内核、移除现有加载路径、由我们代表官方发声。

## 1. 问题与证据

三类结构性问题（数据与样本见 [research/dsh-plugin-needs.md](../research/dsh-plugin-needs.md)）：

1. **实现耦合。** 抽样的 12 个插件中，多数通过源码 patch、monkey patch、内部事件名或 `ctx.get()` 反射探测实现功能。这不是插件作者的错——官方接缝缺失时他们别无选择——但结果是每次上游更新都在生态里引发一轮批量炸裂。历史已经演过一次：早期社区 loader 在官方引入统一注册方式后一夜全废。
2. **兼容信息缺失。** 现有 manifest 只有包名和 patch 文件列表，宿主、市场和启动器都无法在执行代码前判断：这个插件需要图形界面吗？要读会话吗？能在 TUI 上跑吗？12 个样本中 9 个同时需要 Host 和 Client 双 face——跨 face 是常态而非特例，但目前没有任何声明机制。
3. **组合不确定。** 多插件修改同一行为时没有声明、顺序和冲突规则，实际仲裁者是"谁后加载谁赢"；分发渠道被迫用整包锁版本对抗接口不稳定。

## 2. 设计原则（八条）

前两轮讨论的全部修正收敛为以下八条原则。每条都有具体反例支撑，出处见 `decisions/` 处置记录。

1. **静态可分析。** manifest 是包根目录的静态 JSON，禁止运行代码生成；宿主加载时不从网络取 schema。工具无需执行插件代码即可完成发现、校验和协商。
2. **五类声明不混淆。** `requires`（依赖什么）、`permissions`（申请什么授权）、`provides`（能实现什么 service）、`contributes`（贡献什么静态元数据）、`subscriptions`（订阅什么事件）是五种语义，不能压进一个泛化的 `capabilities` 容器。v0.15 schema 只接受已有具体契约的子集，并**拒绝** `provides` 和 `requires.services`。
3. **协商 + 诚实降级。** required 缺失 → 安装/激活前明确拒载并说明原因；optional 缺失 → 走声明过的降级路径。市场展示五种状态且不得互相升级：**声明兼容 / 等待授权 / 已实测 / 不兼容 / 未知**。"声明兼容"永远不等于"已实测"，更不等于"安全"。
4. **信任分档，capability 不是沙箱。** v0.15 为 trusted-in-process 档位：同进程受信任的插件在技术上可以绕过标准 API 直接调用系统接口。capability 声明服务于兼容判断、用户授权和审计，**不构成安全边界**，宿主必须显著公示这一点。
5. **上游变化收敛到 Adapter，fail closed。** 插件只依赖标准契约；版本化 DSH Adapter 是唯一允许 import 上游 runtime 的层。上游不再暴露某项能力所需的观察点时，Adapter 必须下线对应 capability 并报告原因，**不能用私有 patch 猜测语义、返回"看起来成功"的近似结果**。
6. **确定性与可归属。** 加载顺序永远不是冲突仲裁机制。所有标准注册经过 Broker 归属到具体插件的具体一次激活，并记入最小 effect ledger——诊断时能回答"这个 command / 面板 / 残留资源是谁创建的、停用后清理了没有"。
7. **元协议内核，契约独立版本化。** 协商内核只认 `apiVersion + kind` 坐标与 requires/supports 声明，不内置任何业务字段；各领域契约（能力、事件、扩展点）随坐标独立演进，某领域升级不拖着内核、无关插件和宿主重新发版。
8. **参考实现不是标准。** 标准只由规范文本 + registry + fixtures + 一致性测试定义；任何实现——包括 fabric 参考实现——都不是标准本身，实现不能自我认证。治理落地见 [RFC 0000](0000-governance.md) 第 9 节。

原则 7、8 由第二轮讨论（issue #24）新增，处置记录见 [decisions/round-2-issue-24.md](../decisions/round-2-issue-24.md)。

## 3. 核心模型

### 3.1 四层模型

见 §0 的架构图。要点只有一条：**版本化 DSH Adapter 是唯一允许吸收上游变化的层**（原则 5）；插件代码不依赖 dsh、Cordis 或任何 Adapter package，只依赖标准契约。

### 3.2 术语与对象模型

- 插件形态用四级对象模型描述：**Component**（分发包）→ **Facet**（静态分面，如 `host` / `client` / `worker`）→ **Activation**（一次有界激活，生命周期与资源归属的 scope）→ **Participant**（运行时协商实体）。规范定义见 [spec/facet-model.md](../spec/facet-model.md)；v0.15 只规范 `host` facet 的完整契约，`client` / `worker` 为保留名，归 [RFC 0002](0002-runtime-presentation.md)。
- **Host product** 是承载插件的 GUI / Web UI / TUI / 启动器产品；**Runtime / Presentation / Control / Transport** 是四个独立维度，不能压缩成 `hostType` 或 `isRemote` 字段（Remote SSH 反例，见 [RFC 0002](0002-runtime-presentation.md)）。
- 术语的人话定义集中维护在 [GLOSSARY.md](../GLOSSARY.md)，本文不重复。

### 3.3 信任与执行档位

capability 要区分四件事：**support**（宿主声明能提供）、**request**（插件申请）、**grant**（用户或策略允许）、**enforcement**（宿主真正阻止绕过）。v0.15 只定义 **trusted-in-process** 档位：插件作为受信任代码运行，capability 用于兼容、授权和审计，不构成安全沙箱；宿主必须在 Host Descriptor 中公示这一事实（公示义务见 [spec/host-descriptor.md](../spec/host-descriptor.md)）。isolated 档位（进程/realm 隔离、受控 IPC、资源限制）是独立的后续 RFC；没有这些证据的宿主不得声称权限被强制执行。

### 3.4 Manifest（静态声明）

决定如下，**逐字段规范见 [spec/manifest.md](../spec/manifest.md)**，机器可读定义见 [schemas/dsh-plugin.schema.json](../schemas/dsh-plugin.schema.json)：

- manifest 冻结为包根目录的静态 JSON 文件 **`dsh-plugin.json`**，禁止运行 JavaScript 动态生成。使用独立名称是有意为之：`plugin.json` 已被 Agent Plugins Specification 占用；一个 package 可以同时携带两份文件支持两套生态，但两者不能互相覆盖或隐式扩展。
- 顶层 `$schema` 必填 canonical identifier；宿主据此选择本地随附的 schema，加载时不得从网络获取 schema 或校验策略。
- 五类声明语义边界写死在 schema 里（原则 2）；在组合契约被接受前，**v0.15 schema 必须拒绝 `provides` 和 `requires.services`**，宿主不得把不支持的字段静默保存后展示成"已经生效"。
- `manifestVersion: "0.15"` 只声明文件结构，不构成另一个协商轴（版本模型见 [VERSIONING.md](../VERSIONING.md)）。

```jsonc
// 示意，以 Registry 与 spec/manifest.md 定案为准
{
  "$schema": "<canonical dsh-plugin.json schema identifier>",
  "manifestVersion": "0.15",
  "id": "com.example.message-memory",
  "version": "1.2.0",
  "requires": {
    "contracts": [
      { "apiVersion": "commands.dsh/v1alpha1", "kind": "Command" },
      { "apiVersion": "storage.dsh/v1alpha1", "kind": "LocalStorage" },
      { "apiVersion": "messages.dsh/v1alpha1", "kind": "MessageObserver", "optional": true }
    ]
  }
}
```

### 3.5 Host Descriptor 与协商

决定如下，**规范见 [spec/host-descriptor.md](../spec/host-descriptor.md) 与 [spec/negotiation.md](../spec/negotiation.md)**：

- 每个兼容宿主必须发布机器可读的 Host Descriptor：支持的契约坐标精确条目、执行环境与信任档位、平台。只能声明**实际实现**的 Registry 精确条目，不能用产品本地别名替代，也不得声明无法保持语义的能力。
- 协商器是**纯函数**：manifest × Host Descriptor → 兼容 / 拒载 / 待授权 + 机器可读报告（报告格式见 [schemas/negotiation-report.schema.json](../schemas/negotiation-report.schema.json)），不依赖 dsh 即可测试。
- required 缺失 → 明确拒载并给出用户能理解的原因；optional 缺失 → 确定的降级结果。市场五态（声明兼容 / 等待授权 / 已实测 / 不兼容 / 未知）不得互相升级（原则 3）。

### 3.6 生命周期与事件

决定如下，**规范见 [spec/lifecycle.md](../spec/lifecycle.md) 与 [spec/event-envelope.md](../spec/event-envelope.md)**：

- 宿主状态机（`starting → ready → stopping → stopped`）与插件 activation 状态机（`discover → validate → negotiate → authorize → activating → active → deactivating → disposed`）是两套独立状态机。
- v0.15 采用 generation-scoped **eager activation，无按需激活**（理由见 §6.3）。正常关闭 best-effort deactivate；崩溃、断电、强杀时不保证送达，插件清理必须设计为可重复。
- 事件使用带版本的最小信封：scope 内单调递增序号、scope 内有序，不隐含跨 scope 全局顺序；payload 不可修改，携带敏感级别与裁剪摘要。信封的逐字段规范见 [spec/event-envelope.md](../spec/event-envelope.md)，本文不重复。payload 对齐 MCP `ContentBlock` 的精确字段边界**正在征求意见**（§9 第 3 问）。
- 可修改 / 可取消的 `before-*` 事件不进 v0.15（理由见 §6.4）。

### 3.7 Broker 与最小 effect ledger

所有标准注册必须经过 Broker，由 Broker 把资源归属到具体插件的具体一次 activation，并维护机器可读的最小 effect ledger：`create / bind / replace / release / cleanup-failed` 五种操作，默认不写入消息正文与 secret。它改善溯源与诊断，但 trusted-in-process 代码仍可绕过 Broker——ledger 不是沙箱强制执行的证明（原则 4、6）。记录字段的规范见 [spec/lifecycle.md](../spec/lifecycle.md)。

## 4. v0.15 精确范围

原则：**每一项进入范围的能力都必须同时具备 schema、fixture 和 headless 一致性测试；给不出测试的一律延期。**

### 4.1 交付物

| # | 交付物 | 规范位置 |
| --- | --- | --- |
| 1 | `dsh-plugin.json` Manifest Schema | [spec/manifest.md](../spec/manifest.md) + [schemas/dsh-plugin.schema.json](../schemas/dsh-plugin.schema.json) |
| 2 | Host Descriptor Schema | [spec/host-descriptor.md](../spec/host-descriptor.md) + [schemas/host-descriptor.schema.json](../schemas/host-descriptor.schema.json) |
| 3 | Capability / Event Registry | [registry/](../registry/README.md)（机器可读条目 + 不可变 schema hash） |
| 4 | 纯函数能力协商器 | [spec/negotiation.md](../spec/negotiation.md) + [schemas/negotiation-report.schema.json](../schemas/negotiation-report.schema.json) |
| 5 | 生命周期 contract | [spec/lifecycle.md](../spec/lifecycle.md) |
| 6 | 三个契约坐标 | §4.2 |
| 7 | Broker + 最小 effect ledger | [spec/lifecycle.md](../spec/lifecycle.md) |
| 8 | Conformance 套件 | [spec/conformance.md](../spec/conformance.md) + [conformance/](../conformance/fixtures/README.md) |

### 4.2 三项领域契约

| 契约坐标 | kind | 包含 | 明确不包含（及归属） |
| --- | --- | --- | --- |
| `commands.dsh/v1alpha1` | Command | flat action leaf：一个全局 ID 对应一个已声明 action 与一个归 activation 所有的 handler | command tree / subcommand、CLI option parser、交互式 prompt、流式输出、后台 session（归 [RFC 0002](0002-runtime-presentation.md)） |
| `storage.dsh/v1alpha1` | LocalStorage | 插件私有、受宿主管理的持久化 | 跨插件共享、多 scope、Secret（归 [RFC 0003](0003-service-composition.md) 及后续 RFC） |
| `messages.dsh/v1alpha1` | MessageObserver | 观察**不可修改**的消息事件，带版本化信封 | 可修改 / 可取消的 `before-*`（后续独立 RFC，前置条件见 [spec/event-envelope.md](../spec/event-envelope.md)） |

权威定义在 Registry 条目：[commands.dsh-v1alpha1](../registry/capabilities/commands.dsh-v1alpha1.md)、[storage.dsh-v1alpha1](../registry/capabilities/storage.dsh-v1alpha1.md)、[messages.dsh-v1alpha1](../registry/events/messages.dsh-v1alpha1.md)。

### 4.3 版本模型

六个版本维度不许混成一个字段；契约坐标 `apiVersion + kind` 独立演进；`v1alpha1` 与 `0.x` 均为实验语义、不伪装稳定。**完整规则见 [VERSIONING.md](../VERSIONING.md)，本文不重复。**

### 4.4 验收标准与一致性证据

v0.15 从 Draft 晋级需要四类证据（定义与表述边界见 [spec/conformance.md](../spec/conformance.md)）：

1. **Schema validation**：公开的 Schema、Registry 与合法/非法 fixtures。
2. **Host conformance**：协商、授权拒绝、激活顺序、异常捕获、重复激活、清理等 headless 测试。
3. **Plugin validation**：manifest 与 entrypoint 一致、只用已声明契约、contribution 声明/绑定一致、optional 降级路径。
4. **Interop evidence**：**至少两个独立宿主产品/集成**（可共享同一个版本化 DSH Adapter，但 integration 与 descriptor 证据独立）与**三个示例插件**完成同一组 headless 场景。dsh-TUI 已认领第一批兼容宿主实现与测试（[decisions/round-2](../decisions/round-2-issue-24.md)）。

表述底线：宿主只能声称"通过 v0.15 Host conformance"，插件只能声称"通过 v0.15 plugin validation"——**都不能表述为"安全插件"或"官方认证"**。

### 4.5 明确不在 v0.15 的内容

以下每一项都经讨论确认"方向有价值，但硬塞进 v0.15 会埋雷"，已拆为独立 Draft RFC，不会暗中扩大 v0.15：

| 延期项 | 一句话原因 | 归属 |
| --- | --- | --- |
| 可修改 / 可取消的 `before-*` 事件 | 顺序、合并、cancel、timeout、回滚、隐私裁剪均未定义 | 后续独立 RFC（§6.4） |
| Runtime / Presentation / Control / Transport 分层、command tree、短期交互消息 | Remote SSH 反例证明 `isRemote` / `hostType` 是错误抽象 | [RFC 0002](0002-runtime-presentation.md) |
| 插件间 service（`provides` / `requires.services`）与确定性组合 | 需先定义 provider cardinality、用户选择、冲突计划、健康与替换 | [RFC 0003](0003-service-composition.md)（下一阶段最高优先级） |
| 安装影响预览、验证报告、完整溯源 | 证据必须分级并绑定不可变 artifact digest | [RFC 0004](0004-provenance-diagnostics.md) |
| 按需激活 | 第二套生命周期 + 首次并发竞态 + 延迟失败 | 后续基于测量的提案（§6.3） |
| 隔离执行 / 沙箱 | 没有隔离证据的宿主不得声称权限被技术强制（原则 4） | 后续独立 RFC |
| 跨端声明式 UI、`net.*` / `fs.*` / 会话写入 | 敏感能力需要各自的授权 UX、scope 与资源限制契约 | 各自独立 RFC |
| 市场认证、lockfile / 组合包规范、迁移工具 | 属于 packaging / distribution 层 | 后续提案 |
| 运行时 mixin（dsh-neoforge PoC） | 冲突检测证据有价值，但私有 target 永不进入插件可见 API | Adapter 实验，长期封顶 |

## 5. 反馈处置与变更记录

本 RFC 由两轮公开讨论收敛而成，**逐条处置表不在本文维护**：

- 第一轮：issue #23，13 条评论 → [decisions/round-1-issue-23.md](../decisions/round-1-issue-23.md)（v0.1 定稿）。
- 第二轮：issue #24，5 条评论 → [decisions/round-2-issue-24.md](../decisions/round-2-issue-24.md)（v0.1 → v0.15：契约坐标转向 `apiVersion + kind`、引入 Facet 四级模型、新增原则 ⑦⑧、payload 对齐 MCP `ContentBlock`）。
- 第三轮（官方仓库 discussion）反馈收集中 → decisions/round-3-discussion-2714.md。

新评论不静默改 Draft：变更先过 [RFC 0000](0000-governance.md) 规定的审查流程，再登记到处置记录，反馈链路闭合可追溯。

## 6. 被拒绝的替代方案

### 6.1 动态 manifest（JS 生成）

**是什么**：允许 manifest 是一段可执行 JavaScript，运行时生成声明。**为什么拒**：静态可分析是原则 1——校验器、市场、启动器全都依赖"不执行代码即可读取声明"，动态生成会让整个兼容性体系失效（issue #23 中验证工具与宿主维护者均明确反对）。**什么条件下重新考虑**：当出现静态 JSON 表达不了的声明需求，且能用受限求值（无 IO、可证明终止）保持等价可分析性时。

### 6.2 平面能力名 + 统一 apiVersion（v0.1 方案）

**是什么**：所有能力用平面短名（`commands`、`storage.local`），共享一个统一 `apiVersion`。**为什么拒**：统一版本把所有领域契约绑在同一发版节奏上——Model Provider 等被上游模型生态推着走的快变领域每微调一次，整个 SDK、Broker 和全生态插件宿主都要跟着发版（issue #24 的论证，附 [dsh-std](https://github.com/Yan-Zero/dsh-std) 探索实现验证）；v0.15 因此转向 `apiVersion + kind` 契约坐标（原则 7）。**什么条件下重新考虑**：若坐标碎片化导致工具链复杂度失控，可在保持契约独立版本化（[VERSIONING.md](../VERSIONING.md)）的前提下简化表层命名。

### 6.3 按需激活（activation events）

**是什么**：插件声明触发条件（如"执行某命令时"），首次被需要时才激活。**为什么拒**：它引入第二套生命周期、首次并发竞态和延迟失败——问题从"启动时立即可见"变成"第一次用到才炸"；先用 generation-scoped eager activation 拿到可验证的基线。**什么条件下重新考虑**：有真实性能测量证明 eager activation 成为瓶颈，且触发条件集合能被静态分析完整覆盖时，以独立 RFC 提出。

### 6.4 v0.15 即引入可修改的 `before-*` 事件

**是什么**：允许插件在事件投递前修改或取消（拦截消息、改写行为）。**为什么拒**：多插件执行顺序、多次修改的合并、cancel 后是否继续调用、timeout / 异常 / 回滚 / 重入、隐私裁剪——一个都没定义；给 listener 起个 `before` 名字不解决任何问题，只会退回"谁后加载谁赢"。**什么条件下重新考虑**：上述问题的契约全部随独立 RFC 齐备并通过评审之后（前置条件清单见 [spec/event-envelope.md](../spec/event-envelope.md)）。

## 7. 与 dsh 官方的关系

### 7.1 我们不请求什么

1. **不请求修改内核或立即采纳本标准。** 标准在社区侧先跑通；官方现有的 package manifest、Cordis service、slot、profile 组合机制原样继续工作。
2. **不请求移除或冻结任何现有加载路径。** 标准管理的插件走标准入口；非标准插件与内置扩展在迁移期是明确的产品边界，不受影响。
3. **不代表官方发声。** 所有文档均标注"社区标准、非官方"；一致性表述有明确边界（§4.4、[RFC 0000](0000-governance.md) §8）。

### 7.2 我们请求什么

1. **观察点变更的可见性。** Adapter 是整个体系里唯一吸收上游变化的层，它需要的不是"上游别变"，而是"变了能知道"。请求：session / message / tool 调用等核心业务事件的观察点发生变更或移除时，在 changelog 或 release note 中标注。这是成本最低、对生态稳定性收益最大的一项。
2. **命名空间确认。** 请求确认：包根目录 `dsh-plugin.json` 文件名、`dsh-*` 契约命名前缀不与官方现有或近期规划冲突；Registry 中为官方保留命名空间，未来官方能力可直接以一等身份入驻（规则见 [VERSIONING.md](../VERSIONING.md) §5.2）。
3. **参与治理，深度自选。** 治理规则见 [RFC 0000](0000-governance.md)。官方可以以观察员、评审者或共同维护者任意身份参与；也欢迎对 v0.15 的三个契约坐标选择与 `messages.dsh/v1alpha1` 的 payload 字段边界直接给意见——这是当前最需要官方视角的两个具体问题（§9）。

### 7.3 对官方的价值

- 3,809 个插件仓库背后的 patch 与内部接口依赖，目前每一次都由官方更新"背锅"。互操作层落地后，兼容压力从"官方 vs 所有插件"收敛为"Adapter 一个点"。
- 兼容信息静态化后，市场与启动器能在安装前给用户明确预期，"装上就炸"类负面体验不再归因于 dsh 本体。
- 标准由社区治理并承担维护成本；官方在任意时点采纳的成本都很低（映射一层 Adapter），不采纳也不受损。

## 8. 落地计划

| 阶段 | 内容 | 状态 |
| --- | --- | --- |
| Phase 0 标准基础 | 治理 RFC 0000；Manifest / Host Descriptor Schema；Registry；fixtures；纯函数协商器；headless 测试骨架 | 文档就绪，schema 冻结中 |
| Phase 1 受信任参考 Adapter | 单一 Node.js 宿主环境；完整生命周期；Broker 归属 + 最小 ledger | fabric 侧启动 |
| Phase 2 事件与最小贡献点 | `messages.dsh` + `storage.dsh` + flat `commands.dsh`；故障 / 重复 ID / 取消 / 关闭 fixtures；**两宿主 × 三插件互操作证据**（§4.4） | 三端维护者已认领 integration |
| Phase 3 插件间组合 | [RFC 0003](0003-service-composition.md) 启动评审：provider cardinality、选择、冲突计划、健康与替换 | 下一阶段最高优先级（[decisions/round-2](../decisions/round-2-issue-24.md)） |

## 9. 本轮征求意见问题（五个）

1. v0.15 三个契约坐标（`commands.dsh` / `storage.dsh` / `messages.dsh`）的选择与裁剪是否合适？有没有"没有它这件事做不成"的第四项？
2. `messages.dsh/v1alpha1` 的 payload 应包含哪些消息字段、敏感字段裁剪规则如何定？
3. payload 与 MCP `ContentBlock` 对齐的精确字段边界——初稿见 [spec/event-envelope.md](../spec/event-envelope.md)，标注"待社区反馈冻结"，本轮重点征求。
4. 官方对 `dsh-plugin.json` 文件名与 `dsh-*` 命名前缀是否有冲突或规划（对应 §7.2 请求 ②）？
5. 官方希望以何种深度参与治理——观察员、评审者还是共同维护者（流程见 [RFC 0000](0000-governance.md)）？

## 附录：原文索引

- 首轮 RFC 与全部讨论：[community#23](https://github.com/omdsh-dev/community/issues/23)；第二轮定稿与评论：[community#24](https://github.com/omdsh-dev/community/issues/24)。
- 处置记录：[decisions/round-1-issue-23.md](../decisions/round-1-issue-23.md)、[decisions/round-2-issue-24.md](../decisions/round-2-issue-24.md)。
- 调研快照（非规范）：[research/](../research/README.md)（插件需求 12 样本、成熟框架、VS Code 扩展模型）。
- 延期主题：[RFC 0002](0002-runtime-presentation.md) / [0003](0003-service-composition.md) / [0004](0004-provenance-diagnostics.md)。
