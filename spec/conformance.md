# Spec: 一致性（Conformance）

> **优先级：P1 ｜ 状态：骨架占位（待撰写）**

<!-- 固定结构：适用范围 → 规范性定义 → 示例 → 错误与边界情况 → fixtures 清单 → 变更记录 -->

## 写作提纲

- [ ] 四类证据的定义与表述边界：
  1. **Schema validation**（manifest / descriptor 通过 schema 校验）
  2. **Host conformance**（宿主跑通一致性套件）
  3. **Plugin validation**（插件通过校验）
  4. **Interop evidence**（两宿主 × 三插件互操作证据）
- [ ] "通过 conformance"**能说什么、不能说什么**：宿主只能说"通过 v0.15 Host conformance"，插件只能说"通过 v0.15 plugin validation"——**谁都不能说"安全插件"或"官方认证"**（v0.15 §4.4）
- [ ] 测试环境记录要求：标准版本、宿主 ID / 版本 / 平台、套件 commit、时间、结果
- [ ] v0.15 晋级验收：至少两个独立宿主产品/集成（可共享同一版本化 DSH Adapter，但集成与 descriptor 证据必须独立）× 三个示例插件跑通同一组 headless 场景；dsh-TUI 已认领首个 Host conformance

## 关联

- fixtures 目录：[conformance/fixtures/](../conformance/fixtures/README.md)
- 证据分级完整版：[RFC 0004](../rfcs/0004-provenance-diagnostics.md)
