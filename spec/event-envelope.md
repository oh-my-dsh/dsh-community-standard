# Spec: 事件信封（Event Envelope）与 `messages.observe`

> **优先级：P0 ｜ 状态：骨架占位（待撰写）**
> ⚠️ payload 对齐 MCP `ContentBlock` 的**精确字段边界是本轮征求意见的重点（v0.15 §9 第 3 问），初稿须标注"待社区反馈冻结"**。

<!-- 固定结构：适用范围 → 规范性定义 → 示例 → 错误与边界情况 → fixtures 清单 → 变更记录 -->

## 写作提纲

- [ ] 信封字段：`envelopeVersion`、`eventType` / `eventVersion`、`eventId`、`scopeType` / `scopeId` / `scopeSequence`（scope 内单调序号）、`correlationId`、`privacyClass`、`redactions`（裁剪摘要）、`payloadSchema`、不可变 payload
- [ ] payload 消息内容与 [MCP `ContentBlock`](https://modelcontextprotocol.io/specification/2026-07-28/schema#contentblock) 对齐的精确字段边界（理由：ACP / MCP / ToolCall 返回已收敛到该结构，自造格式收益为零）——**哪些字段进 v0.15 信封、哪些裁剪、`privacyClass` 怎么分级最不容易被误用，均待反馈**
- [ ] 顺序保证：仅保证 scope 内顺序，**不隐含全局顺序**
- [ ] `messages.observe` 是**不可修改**的观察事件
- [ ] `before-*` 可修改/可取消事件不进 v0.15 的引用性说明（前置条件清单见 [RFC 0002](../rfcs/0002-runtime-presentation.md)）

## 关联

- registry 条目：[events/messages.dsh-v1alpha1](../registry/events/messages.dsh-v1alpha1.md)
