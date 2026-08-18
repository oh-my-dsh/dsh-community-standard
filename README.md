# dsh-community-standard

> dsh 插件生态的社区互操作标准。
> **状态：社区 Draft v0.15 —— 这是社区讨论稿，不是 dsh 官方标准，也不自称官方标准。**
>
> 在线阅读：<https://rfc.dshfind.com>（由本仓库自动部署，PR 合并即更新）

## 这是什么

一句话：给 dsh 生态定一套**与 dsh 上游版本解耦**的插件标准——插件用一份静态 manifest 声明"我是谁、我需要什么能力"，宿主（GUI / Web UI / TUI / 启动器）先协商、再授权、再按统一的生命周期激活插件。

类比：**我们要做的是 Chrome 扩展那套（manifest + 权限声明 + 统一 API），而不是每家浏览器自己发明一遍插件机制。**

## 为什么需要它

dsh 生态已经有 3,800+ 个插件仓库，但底下有三条裂缝：

1. **插件靠 patch 活着。** 多数插件靠源码 patch、monkey patch、内部事件名实现功能，dsh 每更新一次，生态就批量炸一轮。
2. **装上才知道炸。** 现有 manifest 只有包名和 patch 列表，装之前没人能回答"这个插件能在 TUI 上跑吗"，唯一的"报错方式"是崩溃。
3. **谁后加载谁赢。** 多个插件改同一个行为时，实际仲裁者是加载顺序，出了问题回答不了"这是谁改的"。

这套标准的第一原则：**标准的存续不依赖 dsh 上游的任何决定。**

## 仓库里有什么

设计原则一句话：**rfcs/ 讲"为什么和决定过程"，spec/ 讲"是什么"，registry/ + schemas/ 是机器可读的权威来源，guides/ 讲人话，decisions/ 保证反馈链路可追溯。**

一个行为只有同时出现在 **spec + schema/registry + fixtures** 里才算契约（原则 ⑧：参考实现不是标准）。

```text
├── docs-plan.md        # 文档规划：有多少份文档、每份写什么、按什么顺序写（先读这个）
├── VERSIONING.md       # 六个版本维度、契约坐标、breaking change 规则
├── GLOSSARY.md         # 术语表（新人的第一道门）
├── rfcs/               # 提案与决策：0000 治理 / 0001 主契约 / 0002-0004 延期主题
├── spec/               # 规范正文：manifest、宿主自述、协商、生命周期、事件信封……
├── registry/           # 契约注册表（机器可读条目 + 人话说明）
├── schemas/            # JSON Schema（随 spec 产出）
├── conformance/        # fixtures 与一致性测试套件
├── guides/             # 人话指南：插件作者 / 宿主维护者 / 迁移
├── research/           # 调研快照（非规范）
└── decisions/          # 逐轮反馈处置记录
```

## 我该读哪份（按身份导航）

- **我只有五分钟** → 读 [rfcs/0001-core-contract.md](rfcs/0001-core-contract.md) 的 §0 和 §9
- **我是插件作者** → [guides/plugin-author.md](guides/plugin-author.md) → [spec/manifest.md](spec/manifest.md) → [registry/](registry/)
- **我是宿主 / 终端维护者** → [guides/host-maintainer.md](guides/host-maintainer.md) → [spec/host-descriptor.md](spec/host-descriptor.md) → [spec/negotiation.md](spec/negotiation.md)
- **我想参与标准制定** → [rfcs/0000-governance.md](rfcs/0000-governance.md) → [rfcs/template.md](rfcs/template.md) → `decisions/` 处置记录
- **我是 dsh 官方** → rfcs/0001 的 [§7 与 dsh 官方的关系](rfcs/0001-core-contract.md#_7-与-dsh-官方的关系)（我们不请求什么 / 请求什么 / 对官方的价值）和 [§9 本轮征求意见问题](rfcs/0001-core-contract.md#_9-本轮征求意见问题-五个)

## 当前状态

仓库已**全部成稿（社区 Draft v0.15）**：rfcs/、spec/、guides/、registry/、research/、decisions/ 均为完整 Draft；schemas/ 三份 JSON Schema 与 conformance/fixtures/ 已随 spec 落地，conformance/suites/ 一致性测试套件待 Phase 2 实现期产出。

首批共 23 份文档，分四个优先级（完整规划见 [docs-plan.md](docs-plan.md)）：

- **P0（8 份）**：v0.15 冻结前必须完成——缺一份，标准就没法被实现和验证
- **P1（7 份）**：v0.15 发布时应当就位
- **P2（4 份）**：延期主题的 Draft，从 fabric 仓库迁移
- **P3（4 份）**：调研与背景材料，直接迁移

## 参与方式

- **提意见 / 讨论**：到 [omdsh-dev/community](https://github.com/omdsh-dev/community) 开 issue 或参与讨论。新评论不会静默改写 Draft：变更先过审查，再更新 `decisions/` 处置记录。
- **认领写作**：按 [docs-plan.md](docs-plan.md) 第 7 节的顺序挑 P0/P1 文档，提 PR 即可。
- **三条写作纪律**（也贴在 PR 模板里）：
  1. **规范只写一遍**：同一条规则出现在两个文件里，第二处必须是链接。
  2. **"必须"必有 fixture**：写下一条"必须"之前，先想好违反它的 fixture 长什么样。
  3. **示意值标示意**：未定案的 URL、坐标、字段名统一标注"（示意，以 Registry 定案为准）"。

## License

MIT（见仓库根目录 `LICENSE` 文件）
