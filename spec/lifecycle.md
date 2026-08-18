# Spec: 生命周期（Lifecycle）

> **状态：Draft v0.15（社区讨论稿，非官方标准）**

这份文件管"什么时候激活、怎么关闭、资源算谁的"：宿主状态机、activation 状态机、激活时机（generation-scoped eager activation）、关闭语义，以及 Broker 归属与最小 effect ledger。谁该读：**宿主维护者**（要按本文实现激活/停用顺序）、**插件作者**（要把清理写成可重复执行）、**一致性测试作者**（fixtures 的依据在这里）。

术语（Component / Facet / Activation 等）的规范定义见 [facet-model.md](facet-model.md)，本文不重复。

## 1. 适用范围

- 本文规范 **Host-side `host` facet** 的生命周期：宿主产品自身的状态流转，以及每个插件 entrypoint 的每一次 activation instance 的状态流转。
- 本文**不**规范 `client` / `worker` face 的生命周期与跨 face 通信（归 [RFC 0002](../rfcs/0002-runtime-presentation.md)）。
- 协商与授权的内部判定规则见 [negotiation.md](negotiation.md)；本文只规定它们在状态机中的**位置与顺序**。

## 2. 规范性定义

### 2.1 两套状态机必须分开

宿主产品的状态和插件 activation 的状态是**两套独立状态机**，不得压成一个字段，也不得用宿主状态推断某个 activation 的状态。

**宿主状态机**：

```text
starting → ready → stopping → stopped
```

| 状态 | 含义 |
| --- | --- |
| `starting` | 宿主启动中，尚未完成自身的初始化 |
| `ready` | 宿主可激活插件；一次 runtime generation 在此状态下组装 |
| `stopping` | 正常关闭开始，不再激活新插件，best-effort 停用已激活插件 |
| `stopped` | 宿主进程终止，不再有任何生命周期回调送达的保证 |

**activation 状态机**（每个插件的每一次激活独立走一遍）：

```text
discover → validate → negotiate → authorize
→ activating → active → deactivating → disposed
```

| 状态 | 含义 | 失败去向 |
| --- | --- | --- |
| `discover` | 找到 package 与静态 manifest（不执行插件代码） | 跳过该插件，不进后续状态 |
| `validate` | manifest 通过 schema 与静态校验 | 拒载，原因对用户可读 |
| `negotiate` | manifest × Host Descriptor 纯函数协商 | required 缺失 → 拒载 |
| `authorize` | 敏感能力取得用户或策略授权 | 未授权 → 拒载或等待授权 |
| `activating` | 调用插件 activation hook，构造 activation-scoped context | 异常/超时 → 直接 `disposed`（记 ledger） |
| `active` | 插件正常工作，注册全部归属本次 activation | — |
| `deactivating` | best-effort 停用：abort、drain、按序释放 effect | 单项失败记 `cleanup-failed`，不阻塞整体 |
| `disposed` | 终态；本次 activation 的资源已释放或已记录残留 | — |

规范性要求：

- 宿主**必须**在 ready 状态下、且在执行任何插件代码之前，按 `discover → validate → negotiate → authorize` 的顺序完成前置阶段（违反会被 `conformance/fixtures/lifecycle/activation-order.json` 抓住——该 fixture 打乱阶段顺序，断言协商器拒绝或宿主报错）。
- 宿主**必须**为正常 activation 保证上述状态顺序；跳过一个阶段直接进入 `activating` 是非法的（同一 fixture 覆盖）。
- 宿主**应该**捕获跨越标准 callback / Promise 边界的普通异常并转为稳定错误；trusted-in-process 档位**无法**隔离 `process.exit`、native crash 或死循环，宿主不得声称做到了（表述边界见 [conformance.md](conformance.md)）。
- `activate` / `deactivate` 是宿主调用的 activation-instance hook，**不是**插件可自行订阅的普通业务事件；插件**不得**把 subscription 命中当成激活信号（见 §2.2）。

### 2.2 generation-scoped eager activation（v0.15 无按需激活）

v0.15 采用 **generation-scoped eager activation**：宿主在组装一次 **runtime generation** 时，激活本次 generation 中所有已选中且通过协商与授权的插件。runtime generation 指宿主一次"启动 / HMR / profile 重组"所确定的插件组合实例，它以 generation 为边界整体激活、整体拆除。

规范性要求：

- 完成 discover / negotiate / authorize 后，宿主**必须**在组装 runtime generation 时立即激活所有选中的插件，**不得**等待首次使用才激活（违反会被 `conformance/fixtures/lifecycle/no-lazy-activation.json` 抓住——该 fixture 在插件未激活时执行其声明的 command、命中其 subscription，断言插件保持 inactive）。
- Contribution 只描述可发现功能，subscription 只控制事件投递；执行 command、请求 Provider 或匹配 subscription 都**不能**激活 inactive 插件（同一 fixture 覆盖）。
- 插件**不得**依赖"用到我才启动"的假设编写初始化逻辑；任何启动期副作用都发生在 `activating`。

