# 迁移指南（Migration Guide）

> **状态：Draft v0.15（社区讨论稿，非官方标准）｜ 本文非规范，与 spec/ 冲突时以 spec/ 为准**
>
> 本文的读者：手头有一个**现有插件**——靠源码 patch、monkey patch、内部事件名、内部接口反射活着的那种——想迁到社区标准上。
>
> 素材来源：社区对 12 个开源插件的源码调研（[research/dsh-plugin-needs.md](../research/dsh-plugin-needs.md)，调研快照，非规范）。下面四步就是从这些真实插件的断点里总结出来的。

## 先对齐预期

迁移不是"把 patch 换个写法"。标准的交换条件是：

- **你交出**：对宿主内部实现的所有假设（内部函数、内部事件名、加载顺序）；
- **你得到**：dsh 上游更新不再批量炸你的插件；装上之前宿主就能判断兼容性；多个插件共存时不再"谁后加载谁赢"。

代价是有些野路子**暂时没有标准对应物**——本文 §3 诚实列出，别闷头迁到一半才发现核心功能落不了地。

## 第一步：识别 patch 点

把插件现在碰过的宿主内部接口全部列出来。调研里 12 个插件的耦合点集中在六类，对着查：

1. **patch / monkey patch**：改了宿主哪个文件、哪个函数？目的是"观察"还是"修改行为"？——这个区分决定第二步映射到哪。
2. **内部事件名**：硬编码订阅了哪些内部事件字符串（如各类 session / message event）？
3. **内部服务探测**：`ctx.get()`、结构探测、反射拿到哪些宿主内部服务在用？
4. **直接读写文件**：往宿主目录、工作区、profile 目录写了什么？（配置、缓存、导出产物）
5. **内部 UI / 命令注册**：patch UI 代码、调内部命令注册函数、往内部 slot 塞东西？
6. **自建通道**：自建 loopback HTTP/WS 路由、私有 RPC、DOM 观察（MutationObserver）、生成 CSS class？

一个诚实的清单示例（仿照调研里的真实插件）：

| 我的插件 | 碰了什么 | 目的 |
| --- | --- | --- |
| session-export 类 | 读内部 session event；Node fs 直接写工作区 | 观察 + 导出文件 |
| notify 类 | 监听内部事件名；自建 RPC 给设置页 | 观察 + 存设置 + 跨 face 通信 |
| sidebar 类 | patch UI slot；注册内部命令；私有 HTTP 路由 | 修改 UI + 注册命令 |

## 第二步：映射到标准契约

每个 patch 点查这张表。**左边是你现在的做法，右边是 v0.15 的标准路径；右边写"暂无"的，去 §3 看怎么办。**

| 现在的做法 | v0.15 标准路径 |
| --- | --- |
| 硬编码内部事件名做**只读观察** | `messages.dsh/v1alpha1`（MessageObserver）+ manifest `subscriptions`（事件信封见 [spec/event-envelope.md](../spec/event-envelope.md)） |
| `ctx.get()` / 反射探测内部服务 | manifest `requires.contracts` 静态声明，协商后由宿主注入；探测本身就是要消灭的东西 |
| 往宿主目录写配置 / 存状态 | `storage.dsh/v1alpha1`（LocalStorage），插件私有、宿主管理 |
| patch UI / 内部函数注册命令 | `commands.dsh/v1alpha1`（Command，flat action leaf）+ manifest `contributes.commands` 声明 |
| patch 宿主源码**修改行为**（拦截发送、改消息、改 settlement） | **暂无**——`before-*` 可修改事件延期，见 §3 |
| 注册搜索 / 模型 / 工具 provider，插件间互相调用 | **暂无**——`provides` 延期（RFC 0003），见 §3 |
| 自定义 UI 面板、富视图、slot、主题 | **暂无**——跨端声明式 UI 整体延期（RFC 0002），见 §3 |
| 自建 loopback HTTP/WS 做 Host↔Client 通信 | **暂无**——跨 face bridge 归 RFC 0002，见 §3 |
| 联网请求、读写任意文件、起子进程 / PTY | **暂无**——敏感能力各自需要独立 RFC，见 §3 |

契约坐标的权威来源是 [registry/](../registry/README.md)，每个条目有机器可读 JSON + 人话说明（如 [commands.dsh-v1alpha1](../registry/capabilities/commands.dsh-v1alpha1.md)）。**逐条核对语义再映射**——比如 v0.15 的 command 只是 flat action leaf，你原来的命令带子命令树的话，子命令部分落在 RFC 0002 的范围，不要硬塞进一个 handler 里自己解析。

## 第三步：补 manifest

给包根目录加 `dsh-plugin.json`，把第二步的映射落成声明。字段细节见 [spec/manifest.md](../spec/manifest.md) 和[插件作者指南](plugin-author.md) §1-§2，这里只给迁移视角的检查单：

- [ ] `$schema` 填了（必填，少了第一步校验就挂）
- [ ] `id` 换成反向域名；`contributes` 里的 id 全部带你的前缀（全局唯一，静态冲突检测）
- [ ] `requires.contracts` 覆盖**全部**运行时依赖——漏报的代价是运行期 API 不存在；把"没有也能凑合"的标 `optional` 并写降级分支
- [ ] `subscriptions` 与代码里实际订阅的事件一致
- [ ] `contributes.commands` 与代码里 publish 的 id 一一对应（声明未绑定、绑定未声明都会被报）
- [ ] **没有写** `provides` 和 `requires.services`——v0.15 的 schema 会直接拒绝这两个字段

