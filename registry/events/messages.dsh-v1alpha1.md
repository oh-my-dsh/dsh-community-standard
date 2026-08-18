# `messages.dsh/v1alpha1` — MessageObserver

> **状态：Draft v0.15（社区讨论稿，非官方标准；坐标为示意，以 Registry 定案为准）**
> 机器可读条目：[messages.dsh-v1alpha1.json](messages.dsh-v1alpha1.json)
> ⚠️ payload 的 ContentBlock 对齐边界**待社区反馈冻结**（v0.15 §9 第 3 问）。

这条契约管"插件观察消息"：插件要在消息收发时得到通知（做记录、统计、联动）时读本条目；宿主维护者实现消息事件投递与裁剪时也读本条目。

## 语义

**不可修改的消息观察事件**，本事件的规范事件名是 **`messages.observe`**（沿用 v0.1 名字）：

- observer 只能**读取**事件：不能修改、不能取消、不能阻断消息本身。
- 信封字段、scope 内顺序保证、不可变 payload 的权威定义在 [spec/event-envelope.md](../../spec/event-envelope.md)——本条目只写用法，不重复规则。
- 订阅通过 manifest `subscriptions` 声明，只控制事件投递；subscription 命中**不会**激活 inactive 插件（激活语义见 [spec/lifecycle.md](../../spec/lifecycle.md) §2.2）。

## 敏感级别

**消息内容属高敏感数据**（机器可读条目中 `sensitivity: high`）：

- 订阅本事件需要显式授权——宿主支持不等于用户已授权（协商与授权的关系见 [spec/negotiation.md](../../spec/negotiation.md)）。
- 宿主必须按信封 `privacyClass` 施加 `redactions`，不得把完整正文交给无授权 observer（规则与 fixtures 见 [spec/event-envelope.md](../../spec/event-envelope.md) §2.4）。
- 插件侧收到多少数据，取决于授权范围，不取决于它声明想看多少。

## payload 与 MCP `ContentBlock` 对齐（**待社区反馈冻结**）

`payload.content` 对齐 [MCP `ContentBlock`](https://modelcontextprotocol.io/specification/2026-07-28/schema#contentblock) 的精确字段边界——哪些字段进信封、哪些裁剪、`privacyClass` 怎么分级——是本轮征求意见点（v0.15 §9 第 3 问，morlay 提出，处置见 [decisions/round-2-issue-24.md](../../decisions/round-2-issue-24.md)）。初稿提议与待答问题见 [spec/event-envelope.md](../../spec/event-envelope.md) §3.2，本条目不复述。**冻结前不得把任何字段取值当作稳定契约传播。**

## 用法示例

manifest 声明订阅——`subscriptions` 的元素是**事件名**（以 [spec/manifest.md](../../spec/manifest.md) §3.10 为准）：

```json
{
  "subscriptions": ["messages.observe"]
}
```

activation 中注册 observer（SDK 形态为示意）：

```ts
export default defineFacet((activation) => {
  const dispose = activation.messages.observe((envelope) => {
    // envelope.payload 只读；改写不会产生任何效果
    console.log(envelope.scopeSequence, envelope.payload.messageId)
  })
  activation.scope.add(dispose) // 归本次 activation 所有，deactivate 时自动释放
})
```

## 事件名与契约坐标

- **事件名 `messages.observe`**（沿用 v0.1 平面能力名）：manifest `subscriptions` 用它声明订阅（见 [spec/manifest.md](../../spec/manifest.md) §3.10）。
- **契约坐标 `messages.dsh/v1alpha1` + kind `MessageObserver`**：`requires.contracts`、Host Descriptor `capabilities`、协商报告与信封的 `eventType` / `eventVersion`（`messages.dsh` / `v1alpha1`）用它精确引用，版本随契约独立演进（见 [VERSIONING.md](../../VERSIONING.md)）。

两种写法指向同一条 Registry 条目，分工不同，不得混用。
