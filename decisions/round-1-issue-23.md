# 处置记录 · 第一轮：community#23（13 条评论 → v0.1）

| 字段 | 内容 |
| --- | --- |
| 反馈来源 | [omdsh-dev/community#23](https://github.com/omdsh-dev/community/issues/23)（首轮 RFC + 13 条评论） |
| 处置版本 | v0.1 |
| 状态 | 已归档 |

> **规则**：新评论不静默改写 Draft——变更先过 RFC 审查，再登记到本目录。处置类别：已采纳 / 限定采纳 / 独立 RFC / Adapter 实验 / 不属可移植核心 / 已记录。
> "已采纳"表示被 Draft 文档采纳，不表示所有参与者已形成正式共识——正式共识由治理流程（[RFC 0000](../rfcs/0000-governance.md)）产生。

| 意见（提出者） | 处置 | 落点 |
| --- | --- | --- |
| `plugin.json` 与 Agent Plugins 规范冲突（btspoony） | 已采纳 | 改名 `dsh-plugin.json` |
| 借鉴 K8s 的 type metadata / apiGroup+kind（morlay） | 限定采纳 → **v0.15 扩大采纳** | v0.1 仅六维版本模型；v0.15 契约坐标全面转向 `apiVersion + kind` |
| patch 震荡与可信验证需求，勿变成无验证的插件堆场（mattheliu） | 已采纳 | [RFC 0004](../rfcs/0004-provenance-diagnostics.md) 证据分级；格式检查 ≠ 安全 |
| 安装前影响预览 + 运行时溯源（shine-233） | 已采纳 | RFC 0004：影响报告 / 验证报告 / effect ledger |
| dsh-forge / dsh-neoforge 运行时 mixin PoC 与冲突显式化（r05En1cU） | Adapter 实验 | 冲突显式化证据有价值；私有 target 不进插件 API |
| 双版本号、权威 registry、contributes id 全局唯一与静态冲突检测、机器可读校验报告（qing3a / dsh-plugin-verify） | 限定采纳 | 静态 JSON、权威 registry、确定性 ID；校验报告并入协商报告格式 |
| dsh-TUI 认领早期一致性实现与溯源可视化（T-Auto） | 已采纳 | 实现不能自我认证；`before-*` 仍不进核心 |
| Remote SSH 反例：command tree 丢失、登录方式不应注册时决定、device code 不进持久化日志（Yan-Zero） | 独立 RFC | [RFC 0002](../rfcs/0002-runtime-presentation.md) 五概念分层 + 短期交互消息通道 |
| Runtime / Presentation / Control / Transport 正式分层、Reference Host 纳入标准（T-Auto） | 限定采纳 | RFC 0002 定义分层与 conformance，不指定唯一产品架构 |
| 依赖锁定、一键复现、环境可观测性（T-Auto） | 独立 RFC | RFC 0004 记录不可变 artifact；lockfile / modpack 归 packaging 提案 |
| requires / provides / contributes 拆分与机器可判定组合规则、hook 分级（Qiuner） | 已采纳 | 原则 ② 五类声明；[RFC 0003](../rfcs/0003-service-composition.md) 组合规则 |
| page → layer → slot → component 统一 UI 服务（r05En1cU / Lipraty） | 独立 RFC | 跨端声明式 UI 整体延期；vnode / adapter 证据供 UI RFC 参考 |
| 多 Panel Web UI 的 URL state（morlay，首轮） | 不属可移植核心 | 归 Web Presentation capability（v0.15 处置见 [round-2](round-2-issue-24.md)） |

原始逐条处置记录（含评论原文引述）见 [research/community-issue-23-review.md](../research/community-issue-23-review.md)（待迁移）。