## 第四步：跑 validation，看协商报告

```bash
# 示意：校验器 CLI 形态以各工具实现为准
npx dsh-plugin-verify ./dsh-plugin.json
```

跑两层验证：

1. **静态校验**：按 [schemas/dsh-plugin.schema.json](../schemas/dsh-plugin.schema.json) 过 manifest；再对着 [conformance/fixtures/](../conformance/fixtures/README.md) 里的非法样本自查。社区验证工具 dsh-plugin-verify 已声明会跟进标准 schema（[community#23 评论 7](https://github.com/omdsh-dev/community/issues/23)）。
2. **协商报告**：拿你的 manifest × 目标宿主的 Host Descriptor 跑协商（[spec/negotiation.md](../spec/negotiation.md)），重点看 required 缺失的拒载项——每一条都是你还没迁干净、或目标宿主暂时接不住的地方。

对照[插件作者指南 §6 的报错对照表](plugin-author.md#6-常见拒载报错对照表)修到没有拒载项为止。之后按插件 validation 的要求自测：重复 activate/dispose 后资源能释放、optional 缺失时降级路径真的走通、错误信息人看得懂（[spec/conformance.md](../spec/conformance.md)）。

## 3. 这些野路子暂时没有标准对应物（诚实清单）

迁移前逐条确认你的插件不依赖以下能力。依赖了，你就得选：等对应 RFC、只支持保留了 legacy 路径的宿主、或砍掉该功能。

| 野路子 | 状态 | 去向 |
| --- | --- | --- |
| 修改 / 拦截消息与行为（before-send 类可取消可修改事件） | 延期，未进 v0.15 | [RFC 0002](../rfcs/0002-runtime-presentation.md) 前置条件清单：多插件顺序、修改合并、cancel 语义、timeout、回滚、隐私裁剪全部要有答案才会开 |
| 插件间互相调用、注册 provider（搜索/模型/工具）、依赖"能力"而非具体插件 | 延期，v0.15 schema 直接拒绝 `provides` / `requires.services` | [RFC 0003](../rfcs/0003-service-composition.md)——下一阶段最高优先级，community#24 评论 2 也明确要求它保持高优先级 |
| 自定义 UI 面板 / 富视图 / 主题 / command tree / 交互式 prompt / 短期呈现通道（device code、二维码、确认请求） | 延期 | [RFC 0002](../rfcs/0002-runtime-presentation.md)（跨端声明式 UI 与 Runtime / Presentation 分层整体延期） |
| Host ↔ Client 跨 face 强类型 bridge（替代自建 loopback RPC） | 延期 | [RFC 0002](../rfcs/0002-runtime-presentation.md) |
| 联网（`net.*`）、读写文件系统（`fs.*`）、子进程 / PTY | 暂缓 | 敏感能力，各自需要独立 RFC，且要先有授权 UX 契约 |
| 安装影响预览、运行时溯源、"谁改了什么"排障 | 超出 v0.15 的最小 effect ledger | [RFC 0004](../rfcs/0004-provenance-diagnostics.md) |

这个清单不是"永远不做"，是"按 RFC 流程做"。如果你的插件卡在某一格，最有效的动作是去对应 RFC 的讨论里贴出你的真实用法——v0.15 的很多设计就是这么被社区反例推出来的。

## 4. 迁移期与 legacy 路径共存的边界

标准**不要求**宿主删除内置、legacy 或非标准插件路径。迁移期的边界是这样划的：

- **标准插件必须走标准入口**：manifest 静态声明 → 协商 → 授权 → 生命周期激活。标准范围内的同一件事只有这一条规范路径，不能为同一项标准能力发明旁路。
- **legacy / 内置扩展是宿主的产品边界**：它们不参与标准一致性声明，也不因标准出现而失效。宿主继续为它们负责，标准不背书、也不禁止。
- **不能骑墙**：宿主不能对无法等价映射的能力"偷偷用内部接口近似"然后宣称支持；插件不能一边拿标准契约、一边继续 patch 同一个行为。legacy 路径上的行为不算标准兼容。
- **一个包可以两条腿走路**：迁移期你的包可以同时携带旧入口（服务 legacy 宿主）和 `dsh-plugin.json`（服务标准宿主），两边独立演进；但对标准宿主，manifest 里声明的必须是完整的真实需求。

一句话：**标准管标准插件，legacy 管 legacy 插件，谁也不假装是谁。** 等 RFC 0002/0003/0004 逐一落地，§3 清单里的格子会逐个收编，legacy 存在的理由也随之减少。

## 关联

- [插件作者指南](plugin-author.md) —— 十分钟上手与报错对照表
- [spec/manifest.md](../spec/manifest.md) —— manifest 逐字段权威定义
- [spec/negotiation.md](../spec/negotiation.md) —— 协商与拒载语义
- [spec/conformance.md](../spec/conformance.md) —— 插件 validation 的证据要求
- [research/dsh-plugin-needs.md](../research/dsh-plugin-needs.md) —— 12 个真实插件的耦合点调研（本文的主要素材）
