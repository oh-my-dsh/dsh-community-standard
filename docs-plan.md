# dsh-community-standard 文档规划

> 本文回答三个问题：仓库里要有**多少份文档**、**每份写什么**、**按什么顺序写**。
> 定位：给正式草案仓库搭骨架用的写作指南，本身不是规范。

## 0. 总览

首批共 **23 份文档**，分四个优先级：

- **P0（8 份）**：v0.15 冻结前必须完成——缺一份，标准就没法被实现和验证
- **P1（7 份）**：v0.15 发布时应当就位——缺了标准能跑，但没人看得懂、没人来参与
- **P2（4 份）**：延期主题的 Draft——已有底稿，迁移过来挂上状态即可
- **P3（4 份）**：调研与背景材料——已有成稿，直接迁移

已有材料的复用率很高：fabric 仓库的 4 份 RFC、3 份调研、1 份处置记录都能直接搬，真正**从零写**的只有 P0 里的 spec/ 拆分稿和 registry 条目。

```text
dsh-community-standard/
├── README.md                      # 已完成（见仓库根目录）
├── docs-plan.md                   # 本文
├── LICENSE                        # MIT
├── GLOSSARY.md                    # P1
├── VERSIONING.md                  # P0
├── rfcs/
│   ├── template.md                # P1
│   ├── 0000-governance.md         # P0
│   ├── 0001-core-contract.md      # P0（v0.15 正文，即主 RFC）
│   ├── 0002-runtime-presentation.md   # P2（迁移）
│   ├── 0003-service-composition.md    # P2（迁移）
│   ├── 0004-provenance-diagnostics.md # P2（迁移）
│   ├── 0005-declarative-views.md  # 后规划期新增（2026-08-20 初稿）
│   └── 0006-host-services.md      # 后规划期新增（2026-08-20 初稿，宿主服务能力族）
├── spec/
│   ├── manifest.md                # P0
│   ├── host-descriptor.md         # P0
│   ├── negotiation.md             # P0
│   ├── lifecycle.md               # P0
│   ├── event-envelope.md          # P0
│   ├── facet-model.md             # P1
│   ├── conformance.md             # P1
│   ├── facet-api.md               # 后规划期新增（草案）
│   ├── views.md                   # 后规划期新增（RFC 0005）
│   └── themes.md                  # 后规划期新增（RFC 0005）
├── registry/
│   ├── README.md                  # P1
│   ├── capabilities/              # P0（2 条目）
│   └── events/                    # P0（1 条目）
├── schemas/                       # P0（3 个 JSON Schema，随 spec 产出）
├── conformance/
│   ├── fixtures/                  # 随 spec 产出
│   └── suites/                    # Phase 2 实现期产出
├── guides/
│   ├── hello-world.md             # P1
│   ├── plugin-author.md           # P1
│   ├── host-maintainer.md         # P1
│   └── migration.md               # P2
├── research/                      # P3（4 份，迁移）
└── decisions/                     # P3 起步（逐轮追加）
```

设计原则一句话：**rfcs/ 讲"为什么和决定过程"，spec/ 讲"是什么"，registry/ + schemas/ 是机器可读的权威来源，guides/ 讲人话，decisions/ 保证反馈链路可追溯。** 一个行为只有同时出现在 spec + schema/registry + fixtures 里才算契约（原则 ⑧）。

---

## 1. 根目录文档

### README.md — P0，已完成

仓库门面。是什么、为什么、状态声明（Draft、非官方）、四层架构图、按身份导航、参与方式。**不放规范细节**——细节一律链接到 spec/ 和 rfcs/，README 只负责让人 3 分钟内知道该去哪。

### VERSIONING.md — P0

整个标准最容易被搞混的地方，值得单独一份。写清楚：

- **六个版本维度**及各自含义：插件 `version` / `manifestVersion` / facet `apiVersion` / 各领域契约版本（随契约坐标独立演进）/ 宿主产品版本 / SDK 发布版本
- 契约坐标规则：`apiVersion + kind`（如 `commands.dsh/v1alpha1`），`v1alpha1` 的语义（实验期、可能 breaking、不伪装稳定 `1.x`）
- breaking change 规则、弃用窗口、`x-org.*` 私有命名空间规则、官方保留命名空间
- 来源：v0.15 §3.2 + §4.3

### GLOSSARY.md — P1

术语表，中英对照。至少收录：Component / Facet / Activation / Participant、Host product、Runtime / Presentation / Control / Transport / Invocation、Adapter、Broker、runtime generation、capability / contract、effect ledger、trusted-in-process、conformance。每条 2-3 句人话定义 + 指向定义它的 spec 章节。写作提示：这份文档是给新人的第一道门，禁止用术语解释术语。

