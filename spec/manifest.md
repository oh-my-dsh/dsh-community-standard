# Spec: 插件 Manifest（`dsh-plugin.json`）

> **优先级：P0 ｜ 状态：骨架占位（待撰写）**
> 产出物：[`schemas/dsh-plugin.schema.json`](../schemas/dsh-plugin.schema.json) + `conformance/fixtures/manifest/{valid,invalid}/`

<!-- 每份 spec 的固定结构：适用范围 → 规范性定义（必须/应该/可以）→ 示例 → 错误与边界情况 → 对应 fixtures 清单 → 变更记录。
     每一条"必须"都要能回答"违反了会被哪个 fixture 或测试抓住"——回答不了的，要么降级为"应该"，要么补 fixture。 -->

## 写作提纲

- [ ] 文件位置与命名：包根目录静态 JSON；**特意不叫 `plugin.json`**（避让 [Agent Plugins Specification](https://agent-plugins.org/)，一个包可同时携带两份文件支持两套生态）
- [ ] 静态性要求：禁止运行代码生成；宿主加载时不从网络取 schema（原则 ①）
- [ ] `$schema` 必填与 canonical identifier 规则
- [ ] 逐字段定义：`id`（反向域名语法与命名空间所有权）、`facets`、`requires.contracts`、`permissions`、`contributes`、`subscriptions`
- [ ] 五类声明的语义边界；**v0.15 直接拒绝 `provides` 和 `requires.services`**（归 [RFC 0003](../rfcs/0003-service-composition.md)），规则写死在这里
- [ ] `contributes` id 全局唯一与跨插件静态冲突检测（装之前报"冲突，不能共存"，而不是加载时互相覆盖）
- [ ] 与 npm metadata 重复字段的权威来源

## 参考示例（v0.15 §3.4，撰写时校对后保留）

```json
{
  "$schema": "https://dsh-std.example/schemas/dsh-plugin/v0.15.json",
  "id": "com.example.better-sidebar",
  "name": "Better Sidebar",
  "version": "1.2.0",
  "manifestVersion": "0.15",
  "facets": {
    "host": { "entry": "dist/host.js", "apiVersion": "v1alpha1" }
  },
  "requires": {
    "contracts": [
      { "apiVersion": "storage.dsh/v1alpha1", "kind": "LocalStorage" },
      { "apiVersion": "messages.dsh/v1alpha1", "kind": "MessageObserver", "optional": true }
    ]
  },
  "permissions": [],
  "contributes": {
    "commands": [{ "id": "com.example.better-sidebar.toggle", "title": "Toggle Sidebar" }]
  },
  "subscriptions": ["messages.observe"]
}
```

（坐标与 URL 均为示意，以 Registry 定案为准。）
