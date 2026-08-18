# 宿主维护者指南（Host Maintainer Guide）

> **状态：Draft v0.15（社区讨论稿，非官方标准）｜ 本文非规范，与 spec/ 冲突时以 spec/ 为准**
>
> 本文的读者：GUI / Web UI / TUI / 启动器的维护者，想让自己的产品成为"标准兼容宿主"。全文是一份清单，按顺序做完即可。

## 成为兼容宿主的清单

- [ ] 1. 发布 Host Descriptor——机器可读的"我支持什么"
- [ ] 2. 实现协商，required 缺失时给人话拒载提示
- [ ] 3. 保证生命周期顺序
- [ ] 4. 接 conformance 套件，跑通 headless 场景
- [ ] 5. 履行 trustMode 公示义务

每条下面讲做什么、为什么、做到什么程度算完。规范性细节一律以 spec/ 为准，本文不复述。

## 1. 发布 Host Descriptor

Host Descriptor 是你的产品随版本发布的机器可读自述文件，市场、启动器和协商器都消费它。示例（坐标与 URL 为示意，以 Registry 定案为准）：

```json
{
  "descriptorVersion": "0.15",
  "id": "org.example.dsh-tui",
  "apiVersions": { "host": ["v1alpha1"] },
  "execution": {
    "environment": "node",
    "trustMode": "trusted-in-process"
  },
  "capabilities": [
    { "apiVersion": "commands.dsh/v1alpha1", "kind": "Command" },
    { "apiVersion": "storage.dsh/v1alpha1", "kind": "LocalStorage" },
    { "apiVersion": "messages.dsh/v1alpha1", "kind": "MessageObserver" }
  ],
  "platforms": ["darwin-arm64", "linux-x64", "win32-x64"]
}
```

只有一条硬规则，但它最重要：**只能声明你实际实现、且能保持语义的 [registry](../registry/README.md) 精确条目。** 上游 dsh 更新导致某条能力的观察点消失时，把它从 Descriptor 里下线——协商会自然地让依赖它的插件拒载或降级，这远比"声明了但语义已经偷偷变了"诚实。私有能力走 `x-org.*` 显式命名空间，不能伪装成标准条目。

逐字段定义见 [spec/host-descriptor.md](../spec/host-descriptor.md)，schema 见 [schemas/host-descriptor.schema.json](../schemas/host-descriptor.schema.json)。

## 2. 实现协商，拒载时给人话提示

协商是一个纯函数：插件 manifest × 你的 Host Descriptor → 判定 + 机器可读报告（格式见 [spec/negotiation.md](../spec/negotiation.md) 与 [schemas/negotiation-report.schema.json](../schemas/negotiation-report.schema.json)）。三种结局：**兼容**（激活）、**待授权**（敏感 scope 等用户/策略点头）、**拒载**（required 缺失）。

拒载这条路径是用户体验的关键，也是标准对宿主的明确要求：**报错必须是人话，并列出缺什么。**

反例（不及格）：

```text
Error: contract resolution failed: undefined
```

正例（及格）：

```text
未加载插件「Message Memory」(com.example.message-memory)：
它需要宿主提供「消息观察（messages.dsh/v1alpha1 MessageObserver）」能力，
当前终端尚未实现该能力。
你可以：① 升级终端版本；② 联系插件作者将该能力改为可选（optional）。
```

另外两条交互纪律：

- 不兼容插件在市场上**展示但禁用**，并列出缺少的能力——直接隐藏会让跨设备/跨 profile 的插件看起来凭空消失。
- optional 缺失时走**确定的降级**：对应 API 不存在，由插件自己的降级分支接管，你不能静默注入一个行为近似的替代品。

## 3. 保证生命周期顺序

两套状态机，权威定义见 [spec/lifecycle.md](../spec/lifecycle.md)：

- 宿主自身：`starting → ready → stopping → stopped`
- 每个插件 activation：`discover → validate → negotiate → authorize → activating → active → deactivating → disposed`

实现要点：

- **先协商授权，后执行代码。** discover / validate / negotiate / authorize 全部完成后，才能进入 activating。执行插件代码之前不做完校验和协商，是整个兼容体系的底线。
- **v0.15 是 generation-scoped eager activation，没有按需激活。** 宿主 ready 后组装一次 runtime generation，把已选中的插件全部激活；执行 command、匹配 subscription 都不能"叫醒"一个 inactive 插件。
- **正常关闭 best-effort deactivate；崩溃不保证送达。** 你要在正常关闭路径上有界地（带超时）调用每个 activation 的清理，但不要承诺崩溃场景——插件侧被要求把清理设计成幂等的。
- **HMR / profile 重组会重复激活。** 保持 ready 期间同一插件可能多次 activate/dispose，你的 Broker 归属与资源回收要按 activation instance 记，不能按插件记。
- **每项标准注册都要归属到具体插件 + activation**，维护最小 effect ledger（create / bind / replace / release / cleanup-failed），dispose 时做有界清理。字段见 [spec/lifecycle.md](../spec/lifecycle.md)。