---

## 2. rfcs/ —— 提案与决策

RFC 讲背景、动机、被拒绝的替代方案和决策过程；规范性细节下沉到 spec/。已 Accepted 的 RFC 不再修改正文，勘误走新 RFC。

### rfcs/template.md — P1

RFC 模板：元信息表（状态 / 目标版本 / 范围 / 依赖 / 讨论方式）、一句话摘要、背景、目标 / 非目标、设计、被拒绝的替代方案、开放问题、变更记录。规定状态机：Draft → Review → Accepted → Final，以及 Deprecated / Superseded / Withdrawn / Rejected。

### rfcs/0000-governance.md — P0（唯一还没有底稿的 RFC）

治理规则，标准合法性的来源。必答题：

- RFC 状态机与各状态的进入 / 退出条件
- 最短公开评审期（建议 14 天起）、决策方式（建议 lazy consensus + maintainer 合议兜底）、异议与申诉流程
- merge 权限：谁是 maintainer、如何增补退出、利益冲突回避（宿主维护者评审自家相关 RFC 时如何处理）
- capability / event 命名登记流程；官方保留命名空间的管理
- 安全问题的非公开披露渠道
- "社区标准"与"官方标准"的表述边界
- 参考实现与规范的关系（原则 ⑧ 的治理落地）

### rfcs/0001-core-contract.md — P0

主 RFC，即 v0.15 正文（人话版）迁移进来，做三处调整：① 规范性细节改为指向 spec/ 各文件（避免两处维护同一句话）；② §5 变更记录和附录 A 处置表移到 decisions/，此处留链接；③ 补一节"被拒绝的替代方案"（动态 manifest、平面能力名 vs 契约坐标、按需激活——每个写 3 句：是什么、为什么拒、什么条件下重新考虑）。

### rfcs/0002 / 0003 / 0004 — P2

从 fabric 仓库原样迁移，改三处：路径与交叉引用、元信息表加"迁移自"来源、状态统一为 Draft。内容不动——它们已经写得足够严谨，v0.15 阶段只需要"存在且可引用"。

- **0002**（Runtime / Presentation / Control / Transport / Invocation）：Remote SSH 反例、五概念分层、command tree、短期交互消息、`presentation.urlState`
- **0003**（Service Provider 与确定性组合）：五类声明、provider cardinality、组合计划、`provides` / `requires.services` 开闸的前置条件。**下一阶段最高优先级**，README 与 Phase 3 计划都要指到它
- **0004**（溯源、验证、诊断）：证据六分级、不可变 subject identity、安装影响报告、effect ledger 的完整版

---

## 3. spec/ —— 规范正文（P0 的主战场）

每份 spec 的固定结构：适用范围 → 规范性定义（必须 / 应该 / 可以）→ 示例 → 错误与边界情况 → 对应 fixtures 清单 → 变更记录。**每一条"必须"都要能回答"违反了会被哪个 fixture 或测试抓住"**——回答不了的，要么降级为"应该"，要么补 fixture。

### spec/manifest.md — P0

`dsh-plugin.json` 的完整定义。内容：文件位置与命名（含避让 `plugin.json` 的原因）、静态性要求（禁动态生成、禁网络取 schema）、`$schema` 必填与 canonical identifier 规则、逐字段定义（id 语法与命名空间所有权、facets、requires.contracts、permissions、contributes、subscriptions）、五类声明的语义边界（v0.15 拒绝 `provides` 和 `requires.services` 的规则写死在这里）、contributes id 全局唯一与静态冲突检测、与 npm metadata 重复字段的权威来源。产出物：`schemas/dsh-plugin.schema.json` + `conformance/fixtures/manifest/{valid,invalid}/`。

### spec/host-descriptor.md — P0

宿主自述文件。逐字段定义（descriptorVersion、id、apiVersions、execution.environment / trustMode、capabilities 精确条目、platforms）、"只能声明实际实现的 registry 精确条目"规则、trusted-in-process 的公示义务、市场五态（声明兼容 / 等待授权 / 已实测 / 不兼容 / 未知）及不得互相升级的规则。产出物：`schemas/host-descriptor.schema.json` + fixtures。

### spec/negotiation.md — P0

元协议协商内核。纯函数签名（manifest × Host Descriptor → 判定 + 报告）、requires/supports 匹配规则、required 缺失的拒载语义（含人话报错要求）、optional 缺失的降级语义、协商报告的机器可读格式（qing3a 的校验报告并入此格式）。产出物：`schemas/negotiation-report.schema.json`。写作提示：这份 spec 的读者一半是实现者一半是 CI 工具作者，示例要给全三种结局（兼容 / 拒载 / 待授权）。

