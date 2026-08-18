# `storage.dsh/v1alpha1` — LocalStorage

> **状态：Draft v0.15（社区讨论稿，非官方标准；坐标为示意，以 Registry 定案为准）**
> 机器可读条目：[storage.dsh-v1alpha1.json](storage.dsh-v1alpha1.json)

这条契约管"插件自己的键值持久化"：插件要存配置、缓存、上次运行状态时读本条目；宿主维护者实现按插件隔离的存储后端时也读本条目。

## 语义

**插件私有、由宿主管理的持久化存储**，按 **Component** 隔离：

- 每个插件只能读写自己的命名空间；命名空间边界由 Broker 强制到契约层（trusted-in-process 档位不构成安全沙箱，表述边界见 [spec/conformance.md](../../spec/conformance.md)）。
- 存储内容的生命周期挂在 **Component** 上，不随单次 activation 消失——插件更新、HMR、重复激活后数据仍在（activation 语义见 [spec/lifecycle.md](../../spec/lifecycle.md)）。
- 本契约是协商能力：插件在 manifest 中声明依赖，协商通过后由宿主注入；required 缺失拒载、optional 缺失降级的语义见 [spec/negotiation.md](../../spec/negotiation.md)，此处不复述。

## 明确不包含什么

| 不包含 | 一句话原因 | 归属 |
| --- | --- | --- |
| 跨插件共享存储 | 共享本质是插件间组合问题，需要先定义 provider cardinality、选择与冲突规则 | [RFC 0003](../../rfcs/0003-service-composition.md)（v0.15 §4.2） |

多 scope storage、Secret 能力同属延期主题，各有独立 RFC 后再议。

## 用法示例

manifest 声明依赖（字段布局为示意，以 [spec/manifest.md](../../spec/manifest.md) 与 Registry 定案为准）：

```json
{
  "requires": {
    "contracts": [
      { "apiVersion": "storage.dsh/v1alpha1", "kind": "LocalStorage" }
    ]
  }
}
```

activation 中使用协商后注入的能力（SDK 形态为示意）：

```ts
export default defineFacet(async (activation) => {
  const storage = activation.storage // 协商后注入的 LocalStorage

  await storage.set('lastMessageId', 'msg_55d1')
  const last = await storage.get('lastMessageId')
})
```

## 对应 v0.1 名字

`storage.local`（v0.1 平面能力名）。v0.15 起改用契约坐标 `storage.dsh/v1alpha1` + kind `LocalStorage`，版本随契约独立演进（见 [VERSIONING.md](../../VERSIONING.md)）。
