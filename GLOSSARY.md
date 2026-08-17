# 术语表（Glossary）

> **优先级：P1 ｜ 状态：骨架占位（待撰写）**
> 这份文档是给新人的第一道门。**禁止用术语解释术语**——每条 2-3 句人话定义 + 指向定义它的 spec 章节。

## 待收录词条（中英对照）

| 术语 | 定义落点（撰写时补链接） |
| --- | --- |
| Component / 组件（分发包） | spec/facet-model.md |
| Facet / 分面 | spec/facet-model.md |
| Activation / 激活 | spec/lifecycle.md |
| Participant / 参与者 | spec/facet-model.md |
| Host product / 宿主产品 | spec/host-descriptor.md |
| Runtime / Presentation / Control / Transport / Invocation | rfcs/0002-runtime-presentation.md |
| Adapter / 适配器 | rfcs/0001-core-contract.md（原则 ⑤） |
| Broker / 能力经纪 | spec/lifecycle.md |
| runtime generation / 运行时代际 | spec/lifecycle.md |
| capability / contract / 能力契约 | registry/README.md |
| effect ledger / 效果台账 | spec/lifecycle.md（最小版）、rfcs/0004（完整版） |
| trusted-in-process / 进程内受信任 | rfcs/0001-core-contract.md（原则 ④） |
| conformance / 一致性 | spec/conformance.md |

## 示例格式

> **Facet（分面）**：插件派驻到不同位置的"分身"。host 分身跑在宿主侧管逻辑，client 分身贴着界面管呈现，worker 分身在后台干重活。一个插件可以只有 host 分身。规范定义见 spec/facet-model.md。
