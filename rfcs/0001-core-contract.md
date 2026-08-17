# RFC 0001: 核心契约（Core Contract）—— Manifest、Capability 协商与事件契约

| 字段 | 内容 |
| --- | --- |
| 编号 | 0001 |
| 状态 | **骨架占位（P0，待迁移改造）**——底稿为 v0.15 正文（community#24 主帖） |
| 目标版本 | v0.15 |
| 讨论方式 | [community#23](https://github.com/omdsh-dev/community/issues/23) → [community#24](https://github.com/omdsh-dev/community/issues/24) |

> 这是主 RFC。迁移时做三处调整（docs-plan.md §2）：
>
> 1. 规范性细节改为指向 spec/ 各文件（避免两处维护同一句话）；
> 2. §5 变更记录和附录 A 处置表移到 decisions/（已迁移，见 [round-1](../decisions/round-1-issue-23.md) / [round-2](../decisions/round-2-issue-24.md)），此处留链接；
> 3. 补一节"被拒绝的替代方案"：动态 manifest、平面能力名 vs 契约坐标、按需激活——每个写 3 句（是什么、为什么拒、什么条件下重新考虑）。

## 迁移检查单

- [ ] v0.15 正文整体迁入（§0–§9 + 附录 B 索引）
- [ ] §3.4 manifest 细节 → 指向 [spec/manifest.md](../spec/manifest.md)
- [ ] §4.1 交付物 2/3/4 → 指向 [spec/host-descriptor.md](../spec/host-descriptor.md)、[registry/](../registry/README.md)、[spec/negotiation.md](../spec/negotiation.md)
- [ ] §4.2 三项领域契约 → 指向 registry 首批条目
- [ ] §4.3 版本模型 → 指向 [VERSIONING.md](../VERSIONING.md)
- [ ] §5 / 附录 A → 替换为 decisions/ 链接
- [ ] 新增"被拒绝的替代方案"一节
