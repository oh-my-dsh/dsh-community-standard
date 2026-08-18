# `commands.dsh/v1alpha1` — Command

> **状态：Draft v0.15（社区讨论稿，非官方标准；坐标为示意，以 Registry 定案为准）**
> 机器可读条目：[commands.dsh-v1alpha1.json](commands.dsh-v1alpha1.json)

这条契约管"插件向宿主注册一个可执行动作"：用户在 palette、菜单、按钮或 TUI 里触发一个命令，插件的 handler 被执行。插件作者声明命令、绑定 handler 时读本条目；宿主维护者实现命令呈现与路由时也读本条目。

## 语义

**flat action leaf**：一个全局唯一的 command ID 对应一个已声明的 action 和一个归 activation 所有的 handler，完事。

- 命令元数据（ID、标题）的权威来源是 manifest `contributes`——宿主在插件运行前即可发现；插件代码只按已声明的 ID 绑定 handler（声明与绑定的一致性规则见 [spec/manifest.md](../../spec/manifest.md)，此处不复述）。
- 宿主可以把同一个 action 放进 palette、菜单、按钮或 TUI 命令行，但**不能改变它的身份**：同一个 ID 在任何入口触发的是同一个 handler。
- handler 的注册归 activation 所有：随 activation 创建、随 deactivate 释放，并记入 effect ledger（见 [spec/lifecycle.md](../../spec/lifecycle.md) §2.5–2.6）。

## 明确不包含什么

以下能力**都不在**本条契约内，归属见右列（依据：v0.15 §4.2）：

| 不包含 | 一句话原因 | 归属 |
| --- | --- | --- |
| 嵌套 command tree / subcommand / CLI 风格 option parser | Remote SSH 反例：子命令树会在 transport 半路丢失 | [RFC 0002](../../rfcs/0002-runtime-presentation.md) |
| 交互式 prompt（device code、确认请求等短期交互） | 短期交互消息需要独立的 presentation 通道 | [RFC 0002](../../rfcs/0002-runtime-presentation.md) |
| 流式输出 / 后台 command session | 依赖 Runtime / Presentation 分层契约 | [RFC 0002](../../rfcs/0002-runtime-presentation.md) |

## 用法示例

manifest 声明（字段布局为示意，以 [spec/manifest.md](../../spec/manifest.md) 与 Registry 定案为准）：

```json
{
  "contributes": {
    "commands": [
      { "id": "com.example.message-memory.show-last", "title": "Show Last Message" }
    ]
  }
}
```

activation 中发布 handler（SDK 形态为示意）：

```ts
export default defineFacet((activation) => {
  activation.extensions.publish(
    { apiVersion: 'commands.dsh/v1alpha1', kind: 'Command' },
    'com.example.message-memory.show-last',
    async () => {
      // 只做一件事，做完返回；没有交互式 prompt，没有流式输出
    },
  )
})
```

## 对应 v0.1 名字

`commands`（v0.1 平面能力名）。v0.15 起改用契约坐标 `commands.dsh/v1alpha1` + kind `Command`，版本随契约独立演进（见 [VERSIONING.md](../../VERSIONING.md)）。