**为什么没有按需激活**（被拒绝的替代方案，论证全文见 [RFC 0001](../rfcs/0001-core-contract.md)）：按需激活意味着第二套生命周期（每个 contribution 点都是潜在激活点）、首次调用的并发竞态、以及把启动失败推迟到用户操作的延迟失败。v0.15 先用 eager activation 拿到可验证的基线；按需激活归"后续基于测量的提案"，有真实性能数据再议。

### 2.3 关闭语义：best-effort，清理必须可重复

- 正常关闭（宿主进入 `stopping`）时，宿主**必须**对每个 active 插件执行 best-effort deactivate：停止接收新调用、在明确时间边界内 abort 并 drain、按契约顺序释放 effect（顺序与边界由 effect ledger 记录结果，见 §2.5；违反会被 `conformance/fixtures/lifecycle/graceful-shutdown.json` 抓住——该 fixture 断言正常关闭时每个 active 插件都收到 deactivate 且 ledger 到达终态）。
- 进程崩溃、断电或强制终止时，宿主**不保证** `deactivate` 送达（该场景由 `conformance/fixtures/lifecycle/crash-no-deactivate.json` 固化：kill 进程后重启，断言宿主报告 `orphaned` / `unknown` 而不是伪造清理成功）。
- 因此插件**必须**把清理设计为**可重复执行**：`deactivate` 可能被调用零次、一次或多次，下一次启动可能需要恢复上一次崩溃残留的状态（违反会被 `conformance/fixtures/lifecycle/cleanup-repeatable.json` 抓住——该 fixture 对同一 activation 连续调用两次 deactivate，断言第二次不抛异常且不产生重复 effect）。

### 2.4 HMR / profile 重组下的重复激活

宿主保持 ready 时，同一插件可能因 HMR 或 profile 重新组合而被**重复 activate / dispose**：

- 每次重新激活**必须**创建新的 activation identity（新的 `activationId`）；旧 activation 的历史归属记录继续可查，当前资源指向新 owner（违反会被 `conformance/fixtures/lifecycle/duplicate-activation.json` 抓住——该 fixture 对同一插件连做两次 activate，断言两次的 `activationId` 不同、旧 activation 的 effect 全部 release 或转交）。
- 插件**必须**假设同一 entrypoint 会被重复激活：模块级全局状态不是保险箱，资源一律挂到 activation scope（`activation.scope.add` 或等价机制）上，由宿主在 deactivate 时统一回收。
- Provider 替换的完整语义（cardinality、冲突计划、新旧 owner 转交）归 [RFC 0003](../rfcs/0003-service-composition.md)，本文只规定"替换产生新 activation identity"这一条。

### 2.5 Broker 归属

所有标准注册（command handler、subscription、Provider、UI contribution 及未来归 activation 所有的注册）**必须**经过 Host API Broker，由 Broker 归属到**哪个插件的哪一次激活**（原则 ⑥）。插件或 Adapter **不得**绕过 Broker 自行注册标准能力后声称归某个 activation 所有（违反会被 `conformance/fixtures/lifecycle/ledger-ownership.json` 抓住——该 fixture 断言每个标准注册在 ledger 中都带有当前 `pluginId` + `activationId`，插件无法冒充其他 owner）。

### 2.6 最小 effect ledger

Broker **必须**维护机器可读的最小 effect ledger：**append-only、不可修改**的转移记录，让诊断与清理能回答"哪个插件创建、替换或未能释放了这项资源"。本文只定义 v0.15 最小版；完整版（物化视图、恢复扫描、observer metadata、保留策略）见 [RFC 0004](../rfcs/0004-provenance-diagnostics.md) §8–§9，不在此复述。

每条记录**必须**包含（字段名为示意，以 Registry 定案为准）：

| 字段 | 内容 |
| --- | --- |
| `ledgerVersion`、`recordId`、`sequence`、`recordedAt` | ledger 结构版本、记录 ID、单调递增序号、记录时间 |
| owner：`pluginId`、`pluginVersion` 或 `manifestDigest`、`activationId`、`runtimeId` | 这项 effect 归谁、归哪次激活 |
| `effectId`、`effectKind`、契约坐标（apiVersion + kind + 版本）、`resourceId`（存在时） | 这是什么 effect、对应哪条契约 |
| `operation` 与结果 `state` | 至少覆盖 `create` / `bind` / `replace` / `release` / `cleanup-failed` |
| `correlationId`（可选）、替换的旧/新 owner 或关联 effect ID（可选）、`outcome` 或 canonical `errorCode`（可选，不含敏感数据） | 诊断与替换链 |
| `sensitivityClass` 与实际采用的裁剪策略 | 这条记录经过了什么脱敏 |

规范性要求：