### spec/lifecycle.md — P0

宿主状态机（starting → ready → stopping → stopped）与 activation 状态机（discover → validate → negotiate → authorize → activating → active → deactivating → disposed）分开写；generation-scoped eager activation（无按需激活及其理由）；正常关闭 best-effort deactivate、崩溃时不保证送达、插件清理必须可重复；HMR / profile 重组下的重复激活；Broker 归属与最小 effect ledger 的记录字段（create / bind / replace / release / cleanup-failed）。

### spec/event-envelope.md — P0

事件信封与 `messages.observe`。信封字段（envelopeVersion、eventType/Version、eventId、scopeType/Id/Sequence、correlationId、privacyClass、redactions、payloadSchema、不可变 payload）；payload 对齐 MCP `ContentBlock` 的精确字段边界——**这是 §9 征求意见第 3 问的落点，初稿标注"待社区反馈冻结"**；scope 内顺序保证与不隐含全局顺序；以及一条说明 `before-*` 不进 v0.15 的备注（只指向 0002 前置条件清单，不下定义）。

### spec/facet-model.md — P1

Component → Facet → Activation → Participant 四级模型的规范定义；v0.15 只规范 `host` facet 的完整契约（entry 位置、模块格式、执行环境）；`client` / `worker` 保留名及其归属（RFC 0002）；`defineFacet` 上下文的最小 API 面（extensions.publish、scope.add、协商后的能力注入）。dsh-codex 重构分支作为参考示例引用。

### spec/conformance.md — P1

四类证据的定义与表述边界：Schema validation / Host conformance / Plugin validation / Interop evidence（两宿主 × 三插件）；"通过 conformance"能说什么不能说什么（禁"安全插件"、禁"官方认证"）；测试环境记录要求（标准版本、宿主 ID / 版本 / 平台、套件 commit、时间、结果）。

---

## 4. registry/ —— 契约注册表（机器可读的权威来源）

### registry/README.md — P1

条目格式说明、坐标规则、登记与变更流程（指向 RFC 0000）、官方保留命名空间清单、`x-org.*` 私有扩展规则。

### 首批条目 — P0

每条 = 一个 JSON（机器可读：坐标、版本、状态、owning spec/RFC、schema identifier + 不可变 hash、敏感级别、生命周期 scope、弃用信息）+ 一个同名 .md（人话说明 + 用法示例）：

| 条目 | 内容要点 |
| --- | --- |
| `capabilities/commands.dsh-v1alpha1` | flat action leaf 语义；明确列出不包含的东西（command tree / prompt / 流式）及归属 |
| `capabilities/storage.dsh-v1alpha1` | 按 Component 隔离；不含跨插件共享（归 0003） |
| `events/messages.dsh-v1alpha1` | MessageObserver；信封见 spec/event-envelope.md；ContentBlock 对齐边界 |

---

## 5. guides/ —— 人话指南（非规范）

规范可以严肃，指南必须说人话。每份开头声明"本文非规范，冲突以 spec/ 为准"。

### guides/hello-world.md — P1

从零开始的示例教程：一个 Hello World 插件的六次生长（斜杠命令 → 存储 → 消息观察 → optional 降级 → 本地校验 → UI 预览）。每步只加一个能力，演示"声明什么才能用什么"的完整玩法；UI 示例明确标注为 RFC 0002 范围的假想语法。

### guides/plugin-author.md — P1

十分钟上手：写一份 manifest → 声明依赖 → `defineFacet` 写一个 command → 本地跑校验器 → 看协商报告。常见拒载报错对照表。重点讲清楚"为什么不能再 patch 了、标准路径分别对应你以前的哪种野路子"。

### guides/host-maintainer.md — P1

成为兼容宿主的清单：发布 Host Descriptor → 实现协商与拒载提示 → 生命周期顺序 → 接 conformance 套件 → trustMode 公示义务。dsh-TUI 作为首个认领案例引用。

### guides/migration.md — P2

现有插件（patch / 内部接口流派）迁移到标准的路径：识别 patch 点 → 映射到标准契约 → 补 manifest → 跑 validation。哪些野路子暂时没有标准对应物（诚实列出，指向对应延期 RFC），迁移期与 legacy 路径共存的边界。

---

## 6. research/ 与 decisions/ —— P3，迁移与持续追加

