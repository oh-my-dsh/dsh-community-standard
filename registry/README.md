# Registry：契约注册表

> **优先级：P1 ｜ 状态：骨架占位（待撰写）**
> 本目录是契约的**机器可读权威来源**：不许从 RFC 正文自行发明"等价"名称，一切以这里的条目为准。

## 写作提纲

- [ ] 条目格式说明：每条 = 一个 JSON（机器可读）+ 一个同名 `.md`（人话说明 + 用法示例）
- [ ] JSON 字段：坐标（`apiVersion + kind`）、版本、状态、owning spec/RFC、schema identifier + 不可变 hash、敏感级别、生命周期 scope、弃用信息
- [ ] 坐标规则：`commands.dsh/v1alpha1` 形式（示意，以本 Registry 定案为准）；`v1alpha1` = 实验期、可能 breaking（详见 [VERSIONING.md](../VERSIONING.md)）
- [ ] 登记与变更流程：指向 [RFC 0000](../rfcs/0000-governance.md)
- [ ] 官方保留命名空间清单（未来官方能力可直接以一等身份入驻）
- [ ] `x-org.*` 私有扩展规则：组织命名空间下的实验性契约不进官方 Registry，但建议按同格式自管

## 当前条目

| 坐标（示意） | 类别 | 状态 |
| --- | --- | --- |
| [`commands.dsh/v1alpha1`](capabilities/commands.dsh-v1alpha1.md) | capability | Draft |
| [`storage.dsh/v1alpha1`](capabilities/storage.dsh-v1alpha1.md) | capability | Draft |
| [`messages.dsh/v1alpha1`](events/messages.dsh-v1alpha1.md) | event | Draft |
