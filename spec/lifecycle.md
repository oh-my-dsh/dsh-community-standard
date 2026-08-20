# Spec: 生命周期（Lifecycle）

> **状态：Draft v0.15（社区讨论稿，非官方标准）**
> 每条"必须"对应的测试样本统一列在文末 [§5 fixtures 清单](#5-对应-fixtures-清单)，正文不再逐条标注。

这份文件管三件事：**什么时候激活、怎么关闭、资源算谁的**。具体包括宿主状态机、activation 状态机、激活时机、关闭语义，以及 Broker 归属与最小 effect ledger。

谁该读：**宿主维护者**（要按本文实现激活/停用顺序）、**插件作者**（要把清理写成可重复执行——理由见 §2.3，这一条最容易翻车）、**一致性测试作者**（fixtures 的依据在这里）。

先把两个高频术语说清楚，后文不再解释：

- **effect**：插件在宿主里留下的每一样东西——注册的命令 handler、订阅、面板、打开的资源，统称 effect。
- **effect ledger**：一本只能往后追加、不能涂改的账本，Broker 用它记录每个 effect 的来龙去脉。排障时它负责回答"这个东西是谁创建的、停用后清理了没有"。

术语的规范定义（Component / Facet / Activation 等）见 [facet-model.md](facet-model.md)，本文不重复。

## 1. 适用范围

- 本文规范 **Host-side `host` facet** 的生命周期：宿主产品自身的状态流转，以及每个插件 entrypoint 的每一次 activation instance 的状态流转。
- 本文**不**规范 `client` / `worker` face 的生命周期与跨 face 通信（归 [RFC 0002](../rfcs/0002-runtime-presentation.md)）。
- 协商与授权的内部判定规则见 [negotiation.md](negotiation.md)；本文只规定它们在状态机中的**位置与顺序**。

## 2. 规范性定义

### 2.1 两套状态机必须分开

宿主有自己的状态，每个插件的每次激活也有自己的状态。把它们压成一个字段的后果是经典 bug：宿主 ready 了，就默认所有插件都 active——而实际上有的插件激活失败了、有的还在等授权。所以规则是：**两套独立状态机，不得压成一个字段，也不得用宿主状态推断某个 activation 的状态。**

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
| `deactivating` | best-effort 停用：停止接新调用、把处理中的做完、按序释放 effect | 单项失败记 `cleanup-failed`，不阻塞整体 |
| `disposed` | 终态；本次 activation 的资源已释放或已记录残留 | — |

规范性要求：

- 宿主**必须**在 ready 状态下、且在执行任何插件代码之前，按 `discover → validate → negotiate → authorize` 的顺序完成前置阶段。
- 宿主**必须**为正常 activation 保证上述状态顺序；跳过一个阶段直接进入 `activating` 是非法的。
- 宿主**应该**捕获跨越标准 callback / Promise 边界的普通异常并转为稳定错误。但要诚实：trusted-in-process 档位下（插件与宿主同进程），宿主**无法**拦住 `process.exit`、native crash 或死循环——宿主不得声称做到了（表述边界见 [conformance.md](conformance.md)）。
- `activate` / `deactivate` 是宿主调用的 activation-instance hook，**不是**插件可自行订阅的普通业务事件；插件**不得**把 subscription 命中当成激活信号（见 §2.2）。

### 2.2 generation-scoped eager activation（v0.15 无按需激活）

先解释这串词。**runtime generation**（代）：宿主一次"启动 / HMR / profile 重组"所确定的那一批插件组合——像一届政府，整届上任、整届卸任。**eager activation**（立即激活）：这一届组装好之后，选中的插件全部立刻激活，不等"第一次被用到"。

规范性要求：

- 完成 discover / negotiate / authorize 后，宿主**必须**在组装 runtime generation 时立即激活所有选中的插件，**不得**等待首次使用才激活。
- Contribution 只描述可发现功能，subscription 只控制事件投递。执行 command、请求 Provider 或匹配 subscription 都**不能**激活 inactive 插件。
- 插件**不得**依赖"用到我才启动"的假设编写初始化逻辑；任何启动期副作用都发生在 `activating`。

**为什么不做按需激活**（被拒绝的替代方案，论证全文见 [RFC 0001](../rfcs/0001-core-contract.md)）：按需激活意味着三笔新债——第二套生命周期（每个 contribution 点都变成潜在激活点）、首次调用的并发竞态、以及最阴险的**延迟失败**：插件的启动错误不在启动时爆，而是等到用户点了某个按钮才爆，排障者面对的是"昨天还好好的"。v0.15 先用 eager activation 拿到可验证的基线；按需激活归"后续基于测量的提案"，有真实性能数据再议。

### 2.3 关闭语义：best-effort，清理必须可重复

关于关闭，插件作者需要接受一个不舒服的事实：**你的 `deactivate` 可能被调用零次、一次或多次。** 正常关闭时是一次；进程被 kill、断电时是零次；HMR 抖动时可能不止一次。清理逻辑必须对这三种情况都成立。

- 正常关闭（宿主进入 `stopping`）时，宿主**必须**对每个 active 插件执行 best-effort deactivate：停止接收新调用、在明确时间边界内 abort 并 drain（把处理中的调用做完或中止，不再接新的）、按契约顺序释放 effect。顺序与边界由 effect ledger 记录结果（见 §2.6）。
- 进程崩溃、断电或强制终止时，宿主**不保证** `deactivate` 送达。重启后发现残留资源时，宿主报告 `orphaned` / `unknown`——**不得**伪造清理成功。
- 因此插件**必须**把清理设计为**可重复执行**（幂等）：连续调用两次不抛异常、不产生重复 effect；下一次启动可能需要恢复上一次崩溃残留的状态。

### 2.4 HMR / profile 重组下的重复激活

宿主保持 ready 时，同一插件可能因 HMR 或 profile 重新组合而被**重复 activate / dispose**。规则：

- 每次重新激活**必须**创建新的 activation identity（新的 `activationId`）。旧 activation 的历史归属记录继续可查，当前资源指向新 owner。
- 插件**必须**假设同一 entrypoint 会被重复激活。这条的实战含义是：**模块级全局状态不是保险箱**——上一次激活塞进模块作用域的东西，这一次激活还在，会造成幽灵状态。资源一律挂到 activation scope（`activation.scope.add` 或等价机制）上，由宿主在 deactivate 时统一回收。
- Provider 替换的完整语义（cardinality、冲突计划、新旧 owner 转交）归 [RFC 0003](../rfcs/0003-service-composition.md)，本文只规定"替换产生新 activation identity"这一条。

### 2.5 Broker 归属

所有标准注册（command handler、subscription、Provider、UI contribution 及未来归 activation 所有的注册）**必须**经过 Host API Broker，由 Broker 归属到**哪个插件的哪一次激活**（原则 ⑥：加载顺序永远不做仲裁，归属让冲突有主可循）。插件或 Adapter **不得**绕过 Broker 自行注册标准能力后声称归某个 activation 所有——绕过去的注册就是无主资产，排障时没人认领。

### 2.6 最小 effect ledger

Broker **必须**维护机器可读的最小 effect ledger：append-only、不可修改的转移记录。本文只定义 v0.15 最小版；完整版（物化视图、恢复扫描、observer metadata、保留策略）见 [RFC 0004](../rfcs/0004-provenance-diagnostics.md) §8–§9，不在此复述。

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

- ledger **必须**是 append-only：已有记录不得修改或删除，状态变化以新记录表达。理由：账本能被涂改，"这是谁干的"就永远查不清了。
- ledger 默认**不得**写入消息正文、secret、command argument 或任意插件 payload。ledger 是给排障看的，不是给窃听用的——记"发生过什么"，不记"内容是什么"。
- Broker **必须**与宿主原生 lifecycle 协作，在 dispose 时尝试有界清理并记录结果；清理失败**必须**记为 `cleanup-failed`，不得静默吞掉。
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
| `activating` 抛异常或超时 | 直接进入 `disposed`，ledger 记录失败；宿主继续激活其他插件——一个插件的激活失败不陪葬整个 generation |
| `deactivating` 中单项资源释放失败 | 记 `cleanup-failed`，继续释放其余资源；不阻塞整个 activation 到达 `disposed` |
| 崩溃后重启发现残留资源 | 恢复扫描对比持久 resource marker 与最后 durable ledger，报告 `orphaned` / `unknown`，**不得**伪造清理成功 |
| 同 ID 重复 contribution | 静态冲突检测在 validate 阶段拦截（规则见 [manifest.md](manifest.md)） |
| 插件在 `active` 之外调用标准能力 | 视为契约违例；宿主可以拒绝并在 ledger 记录 |

## 5. 对应 fixtures 清单

> fixtures 由后续任务创建，路径为约定路径；非法样本一个文件只埋一个错（约定见 [conformance/fixtures/README.md](../conformance/fixtures/README.md)）。

| fixture（约定路径） | 抓住的"必须" | 测法 |
| --- | --- | --- |
| `lifecycle/activation-order.json` | 前置阶段顺序；不得跳阶段激活 | 打乱阶段顺序，断言协商器拒绝或宿主报错 |
| `lifecycle/no-lazy-activation.json` | eager activation；command / subscription 不激活 inactive 插件 | 对未激活插件执行其 command、命中其 subscription，断言插件保持 inactive |
| `lifecycle/graceful-shutdown.json` | 正常关闭 best-effort deactivate；清理失败记 `cleanup-failed` 不吞掉 | 断言正常关闭时每个 active 插件都收到 deactivate 且 ledger 到达终态 |
| `lifecycle/crash-no-deactivate.json` | 崩溃不保证送达；重启报告 `orphaned` / `unknown` | kill 进程后重启，断言不伪造清理成功 |
| `lifecycle/cleanup-repeatable.json` | 插件清理可重复执行 | 对同一 activation 连续调用两次 deactivate，断言第二次不抛异常且无重复 effect |
| `lifecycle/duplicate-activation.json` | 重复激活产生新 `activationId`；旧 effect 释放或转交 | 对同一插件连做两次 activate，断言两次 `activationId` 不同 |
| `lifecycle/ledger-ownership.json` | 每个标准注册归属到 plugin + activation；不得冒充 owner | 断言每条 ledger 记录带当前 `pluginId` + `activationId` |
| `lifecycle/ledger-append-only.json` | ledger 只追加，不可改不可删 | 尝试覆盖/删除既有记录，断言被拒绝 |
| `lifecycle/ledger-no-secrets.json` | ledger 默认不含消息正文与 secret | 向 Broker 提交含 secret 的注册，断言序列化后的记录不含该值 |

## 6. 变更记录

| 版本 | 日期 | 变更 |
| --- | --- | --- |
| v0.15 | 2026-08 | 初稿：自 RFC 0001 §7.4 / §7.6 拆分，补 fixture 约定；完整 effect ledger 链接到 [RFC 0004](../rfcs/0004-provenance-diagnostics.md) |
