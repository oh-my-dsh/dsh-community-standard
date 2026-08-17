# Spec: 元协议协商内核（Negotiation）

> **优先级：P0 ｜ 状态：骨架占位（待撰写）**
> 产出物：[`schemas/negotiation-report.schema.json`](../schemas/negotiation-report.schema.json)
> 写作提示：这份 spec 的读者一半是实现者、一半是 CI 工具作者，示例要给全三种结局（兼容 / 拒载 / 待授权）。

<!-- 固定结构：适用范围 → 规范性定义 → 示例 → 错误与边界情况 → fixtures 清单 → 变更记录 -->

## 写作提纲

- [ ] 纯函数签名：`manifest × Host Descriptor → 判定 + 报告`；领域无关，不依赖 dsh 就能测试（原则 ⑦）
- [ ] 内核只做三件事：解析参与者声明、解析 `apiVersion + kind` 契约引用、做 requires/supports 匹配
- [ ] required 能力缺失 → 装/激活之前明确拒载，**含人话报错要求**（"该插件需要图形界面能力，当前终端不支持"）
- [ ] optional 能力缺失 → 走插件声明过的降级路径
- [ ] 协商报告的机器可读格式（qing3a 的校验报告并入此格式）；宿主、市场、启动器、CI 消费同一份报告

## 关联

- manifest 字段语义：[manifest.md](manifest.md)；宿主声明语义：[host-descriptor.md](host-descriptor.md)
