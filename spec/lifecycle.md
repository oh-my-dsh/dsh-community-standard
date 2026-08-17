# Spec: 生命周期（Lifecycle）

> **优先级：P0 ｜ 状态：骨架占位（待撰写）**

<!-- 固定结构：适用范围 → 规范性定义 → 示例 → 错误与边界情况 → fixtures 清单 → 变更记录 -->

## 写作提纲

- [ ] **两个状态机分开写**：
  - 宿主状态机：`starting → ready → stopping → stopped`
  - activation 状态机：`discover → validate → negotiate → authorize → activating → active → deactivating → disposed`
- [ ] generation-scoped eager activation：以 runtime generation 为作用域的立即激活；**无按需激活**及其理由（第二套生命周期 + 首次并发竞态 + 延迟失败；先用 eager 拿到可验证基线，按需激活归"后续基于测量的提案"）
- [ ] 关闭语义：正常关闭 best-effort deactivate；崩溃时不保证送达；**插件清理必须设计成可重复执行**
- [ ] HMR / profile 重组下的重复激活
- [ ] Broker 归属：所有标准注册归属到"哪个插件的哪一次激活"（原则 ⑥）
- [ ] 最小 effect ledger 记录字段：`create / bind / replace / release / cleanup-failed`；默认不写消息正文和 secret（完整版归 [RFC 0004](../rfcs/0004-provenance-diagnostics.md)）
