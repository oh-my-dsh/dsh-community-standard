# Spec: Host Descriptor（宿主自述文件）

> **优先级：P0 ｜ 状态：骨架占位（待撰写）**
> 产出物：[`schemas/host-descriptor.schema.json`](../schemas/host-descriptor.schema.json) + fixtures

<!-- 固定结构：适用范围 → 规范性定义 → 示例 → 错误与边界情况 → fixtures 清单 → 变更记录 -->

## 写作提纲

- [ ] 逐字段定义：`descriptorVersion`、`id`、`apiVersions`、`execution.environment` / `trustMode`、`capabilities`（精确条目）、`platforms`
- [ ] **"只能声明实际实现的 registry 精确条目"规则**——不许声明"大概支持"
- [ ] trusted-in-process 的公示义务：插件与宿主同进程，capability 声明服务于兼容判断、用户授权和事后审计，**不构成安全边界**；宿主必须显著公示，不许把"声明过了"包装成"被拦住了"（原则 ④）
- [ ] 市场五态及**不得互相升级**的规则：声明兼容 / 等待授权 / 已实测 / 不兼容 / 未知——"声明兼容"永远不等于"已实测"，更不等于"安全"（原则 ③）

## 关联

- 协商规则见 [negotiation.md](negotiation.md)；契约条目权威来源见 [registry/](../registry/README.md)
