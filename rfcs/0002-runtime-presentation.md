# RFC 0002: Runtime / Presentation / Control / Transport / Invocation 分层

| 字段 | 内容 |
| --- | --- |
| 编号 | 0002 |
| 状态 | **骨架占位（P2，待迁移）** |
| 迁移自 | [fabric 仓库 0002-runtime-presentation-invocation-transport.zh.md](https://github.com/anywhere-labs/deepseek-harness-desktop/blob/master/dsh-community-fabric/docs/rfcs/0002-runtime-presentation-invocation-transport.zh.md) |

> 迁移要求：内容不动，只改三处——① 路径与交叉引用；② 元信息表加"迁移自"来源；③ 状态统一为 Draft。

## 内容要点（供迁移时核对完整性）

- Remote SSH 反例（command tree 丢失在半路；执行位置、界面能力、授权方是三个独立维度）
- 五概念分层：Runtime / Presentation / Control / Transport / Invocation
- command tree、短期交互消息通道
- `presentation.urlState`（URL query 状态持久化/回填，字段白名单、大小上限、按插件隔离、禁存 secret）
- `client` / `worker` facet 契约归属本 RFC
- `before-*` 可修改事件的前置条件清单
