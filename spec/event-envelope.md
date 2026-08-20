# Spec: 事件信封（Event Envelope）与 `messages.observe`

> **状态：Draft v0.15（社区讨论稿，非官方标准）**
> ⚠️ payload 对齐 MCP `ContentBlock` 的**精确字段边界是本轮征求意见的重点**（v0.15 §9 第 3 问），相关小节标注"待社区反馈冻结"。
> 每条"必须"对应的测试样本统一列在文末 [§5 fixtures 清单](#5-对应-fixtures-清单)，正文不再逐条标注。

这份文件管"事件长什么样、按什么顺序到、能不能改"。

先说清楚"信封"是什么：每个标准事件都裹在一层固定格式的元数据里，就像快递面单——不拆包裹（payload）就能知道这件事是什么类型、属于哪个会话、排第几号、有多敏感、被裁剪过什么。宿主、市场、诊断工具都靠读面单干活，只有获得授权的订阅者才拆包裹。

谁该读：**宿主维护者**（产生并投递信封）、**插件作者**（订阅并消费事件）、**市场 / 诊断工具作者**（靠 `privacyClass` 与 `redactions` 决定能展示什么）。

## 1. 适用范围

- 本文定义**所有标准事件共用的信封格式**与投递语义，以及 v0.15 唯一的事件契约 `messages.observe` 的使用约束。
- 信封是传输中立的：进程内调用、IPC、WebSocket 都使用同一格式。
- 本文**不**定义具体事件的 payload schema（payload 的机器可读定义归 Registry 条目与对应 schema 文件）；`messages.observe` 的注册表条目见 [registry/events/messages.dsh-v1alpha1.md](../registry/events/messages.dsh-v1alpha1.md)。
- 可修改 / 可取消的 `before-*` 事件**不在** v0.15 范围内（见 §2.5）。

## 2. 规范性定义

### 2.1 信封字段

每个标准事件**必须**包装为带版本的信封。v0.15 信封字段如下（字段名为示意，以 Registry 定案为准）：

| 字段 | 必须性 | 含义 |
| --- | --- | --- |
| `envelopeVersion` | 必须 | 信封结构自身的版本，与事件契约版本独立演进 |
| `eventType` / `eventVersion` | 必须 | 事件契约坐标的两半（如 `messages.dsh` / `v1alpha1`），合起来唯一指向一条 Registry 条目 |
| `eventId` | 必须 | 全局唯一的事件 ID |
| `scopeType` / `scopeId` / `scopeSequence` | 必须 | 事件所属 scope（作用域，如某个 session）的类型与 ID，以及**在该 scope 内单调递增**的序号 |
| `correlationId` | 应该 | 同一操作链的关联 ID，用于跨事件追踪 |
| `privacyClass` | 必须 | 该事件的敏感级别（取值集合随 ContentBlock 边界一并冻结，见 §3.2） |
| `redactions` | 必须 | 已施加的裁剪摘要；没有裁剪时为空列表——空列表本身也是信息（"确实没裁"），字段不得省略 |
| `payloadSchema` | 必须 | payload 的 canonical schema identifier，宿主据此选择本地已支持的 schema，不得联网获取 |
| `payload` | 必须 | 事件正文，**不可变**（见 §2.3） |

规范性要求：

- 缺少任一"必须"字段的信封是非法的，宿主**必须**拒收并记录错误——不得"尽力解析"后投递半个事件。
- `scopeSequence` 在同一 `scopeType` + `scopeId` 内**必须**单调递增、不得重复。
- `eventType` / `eventVersion` **必须**能解析到 Registry 精确条目；实现方不得自行发明"等价"事件名。

### 2.2 顺序保证：只有 scope 内顺序

顺序保证只有一条，也只有这一条：**同一 scope 内**的投递顺序与 `scopeSequence` 一致。

跨 scope 没有任何顺序承诺。session A 的第 5 条比 session B 的第 3 条先到还是后到，纯属巧合——插件**不得**依据跨 scope 的到达先后推断因果关系。为什么不给全局顺序：给了它，任何一个慢 scope 都会拖住所有 scope 的投递，全局序就是全局锁。需要跨事件关联时，用 `correlationId`。

时间戳（若实现方自行附加）同样不构成跨 scope 的顺序证据。

### 2.3 不可变 payload

- 信封投递给 observer 后，`payload` **必须**不可修改：某个 observer 的任何写操作不得影响其他 observer 或宿主侧状态。否则十个订阅者收到的是十个可能互相污染的版本，"观察"就变成了"篡改接力"。
- "不可修改"是语义保证，宿主**可以**用冻结对象、拷贝或只读视图中的任何一种实现。

### 2.4 `messages.observe` 是不可修改的观察事件

v0.15 唯一的事件契约是 `messages.observe`（契约坐标 `messages.dsh/v1alpha1`，kind: MessageObserver）。一个容易困惑的点先讲清楚：**订阅时用事件名，信封里用坐标**——manifest `subscriptions` 写 `"messages.observe"`（见 [manifest.md §3.10](manifest.md)），信封里则以 `eventType: "messages.dsh"` / `eventVersion: "v1alpha1"` 标识同一事件；两者的对应关系由 registry 条目定义（[registry/events/messages.dsh-v1alpha1.md](../registry/events/messages.dsh-v1alpha1.md)）。

四条使用约束：

- **只能看，不能碰。** observer 只能读取，不能修改、不能取消、不能阻断消息本身；返回修改指令或阻断信号会被忽略。
- **订阅不等于激活。** 订阅通过 manifest `subscriptions` 声明，只控制事件投递；subscription 命中**不会**激活 inactive 插件（激活语义见 [lifecycle.md](lifecycle.md) §2.2）。
- **消息内容是高敏感数据。** observer 插件**必须**在 manifest 中声明对应订阅并通过授权；宿主**必须**按 `privacyClass` 对未授权或低授权的 observer 施加 `redactions`（见 §3.2），不得把完整正文交出去。
- **一个 observer 炸了不能连坐。** observer 抛异常**不得**影响消息主流程与其他 observer；回压、timeout、错误隔离与关闭时的 drain 行为随一致性套件固化。

### 2.5 `before-*` 可修改事件不进 v0.15

可修改 / 可取消的 `before-*` 事件在 v0.15 中**不存在**。原因：多插件执行顺序、修改合并、cancel 语义、timeout 与回滚、跨 session 并发、隐私裁剪——这六个问题一个都还没定义，给 listener 起个 `before` 名字不解决任何问题，只会让插件依赖一个没人承诺过的行为。

进入标准的前置条件清单见 [RFC 0002](../rfcs/0002-runtime-presentation.md)；清单全部回答并有 fixtures 后，才允许以独立 RFC 提出具体 `before-*` 事件。在此之前，宿主**不得**以任何命名提供可修改的消息事件并声称符合本标准。

## 3. 示例

### 3.1 完整信封示例

```json
{
  "envelopeVersion": "0.15.0",
  "eventType": "messages.dsh",
  "eventVersion": "v1alpha1",
  "eventId": "evt_01J4ZEXAMPLE7YQ8",
  "scopeType": "session",
  "scopeId": "sess_8f3a2c",
  "scopeSequence": 42,
  "correlationId": "req_7c1e9b",
  "privacyClass": "content",
  "redactions": ["payload.content[1].resource.uri"],
  "payloadSchema": "https://dsh-std.example/schemas/messages.dsh/v1alpha1.json",
  "payload": {
    "direction": "received",
    "messageId": "msg_55d1",
    "content": [
      { "type": "text", "text": "帮我看下这个报错" },
      { "type": "resource", "resource": { "uri": "[redacted]", "mimeType": "image/png" } }
    ]
  }
}
```

（`payloadSchema` URL、scopeType 取值、`privacyClass` 取值均为示意，以 Registry 定案为准。）

### 3.2 payload 与 MCP `ContentBlock` 对齐（**待社区反馈冻结**）

`payload.content` 的消息内容结构对齐 [MCP `ContentBlock`](https://modelcontextprotocol.io/specification/2026-07-28/schema#contentblock)。理由（morlay，第二轮讨论）：ACP / MCP / ToolCall 的返回结果已经收敛到 `ContentBlock[]`，自造一套格式收益为零，代价是信息丢失外加一层多余的序列化（处置记录见 [decisions/round-2-issue-24.md](../decisions/round-2-issue-24.md)）。

**本节为征求意见稿，以下边界均未冻结（v0.15 §9 第 3 问）**，初稿提议：

| 待定问题 | 初稿倾向 | 待社区反馈 |
| --- | --- | --- |
| 哪些 ContentBlock 类型进 v0.15 信封 | `text`；`image` / `audio` / `resource` / `resource_link` 以引用形式进入 | 是否首版全收 |
| `annotations` 等可选字段 | 保留，但列为可选 | 是否裁掉 |
| 二进制内容 | 不进 payload，只进引用（`resource_link` / `resource.uri`） | 阈值与上限 |
| `privacyClass` 取值集合 | 两级起步：`metadata`（无正文）/ `content`（含正文） | 分级怎么定最不容易被误用 |
| `redactions` 的写法 | JSON 路径列表（见示例） | 是否需要更强的结构化表达 |

在冻结前，实现方**可以**按上表初稿原型验证，但**不得**把任何取值当作稳定契约传播。

## 4. 错误与边界情况

| 情况 | 规定行为 |
| --- | --- |
| 信封缺必填字段 / 版本不识别 | 拒收并记录稳定错误码；不得"尽力解析"后投递半个事件 |
| `scopeSequence` 乱序 / 重复 / 跳号 | 检出并记录；宿主可以丢弃该事件或对 scope 标记降级，但不得静默重排 |
| observer 抛异常或超时 | 隔离该 observer：记错误、可取消其订阅，不影响消息主流程与其他 observer |
| observer 试图修改 payload 或返回修改指令 | 忽略；重复违例可以取消订阅 |
| 未授权 / 高敏感事件 | 按 `privacyClass` 裁剪后投递或拒绝投递；不得把完整正文交给无授权 observer |
| 宿主关闭时队列未清空 | best-effort drain（能送的送完），不保证全部送达（关闭语义见 [lifecycle.md](lifecycle.md) §2.3） |

## 5. 对应 fixtures 清单

> fixtures 由后续任务创建，路径为约定路径；非法样本一个文件只埋一个错（约定见 [conformance/fixtures/README.md](../conformance/fixtures/README.md)）。

| fixture（约定路径） | 抓住的"必须" | 测法 |
| --- | --- | --- |
| `events/envelope-missing-field.json` | 必填字段缺一不可 | 逐个删掉必填字段，断言投递被拒 |
| `events/unknown-event-type.json` | eventType/eventVersion 必须解析到 Registry 精确条目 | 投递未登记事件名，断言被拒 |
| `events/scope-sequence-gap.json` | scope 内序号单调、投递有序 | 投递乱序/重复序号，断言被检出 |
| `events/no-global-order.json` | 不隐含全局顺序 | 交错投递两个 scope 的事件，断言消费方不做全局顺序假设 |
| `events/payload-mutation.json` | payload 不可变 | observer 尝试改写 payload，断言其他 observer 与宿主看到原值 |
| `events/observer-cannot-modify.json` | 观察事件不可修改 / 不可取消 | observer 返回修改指令或阻断信号，断言被忽略且无副作用 |
| `events/observer-throws.json` | observer 异常隔离 | observer 抛异常，断言主流程与其他 observer 不受影响 |
| `events/redactions-required.json` | 高敏感事件的授权与裁剪 | 向未授权 observer 投递高敏感事件，断言 payload 被裁剪或拒绝投递 |

## 6. 变更记录

| 版本 | 日期 | 变更 |
| --- | --- | --- |
| v0.15 | 2026-08 | 初稿：自 RFC 0001 §7.4 拆分；payload 对齐 MCP `ContentBlock` 的字段边界列入征求意见（待社区反馈冻结） |

## 关联

- registry 条目：[events/messages.dsh-v1alpha1](../registry/events/messages.dsh-v1alpha1.md)
- 生命周期与订阅不激活语义：[lifecycle.md](lifecycle.md)
- `before-*` 前置条件清单：[RFC 0002](../rfcs/0002-runtime-presentation.md)
