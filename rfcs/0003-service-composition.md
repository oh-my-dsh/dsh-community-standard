# RFC 0003: Service Provider 与确定性组合

| 字段 | 内容 |
| --- | --- |
| 编号 | 0003 |
| 状态 | **骨架占位（P2，待迁移）——下一阶段最高优先级** |
| 迁移自 | [fabric 仓库 0003-service-providers-and-composition.zh.md](https://github.com/anywhere-labs/deepseek-harness-desktop/blob/master/dsh-community-fabric/docs/rfcs/0003-service-providers-and-composition.zh.md) |

> 迁移要求：内容不动，只改三处——① 路径与交叉引用；② 元信息表加"迁移自"来源；③ 状态统一为 Draft。
> 落地计划 Phase 3 即启动本 RFC 评审（v0.15 §8）。

## 内容要点（供迁移时核对完整性）

- 五类声明的语义边界（requires / permissions / provides / contributes / subscriptions）
- provider cardinality、用户选择、冲突组合计划
- 健康检查与替换
- `provides` / `requires.services` 开闸的前置条件（v0.15 明确拒绝这两个字段，规则见 spec/manifest.md）
