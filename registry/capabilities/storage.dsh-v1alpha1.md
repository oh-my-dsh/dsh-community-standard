# `storage.dsh/v1alpha1` — LocalStorage

> **优先级：P0 ｜ 状态：骨架占位（Draft，坐标为示意，以 Registry 定案为准）**
> 机器可读条目：[storage.dsh-v1alpha1.json](storage.dsh-v1alpha1.json)

## 写作提纲

- [ ] **语义**：插件私有持久化，按 Component 隔离
- [ ] **明确不包含**：跨插件共享存储——共享本质是插件间组合问题，归 [RFC 0003](../../rfcs/0003-service-composition.md)（v0.15 §4.2）
- [ ] 用法示例：manifest `requires.contracts` 声明 + 协商后的能力注入
- [ ] 对应 v0.1 名字：`storage.local`
