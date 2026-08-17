# `commands.dsh/v1alpha1` — Command

> **优先级：P0 ｜ 状态：骨架占位（Draft，坐标为示意，以 Registry 定案为准）**
> 机器可读条目：[commands.dsh-v1alpha1.json](commands.dsh-v1alpha1.json)

## 写作提纲

- [ ] **语义**：flat action leaf——一个全局唯一 ID 对应一个 handler，完事
- [ ] **明确列出不包含的东西及归属**（v0.15 §4.2）：
  - command tree → [RFC 0002](../../rfcs/0002-runtime-presentation.md)（Remote SSH 场景下子命令树会丢在半路）
  - 交互式 prompt → RFC 0002（短期交互消息通道）
  - 流式输出 → RFC 0002（依赖 Runtime / Presentation 分层）
- [ ] 用法示例：manifest `contributes.commands` 声明 + `extensions.publish` 发布 handler
- [ ] 对应 v0.1 名字：`commands`
