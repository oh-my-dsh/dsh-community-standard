# 插件需求调研（12 样本）

> **调研快照，非规范，不代表推荐。**
> **状态：骨架占位（P3，待迁移）** ｜ 迁移自：[fabric 仓库 dsh-plugin-needs.zh.md](https://github.com/anywhere-labs/deepseek-harness-desktop/blob/master/dsh-community-fabric/docs/research/dsh-plugin-needs.zh.md)

迁移时内容不动，仅修正交叉引用。核心结论（供引用）：

- 多数插件靠源码 patch、monkey patch、内部事件名或 `ctx.get()` 反射探测实现功能
- 12 个样本插件里 **9 个**同时需要宿主侧逻辑和客户端呈现（Facet 模型的动机数据）
