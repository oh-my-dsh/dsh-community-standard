# conformance/suites

> **状态：骨架占位**。headless 一致性测试套件，**Phase 2 实现期产出**（见 v0.15 §8）。

## 覆盖范围（来自 v0.15 §4.1 交付物 8）

- 协商（含三种结局）
- 授权拒绝
- 激活顺序
- 异常捕获
- 重复激活（HMR / profile 重组）
- 清理（含 cleanup-failed 记录）

验收口径见 [spec/conformance.md](../../spec/conformance.md)：两宿主 × 三插件互操作证据。
