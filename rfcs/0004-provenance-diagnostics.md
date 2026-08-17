# RFC 0004: 溯源、验证与诊断（Provenance, Validation & Diagnostics）

| 字段 | 内容 |
| --- | --- |
| 编号 | 0004 |
| 状态 | **骨架占位（P2，待迁移）** |
| 迁移自 | [fabric 仓库 0004-provenance-validation-and-diagnostics.zh.md](https://github.com/anywhere-labs/deepseek-harness-desktop/blob/master/dsh-community-fabric/docs/rfcs/0004-provenance-validation-and-diagnostics.zh.md) |

> 迁移要求：内容不动，只改三处——① 路径与交叉引用；② 元信息表加"迁移自"来源；③ 状态统一为 Draft。

## 内容要点（供迁移时核对完整性）

- 证据六分级：declared / resolved / decided / observed / tested / attested
- 不可变 subject identity（绑定 artifact digest，防止市场把"格式检查通过"展示成"安全"）
- 安装影响报告、验证报告
- effect ledger 的完整版（v0.15 只落地最小版，见 spec/lifecycle.md）