- ledger **必须**是 append-only：已有记录不得修改或删除，状态变化以新记录表达（违反会被 `conformance/fixtures/lifecycle/ledger-append-only.json` 抓住——该 fixture 尝试覆盖/删除既有记录，断言被拒绝）。
- ledger 默认**不得**写入消息正文、secret、command argument 或任意插件 payload（违反会被 `conformance/fixtures/lifecycle/ledger-no-secrets.json` 抓住——该 fixture 向 Broker 提交含 secret 值的注册，断言序列化后的 ledger 记录不含该值）。
- Broker **必须**与宿主原生 lifecycle 协作，在 dispose 时尝试有界清理并记录结果；清理失败**必须**记为 `cleanup-failed`，不得静默吞掉（违反会被 `conformance/fixtures/lifecycle/graceful-shutdown.json` 抓住）。
- 宿主**可以**在最小字段之外附加带版本的扩展字段，但扩展字段不属于 v0.15 契约，且同样受"不写敏感数据"约束。

## 3. 示例

一次正常 generation 的两个插件激活时序（`activating` 顺序由宿主决定，但前置阶段顺序固定）：

```text
host: starting ──────────────▶ ready ──────────────────────────▶ stopping → stopped
                                 │组装 generation                 │
plugin A: discover→validate→negotiate→authorize→activating→active ──▶ deactivating → disposed
plugin B: discover→validate→negotiate→authorize→activating→active ──▶ deactivating → disposed
```

一条最小 effect ledger 记录（字段名与取值均为示意，以 Registry 定案为准）：

```json
{
  "ledgerVersion": "0.15.0",
  "recordId": "rec_01J4Z…",
  "sequence": 17,
  "recordedAt": "2026-08-18T03:00:00Z",
  "pluginId": "com.example.message-memory",
  "pluginVersion": "1.2.0",
  "activationId": "act_9d21…",
  "runtimeId": "rt_host_01",
  "effectId": "eff_44ab…",
  "effectKind": "command-handler",
  "contract": { "apiVersion": "commands.dsh/v1alpha1", "kind": "Command" },
  "resourceId": "com.example.message-memory.show-last",
  "operation": "bind",
  "state": "ok",
  "correlationId": "req_7c1e…",
  "sensitivityClass": "low",
  "redactionPolicy": "default-v0.15"
}
```

## 4. 错误与边界情况

| 情况 | 规定行为 |
| --- | --- |
| 前置阶段任一失败 | 不进入 `activating`；required 缺失给可读拒载原因，optional 缺失走声明过的降级路径（判定规则见 [negotiation.md](negotiation.md)） |
| `activating` 抛异常或超时 | 直接进入 `disposed`，ledger 记录失败；宿主继续激活其他插件，一个插件的激活失败不阻塞 generation |
| `deactivating` 中单项资源释放失败 | 记 `cleanup-failed`，继续释放其余资源；不阻塞整个 activation 到达 `disposed` |
| 崩溃后重启发现残留资源 | 恢复扫描对比持久 resource marker 与最后 durable ledger，报告 `orphaned` / `unknown`，**不得**伪造清理成功 |
| 同 ID 重复 contribution | 静态冲突检测在 validate 阶段拦截（规则见 [manifest.md](manifest.md)） |
| 插件在 `active` 之外调用标准能力 | 视为契约违例；宿主可以拒绝并在 ledger 记录 |

## 5. 对应 fixtures 清单

> fixtures 由后续任务创建，路径为约定路径；非法样本一个文件只埋一个错（约定见 [conformance/fixtures/README.md](../conformance/fixtures/README.md)）。

| fixture（约定路径） | 抓住的"必须" |
| --- | --- |
| `conformance/fixtures/lifecycle/activation-order.json` | 前置阶段顺序；不得跳阶段激活 |
| `conformance/fixtures/lifecycle/no-lazy-activation.json` | eager activation；command / subscription 不激活 inactive 插件 |
| `conformance/fixtures/lifecycle/graceful-shutdown.json` | 正常关闭 best-effort deactivate；清理失败记 `cleanup-failed` |
| `conformance/fixtures/lifecycle/crash-no-deactivate.json` | 崩溃不保证送达；重启报告 `orphaned` / `unknown` |
| `conformance/fixtures/lifecycle/cleanup-repeatable.json` | 插件清理可重复执行 |
| `conformance/fixtures/lifecycle/duplicate-activation.json` | 重复激活产生新 `activationId`；旧 effect 释放或转交 |
| `conformance/fixtures/lifecycle/ledger-ownership.json` | 每个标准注册归属到 plugin + activation；不得冒充 owner |
| `conformance/fixtures/lifecycle/ledger-append-only.json` | ledger 只追加，不可改不可删 |
| `conformance/fixtures/lifecycle/ledger-no-secrets.json` | ledger 默认不含消息正文与 secret |

## 6. 变更记录

| 版本 | 日期 | 变更 |
| --- | --- | --- |
| v0.15 | 2026-08 | 初稿：自 RFC 0001 §7.4 / §7.6 拆分，补 fixture 约定；完整 effect ledger 链接到 [RFC 0004](../rfcs/0004-provenance-diagnostics.md) |
