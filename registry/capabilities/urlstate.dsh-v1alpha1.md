# `urlstate.dsh/v1alpha1` — UrlState

> **状态：Draft（社区讨论稿，非官方标准；坐标为示意，以 Registry 定案为准）。依据 [RFC 0005](../../rfcs/0005-declarative-views.md)，目标版本 v0.16。**
> 机器可读条目：[urlstate.dsh-v1alpha1.json](urlstate.dsh-v1alpha1.json)

这条契约管"Web 端把视图状态存进 URL"：面板激活态、focused session 这类状态写进 URL query，刷新或分享链接后宿主从 URL 回填——哪怕宿主跑在随机端口上，书签照样能用。灵感来自 Grafana 的 URL 状态实践。插件作者要持久化视图状态时读本条目；宿主维护者实现 URL 序列化与回填时也读本条目。

## 语义

**插件声明字段，宿主管 URL 读写：**

- 插件不直接碰 `location` / `history`。读写给宿主注入的句柄，宿主决定字段怎么编进 query、什么时候回填。
- 状态的生命周期跟着 URL 走：刷新、前进后退、分享链接，都是同一份状态的回放。
- 本契约是协商能力：插件在 manifest 中声明依赖，协商通过后由宿主注入；required 缺失拒载、optional 缺失降级的语义见 [spec/negotiation.md](../../spec/negotiation.md)，此处不复述。

## 规则

- **字段白名单**：能存哪些字段由插件在 manifest 里声明，未声明的字段宿主拒绝写入。白名单即契约，改字段走 manifest 变更。
- **大小上限**：单插件序列化后的状态上限 **2 KB**。URL 不是数据库，存的是"恢复视图所需的最小状态"。
- **不得存 secret**：token、密钥、会话凭据一律不许进 URL。URL 会进浏览器历史、服务器日志、聊天分享——存 secret 等于公开。
- **正常降级**：TUI / headless 宿主没有 URL，不实现本契约属正常降级，不算不合规。插件应按 optional 依赖声明，或在拿到句柄失败时自行兜底。

## 用法示例

manifest 声明（字段布局为示意，以 [spec/manifest.md](../../spec/manifest.md) 与 Registry 定案为准）：

```json
{
  "requires": {
    "contracts": [
      { "apiVersion": "urlstate.dsh/v1alpha1", "kind": "UrlState", "optional": true }
    ]
  },
  "urlState": {
    "fields": ["panel", "focusedSession"]
  }
}
```

activation 中领取句柄读写状态（SDK 形态为示意）：

```ts
export default defineFacet(async (activation) => {
  const urlState = await activation.contracts.get({
    apiVersion: 'urlstate.dsh/v1alpha1',
    kind: 'UrlState',
  })
  if (!urlState) return // TUI / headless 宿主：正常降级

  await urlState.set('panel', 'details')
  const focused = await urlState.get('focusedSession')
})
```

## 敏感级别

**低**（机器可读条目中 `sensitivity: low`）：契约本身只搬运视图状态。但重申一次：**不得存 secret**——敏感性低不等于什么都能往里放。

## 对应 v0.1 名字

无。本条为 v0.16 新增契约（[RFC 0005](../../rfcs/0005-declarative-views.md) 三期 Web 端 urlState 的落地条目），v0.1 没有对应的平面能力名。
