# `messages.dsh/v1alpha1` — MessageObserver

> **优先级：P0 ｜ 状态：骨架占位（Draft，坐标为示意，以 Registry 定案为准）**
> 机器可读条目：[messages.dsh-v1alpha1.json](messages.dsh-v1alpha1.json)
> ⚠️ payload 的 ContentBlock 对齐边界**待社区反馈冻结**（v0.15 §9 第 3 问）。

## 写作提纲

- [ ] **语义**：**不可修改**的消息观察事件（对应 v0.1 名字 `messages.observe`）
- [ ] 信封字段权威定义在 [spec/event-envelope.md](../../spec/event-envelope.md)——本条目只写用法，不重复规则
- [ ] payload 消息内容对齐 [MCP `ContentBlock`](https://modelcontextprotocol.io/specification/2026-07-28/schema#contentblock) 的字段边界（哪些进信封、哪些裁剪、`privacyClass` 分级）
- [ ] 敏感级别说明：消息内容属高敏感，`privacyClass` / `redactions` 的使用要求
- [ ] 用法示例：manifest `subscriptions` 声明 + observer 注册
