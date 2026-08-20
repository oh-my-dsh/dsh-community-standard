# 处置记录 · 第二轮：community#24（5 条评论 → v0.15）

| 字段 | 内容 |
| --- | --- |
| 反馈来源 | [omdsh-dev/community#24](https://github.com/omdsh-dev/community/issues/24)（v0.1 定稿后的 5 条评论） |
| 处置版本 | v0.15 |
| 状态 | 已归档 |

> **规则**：新评论不静默改写 Draft——变更先过 RFC 审查，再登记到本目录。处置类别：已采纳 / 限定采纳 / 独立 RFC / Adapter 实验 / 不属可移植核心 / 已记录。

| 意见（提出者） | 处置 | 落点 |
| --- | --- | --- |
| 内核应为领域无关元协议，契约可拔插、独立版本化，避免中心化 SDK 频繁发版（Yan-Zero，附 [dsh-std](https://github.com/Yan-Zero/dsh-std) 探索实现） | **已采纳** | 原则 ⑦；元协议内核重构（[spec/negotiation.md](../spec/negotiation.md)）；契约版本独立演进（[VERSIONING.md](../VERSIONING.md)） |
| 引入 Facet 分面与 Scoped Context 规范多端插件形态（Yan-Zero，附 [dsh-codex 重构验证](https://github.com/Yan-Zero/dsh-codex/tree/agent/std-facet-runtime)） | **采纳方向，收窄范围** | 四级对象模型进入规范术语（[spec/facet-model.md](../spec/facet-model.md)）；v0.15 只规范 `host`，`client` / `worker` 保留名归 [RFC 0002](../rfcs/0002-runtime-presentation.md) |
| 消息内容应与 MCP `ContentBlock` 对齐，避免信息丢失与序列化开销（morlay） | **已采纳** | [spec/event-envelope.md](../spec/event-envelope.md)；精确字段边界列入 v0.15 §9 征求意见 |
| URL query 状态持久化/回填（类 Grafana dashboard，应对桌面随机端口）（morlay） | **限定采纳** | 归 Web Presentation capability（暂名 `x-web.panel.urlState`），带字段白名单、大小上限、按插件隔离、禁存 secret；不进核心，不强加给 TUI / headless 宿主（采纳 Qiuner 建议） |
| RFC 0003（插件间 service 组合）保持下一阶段最高优先级（Qiuner） | **已采纳** | Phase 3 即启动评审；provider cardinality、选择、冲突计划、健康与替换为其必答题（[RFC 0003](../rfcs/0003-service-composition.md)） |
| 反复强调参考实现不是标准（Qiuner） | **已采纳** | 从验收标准提升为原则 ⑧ |
| TUI 认领第一批标准兼容宿主与测试（T-Auto） | **已采纳** | v0.15 §4.4 验收证据；Phase 2（[spec/conformance.md](../spec/conformance.md)） |

> **表注**：Issue #24 实际共 5 条评论，本表 7 行——Yan-Zero 的一条评论含两点建议（元协议内核、Facet 分面），Qiuner 的一条评论含三点建议（RFC 0003 优先级、URL query 归属、参考实现定位），均按建议逐条拆分登记。
