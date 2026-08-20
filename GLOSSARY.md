# 术语表（Glossary）

> **状态：Draft v0.15（社区讨论稿，非官方标准）**

这份文件管什么：把标准里反复出现的黑话翻译成人话，给第一次接触本标准的新人当第一道门。谁该读：所有人——读任何一份 spec 或 RFC 之前，先在这里把词对上号。

用法说明：每条 2-3 句人话，末尾的链接才是**规范定义**所在；本表只做解释，不做规定。本文与 spec/ 不一致时，以 spec/ 为准。

## 两份自述文件（协商的原材料）

> **Manifest（插件清单，`dsh-plugin.json`）**：插件包根目录里的静态 JSON，插件的"身份证 + 需求清单"——我是谁、需要什么能力、往产品里贡献了什么。宿主和工具不运行插件代码就能读懂它。规范定义见 [spec/manifest.md](spec/manifest.md)。

> **Host Descriptor（宿主自述）**：宿主产品发布的机器可读描述文件，写明自己支持的 API 版本、能力清单、执行环境和信任档位。插件装不装得上，先拿它和 manifest 静态比对。规范定义见 [spec/host-descriptor.md](spec/host-descriptor.md)。

## 一个插件是怎么组成的（对象模型）

> **Component（组件）**：一个插件的"分发包"——就是你安装下来的那个包，包根目录里有一份 `dsh-plugin.json`。一个包对应一个组件。规范定义见 [spec/facet-model.md](spec/facet-model.md)。

> **Facet（分面）**：插件派驻到不同位置的"分身"。host 分身跑在宿主侧管逻辑，client 分身贴着界面管呈现，worker 分身在后台干重活；一个插件可以只有 host 分身。v0.15 只定义了 host 分身的完整规则，client / worker 只是保留的名字。规范定义见 [spec/facet-model.md](spec/facet-model.md)。

> **Activation（激活）**：宿主把插件的某个分身启动起来的"这一次"——从启动到停用，期间注册的所有资源都记在这次激活名下，停用时由它负责收拾。同一插件可以被激活多次（比如热重载），每次都算独立的一次激活。状态机见 [spec/lifecycle.md](spec/lifecycle.md)，对象模型中的位置见 [spec/facet-model.md](spec/facet-model.md)。

> **Participant（参与者）**：代表一次激活去和宿主"谈条件"的角色——"我需要什么、你能给什么"的协商以它为单位进行。v0.15 里一次激活恰好对应一个参与者。规范定义见 [spec/facet-model.md](spec/facet-model.md)。

> **Host product（宿主产品）**：装载并运行插件的那个具体产品，比如某个 GUI、Web UI、TUI 或启动器。它通过 Host Descriptor 告诉外界自己支持什么。规范定义见 [spec/host-descriptor.md](spec/host-descriptor.md)。

## 代码在哪跑、界面在哪显示（架构分层）

> **Runtime / Presentation / Control / Transport / Invocation**：描述"一次插件调用"的五个独立维度——代码在哪执行、界面在哪显示、谁有权拍板、消息走哪条路、这一次调用本身。之所以拆成五个，是因为它们可以自由组合（代码在远端跑、界面在本地显示是常态），任何一个维度都证明不了另一个。规范定义见 [rfcs/0002-runtime-presentation.md](rfcs/0002-runtime-presentation.md)。

> **Adapter（适配器）**：整个体系里唯一允许接触 dsh 上游内部接口的一层。它把标准能力翻译成具体 dsh 版本能听懂的实现；上游变了只改它，插件无感。规范定义见 [rfcs/0001-core-contract.md](rfcs/0001-core-contract.md) 原则 ⑤。

> **Broker（能力经纪）**：宿主侧的"总管"：校验、协商、授权、生命周期调度都经过它，插件注册的每个 command、每个订阅都被它归属到具体某次激活名下。规范定义见 [spec/lifecycle.md](spec/lifecycle.md)。