## 4. 接 conformance 套件

"我兼容标准"这句话要靠测试背书，不能靠 README。做三件事：

1. 用 [conformance/fixtures/](../conformance/fixtures/README.md) 里的合法/非法样本过你的 manifest 校验与协商器；
2. 在 headless 环境跑 [conformance/suites/](../conformance/suites/README.md) 一致性套件——覆盖 required/optional 协商、未知版本、授权拒绝、activation 顺序、best-effort 关闭、标准回调异常等场景；
3. **发布测试环境与结果**：标准版本、宿主 ID/版本/平台、套件 commit、测试时间、结果。

表述边界（[spec/conformance.md](../spec/conformance.md)）：你只能声称"**本宿主通过 v0.15 Host conformance suite**"——不能说"安全宿主"，不能说"官方认证"。同理，市场五态（声明兼容 / 等待授权 / 已实测 / 不兼容 / 未知）之间不得互相升级：声明兼容不等于实测，更不等于安全审核。

## 5. trustMode 公示义务

v0.15 的参考执行档位是 **trusted-in-process**：插件作为**受信任代码**在你的进程里跑。capability 声明用于兼容判断、授权和审计，**它不构成安全沙箱**——阻止不了恶意插件直接 `import` Node API、`process.exit`、死循环。

所以标准对宿主有一条公示义务：**必须在用户可见的位置显著声明这一事实**，不能把 trusted-in-process 描述或暗示成"隔离""沙箱""安全执行"。诚实声明的参考写法：

> 本终端以 trusted-in-process 模式运行标准插件：插件是受信任代码，与终端同进程执行。能力声明用于兼容性判断与授权提示，不构成安全边界。请只安装你信任来源的插件。

未来的 isolated 档位（进程/realm 隔离、受控 IPC、资源限制）需要另行规定并拿出证据；没有这些证据，不得声称权限被强制执行。

## 案例：dsh-TUI 认领首个标准兼容宿主

[dsh-TUI](https://github.com/ccch1mneyyy/dsh-TUI) 已在 [community#23 评论 8](https://github.com/omdsh-dev/community/issues/23) 认领首个标准兼容宿主，其公开计划与本清单逐条对应：

- **严格 Manifest 校验**：彻底关闭旁路加载，只认静态声明；required 能力缺失（如插件要求图形能力）直接拦截并弹提示，不在运行时静默崩溃；optional 降级运行。
- **公开宿主能力清单**：随每个版本维护机器可读清单（明确支持的 `session.*`、`storage.local` 及 TUI 子集能力），私有能力统一打 `x-tui.` 前缀，方便市场和启动器静默过滤。
- **生命周期顺序落地**：TUI 渲染管线本身是事件驱动 + 差分终端输出，已在做第一套标准生命周期实现，保证激活到停用的触发顺序。
- **联动校验与溯源**：记录插件注册了什么、依赖了什么、修改了什么，支持排查、清理与回滚；构建/布局回归断言将接入社区验证工具 dsh-plugin-verify。

在评论 10 中，T-Auto 进一步表示 TUI 愿意做**第一批参考宿主**，跑完整套验证（Manifest 静态校验 → 能力协商 → 生命周期与事件顺序 → 具体调用时的呈现能力），并提议把 Remote Runtime 的 attach/detach 作为实际验证场景。如果你的产品也想成为早期兼容宿主，按上面五条清单做，然后到 [omdsh-dev/community](https://github.com/omdsh-dev/community) 认领互操作证据（两个宿主 × 三个插件是 v0.15 晋级的标准证据）。

## 关联

- [spec/host-descriptor.md](../spec/host-descriptor.md) —— Descriptor 逐字段权威定义
- [spec/negotiation.md](../spec/negotiation.md) —— 协商规则与拒载语义
- [spec/lifecycle.md](../spec/lifecycle.md) —— 状态机与 effect ledger
- [spec/conformance.md](../spec/conformance.md) —— 证据分类与表述边界
- [registry/](../registry/README.md) —— 可声明的契约条目
- [插件作者指南](plugin-author.md) —— 你的协商报告另一端长什么样
