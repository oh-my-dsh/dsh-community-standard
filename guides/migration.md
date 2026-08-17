# 迁移指南（Migration Guide）

> **优先级：P2 ｜ 状态：骨架占位（待撰写）**
> **本文非规范，冲突以 spec/ 为准。**

## 写作提纲

现有插件（patch / 内部接口流派）迁移到标准的路径：

- [ ] 第一步：识别 patch 点——列出你的插件现在碰了哪些宿主内部接口
- [ ] 第二步：映射到标准契约——每个 patch 点对应哪个 registry 条目（对照表见[插件作者指南](plugin-author.md)）
- [ ] 第三步：补 manifest（[spec/manifest.md](../spec/manifest.md)）
- [ ] 第四步：跑 validation，看协商报告
- [ ] **诚实列出暂时没有标准对应物的野路子**，指向对应延期 RFC：
  - 修改消息 / 拦截行为 → `before-*` 事件（[RFC 0002](../rfcs/0002-runtime-presentation.md) 前置条件清单）
  - 插件间互相调用 → [RFC 0003](../rfcs/0003-service-composition.md)
  - 自定义 UI 面板 → RFC 0002（跨端声明式 UI 整体延期）
  - 联网 / 读写文件系统 → 各自独立 RFC（敏感能力，需授权 UX 契约）
- [ ] 迁移期与 legacy 路径共存的边界：标准插件走标准入口；非标准插件与内置扩展在迁移期是明确的产品边界，不受影响（v0.15 §7.1）