> **runtime generation（运行时代际）**：宿主的一次"组队发车"——一次启动、热重载或配置重组所确定的那一批插件，整批一起激活、整批一起拆除。规范定义见 [spec/lifecycle.md](spec/lifecycle.md)。

> **eager activation（立即激活）**：这一批组装好之后，选中的插件全部立刻激活，不等"第一次被用到"。v0.15 没有"用到才启动"的按需激活——按需激活的启动错误会拖到用户操作时才爆发，排障极难。规范定义见 [spec/lifecycle.md](spec/lifecycle.md) §2.2。

## 名字与版本（契约）

> **capability / contract（能力 / 契约）**：一项宿主声明能提供、插件声明需要的标准化服务，比如注册命令或本地存储。每个契约都有带版本的名字（坐标），以 registry 里的条目为唯一权威——不能从文档正文里自行发明"等价"名字。规范定义见 [registry/README.md](registry/README.md)。

> **契约坐标（`apiVersion + kind`）**：一个契约的全名，形如 `commands.dsh/v1alpha1` + `Command`。前半截管版本线，后半截管"这是哪一类东西"。版本语义与 breaking 规则见 [VERSIONING.md](VERSIONING.md)。

## 事件

> **envelope（事件信封）**：每个标准事件外面裹的一层固定格式元数据，像快递面单——不拆包裹（payload）就能知道这件事是什么类型、属于哪个会话、排第几号、有多敏感、被裁剪过什么。规范定义见 [spec/event-envelope.md](spec/event-envelope.md)。

> **scope（事件作用域）**：事件的归属范围，比如某个 session。顺序保证只在同一个 scope 内成立：同 scope 的事件按序号先后到达，跨 scope 的先后纯属巧合，不能当因果用。规范定义见 [spec/event-envelope.md](spec/event-envelope.md) §2.2。

## 信任与验证

> **trusted-in-process（进程内受信任）**：v0.15 唯一的执行档位——插件和宿主跑在同一进程里，技术上插件可以绕过标准接口直接调用系统能力。所以能力声明的作用是兼容判断、授权和审计，**不是安全沙箱**，宿主必须向用户显著公示这一点。规范定义见 [rfcs/0001-core-contract.md](rfcs/0001-core-contract.md) 原则 ④。

> **effect ledger（效果台账）**：Broker 记的流水账——哪个插件的哪次激活创建、绑定、替换、释放了哪项资源，清理失败也记一笔。只能往后追加，不能涂改，用来回答"这东西是谁干的、收拾干净没有"。最小记录字段见 [spec/lifecycle.md](spec/lifecycle.md)，完整版见 [rfcs/0004-provenance-diagnostics.md](rfcs/0004-provenance-diagnostics.md)。

> **fail closed（宁拒勿混）**：拿不准就拒绝，而不是猜一个"看起来能用"的结果。manifest 出现未知字段直接拒载、上游观察点消失时 Adapter 下线对应能力，都是这条原则的体现。出处见 [rfcs/0001-core-contract.md](rfcs/0001-core-contract.md) 原则 ⑤。

> **conformance（一致性）**：一套"说到做到"的验证——宿主跑通一致性测试套件、插件通过校验、再拿出多宿主多插件的互操作证据。通过一致性只证明行为符合标准文本，**不代表"安全"，更不代表"官方认证"**。规范定义见 [spec/conformance.md](spec/conformance.md)。

> **fixture（测试样本）**：一份固定的输入文件，配一个预期结果——合法样本必须通过，非法样本必须被以正确的理由拒绝（一个非法样本只埋一个错）。标准里每条"必须"都要有 fixture 能抓住违反者。存放约定见 [conformance/fixtures/README.md](conformance/fixtures/README.md)。

> **headless（无界面运行）**：不开任何图形或终端界面、纯程序化地跑测试。一致性套件要求 headless，是为了让 CI 和任何宿主环境都能自动验证，不依赖人点鼠标。约定见 [conformance/suites/README.md](conformance/suites/README.md)。
