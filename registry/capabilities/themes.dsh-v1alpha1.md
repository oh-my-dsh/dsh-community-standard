# `themes.dsh/v1alpha1` — Theme

> **状态：Draft（社区讨论稿，非官方标准；坐标为示意，以 Registry 定案为准）。依据 [RFC 0005](../../rfcs/0005-declarative-views.md)，目标版本 v0.16。**
> 机器可读条目：[themes.dsh-v1alpha1.json](themes.dsh-v1alpha1.json)

这条契约管"插件给宿主换皮肤"：插件在 manifest 里写 `contributes.themes`，声明一组设计令牌覆盖，宿主应用后界面换主题。皮肤插件作者读本条目；宿主维护者实现主题激活、切换与卸载时也读本条目。

## 语义

**插件给令牌覆盖，宿主负责应用：**

- 主题元数据（ID、名称、令牌覆盖表）的权威来源是 manifest `contributes.themes`——宿主在插件运行前就能发现这些主题。
- 插件只覆盖**已登记**的设计令牌，只依赖**已登记**的 DOM 钩子。未登记的 `--dsw-*` 令牌和 `data-*` 属性，插件一概不碰——碰了就是私有 API，宿主可以拒载。
- 本契约只承诺令牌名和钩子名的稳定，不承诺宿主的 DOM 结构、类名和内部样式实现。

## 设计令牌两层

令牌分两层，插件主题通常只覆盖 alias 层：

- **`--dsw-static-*`（调色板层）**：具体色值，如 `--dsw-static-gray-500`。一般不直接出现在界面规则里，只被 alias 层引用。
- **`--dsw-alias-*`（语义别名层）**：界面语义，如 `--dsw-alias-bg-primary`、`--dsw-alias-text-primary`。界面规则引用别名，别名指向调色板。换主题 = 换别名指向。

初始令牌集见机器可读条目的 `designTokens` 字段（初始集，随条目版本演进）。新增令牌走本条目修订。

## 稳定 DOM 钩子

宿主为下列 `data-*` 属性提供稳定性承诺：钩子的名字和语义进了本条目，改名或删除走弃用窗口（窗口规则见 [VERSIONING.md](../../VERSIONING.md)），不许无声漂移。

| 钩子 | 语义 |
| --- | --- |
| `data-pane` | 标记宿主的主窗格区域，皮肤据此给不同窗格上色 |
| `data-composer-seat` | 标记输入框（composer）的承载位 |
| `data-composer-card` | 标记输入框卡片本体 |
| `data-conversation-scroll` | 标记对话滚动容器 |
| `data-chat-flow-kind` | 标记当前对话流类型，皮肤按类型做差异化 |
| `data-dsh-frame` | 标记宿主应用的最外层框架 |

## 互斥与可逆卸载

- **互斥**：宿主同时只激活一个皮肤主题。用户切换主题时，旧主题的令牌覆盖必须完整撤出，再应用新主题——不允许两个主题的覆盖残留叠加。
- **可逆卸载**：主题随插件 deactivate 完整卸载，界面回到无该主题的状态；不留令牌残留，不留注入的样式节点。

## 用法示例

manifest 声明（字段布局为示意，以 [spec/manifest.md](../../spec/manifest.md) 与 Registry 定案为准）：

```json
{
  "requires": {
    "contracts": [
      { "apiVersion": "themes.dsh/v1alpha1", "kind": "Theme" }
    ]
  },
  "contributes": {
    "themes": [
      {
        "id": "com.example.midnight",
        "name": "Midnight",
        "tokens": {
          "--dsw-alias-bg-primary": "var(--dsw-static-gray-900)",
          "--dsw-alias-text-primary": "var(--dsw-static-gray-50)"
        }
      }
    ]
  }
}
```

## 敏感级别

**低**（机器可读条目中 `sensitivity: low`）：主题声明是色值与别名的静态表，不含用户数据。

## 对应 v0.1 名字

无。本条为 v0.16 新增契约（[RFC 0005](../../rfcs/0005-declarative-views.md) 三期主题契约的落地条目），v0.1 没有对应的平面能力名。