**research/**：四份成稿直接迁移——插件需求调研（12 样本）、成熟框架调研（Koishi / Chrome / VS Code）、VS Code 扩展模型调研、issue #23 逐条评论存档（community-issue-23-review）。加统一页眉："调研快照，非规范，不代表推荐"。

**decisions/**：反馈链路的存档。首批三份：`round-1-issue-23.md`（13 条处置，迁移现有记录）、`round-2-issue-24.md`（5 条处置，从 v0.15 §5 抽出）、`round-3-discussion-2714.md`（官方仓库 discussion 的后续反馈，待收集）。格式统一：意见（提出者、链接）/ 处置（已采纳 / 限定采纳 / 独立 RFC / Adapter 实验 / 不属可移植核心 / 已记录）/ 落点。规则写在文件头：新评论不静默改写 Draft，变更先过 RFC 审查再登记。

---

## 7. 写作顺序建议

```text
第一周   VERSIONING.md → spec/manifest.md（+schema+fixtures）→ spec/host-descriptor.md（+schema）
         └ 这三份定了，registry 首批条目和协商器就有了地基
第二周   spec/negotiation.md → spec/lifecycle.md → registry 首批 3 条目
第三周   spec/event-envelope.md（ContentBlock 边界标注"征求意见中"）→ rfcs/0000-governance.md
         └ 0000 建议单独找 2-3 人合写，治理文档一个人写容易带私货
随后     rfcs/0001 迁移改造 → P1 全部（facet-model / conformance / guides / GLOSSARY / registry README / template）
并行随时 P2 / P3 迁移（机械工作，谁有空谁做）
```

三条写作纪律，贴在每个 PR 模板里：

1. **规范只写一遍**：同一条规则出现在两个文件里，第二处必须是链接。
2. **"必须"必有 fixture**：写下一条"必须"之前，先想好违反它的 fixture 长什么样。
3. **示意值标示意**：所有未定案的 URL、坐标、字段名，统一加"（示意，以 Registry 定案为准）"，避免占位符被当成决定传播出去——`dsh-std.example` 这种占位 URL 已经在外面流传了一次。

---

## 8. 后规划期：真实插件审计与缺口清单（2026-08-20）

规划期结束后做了一次对照审计：把 9 个真实插件项目（tavern、web-ui 全家桶、travel、activity、neoforge、galgame-skin、live-stats、remote-web-ui、git-graph 等）的实现方式逐条拆开，对照现有文档看"照标准能不能写出来"。结论：**框架底座与 UI 层够用，宿主侧服务能力是空白**——越全栈的插件越在 hack。

| 缺口 | 谁在被迫 hack | 处置 |
| --- | --- | --- |
| 宿主服务能力族：HTTP 路由、宿主内 LLM 调用、systemPrompt 分段注入 | tavern（重度）、git-graph、aionui-panel、remote-web-ui | **RFC 0006** |
| 宿主侧后台任务与定时调度 | tavern 裸 `setInterval`；task-board 在浏览器标签页里跑 cron，关页即错过 | **RFC 0006** |
| 事件订阅过滤与增量同步 | activity 冷启动全量下载 157MB（99.4% 是 chunk 洪流），自建 digest 绕过 | **RFC 0006** |
| 插件私有文件目录与原子写 | tavern / travel / pet 三家三种写法，home 解析各抄一份 | **RFC 0006** |
| 侧边栏入口、中间列替换等 location | task-board 被逼 DOM 注入 + MutationObserver 自愈 | 后续 RFC（views 增补） |
| 皮肤系统：布局级重排、稳定 data 属性契约、试穿与互斥 | galgame-skin 靠 DOM 约定 + 外部脚本 | 后续 RFC（themes 增补） |
| 会话投影注册（插件注、第一方 UI 读） | live-stats 已验证该协作路径 | 后续 RFC |
| 运行期补丁治理（mixin 快照/恢复/冲突/降级） | neoforge 已造出完整语义 | 后续 RFC（先表态：禁止/收容/规范） |
| Node↔浏览器事件通道 | neoforge 只能轮询 relay | RFC 0002 合流时再议 |
| 发现层元数据（catalog、分类、风险标记） | dshfind、members-export 各自按自己口径识别插件 | 后续 RFC |

写作顺序即上表顺序：RFC 0006 先吸收前四行（它们共享同一个论证——**安全原语和样板代码应该下沉到宿主，而不是每个插件重造一遍**），其余缺口各自成 RFC，不在 0006 里摊大。

---

> **注记（2026-08）：本规划已全部完成**（各优先级文档成稿情况见 [README.md §当前状态](README.md)）；后续变更不再走本规划，一律走 RFC 流程（[rfcs/0000-governance.md](rfcs/0000-governance.md)）。
