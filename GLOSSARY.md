# 术语表（Glossary）

> **状态：Draft v0.15（社区讨论稿，非官方标准）**

这份文件管什么：把标准里反复出现的黑话翻译成人话，给第一次接触本标准的新人当第一道门。谁该读：所有人——读任何一份 spec 或 RFC 之前，先在这里把词对上号。

用法说明：每条 2-3 句人话，末尾的链接才是**规范定义**所在；本表只做解释，不做规定。正文里与本文不一致时，以 spec/ 为准。

## 一个插件是怎么组成的（对象模型）

> **Component（组件）**：一个插件的"分发包"——就是你安装下来的那个包，包根目录里有一份 `dsh-plugin.json` 声明它是谁、需要什么。一个包对应一个组件。规范定义见 [spec/facet-model.md](spec/facet-model.md)。

> **Facet（分面）**：插件派驻到不同位置的"分身"。host 分身跑在宿主侧管逻辑，client 分身贴着界面管呈现，worker 分身在后台干重活；一个插件可以只有 host 分身。v0.15 只定义了 host 分身的完整规则，client / worker 只是保留的名字。规范定义见 [spec/facet-model.md](spec/facet-model.md)。

> **Activation（激活）**：宿主把插件的某个分身启动起来的"这一次"——从启动到停用，期间注册的所有资源都记在这次激活名下，停用时由它负责收拾。同一插件可以被激活多次（比如热重载），每次都算独立的一次激活。状态机见 [spec/lifecycle.md](spec/lifecycle.md)，对象模型中的位置见 [spec/facet-model.md](spec/facet-model.md)。

> **Participant（参与者）**：代表一次激活去和宿主"谈条件"的角色——"我需要什么、你能给什么"的协商以它为单位进行。v0.15 里一次激活恰好对应一个参与者。规范定义见 [spec/facet-model.md](spec/facet-model.md)。

> **Host product（宿主产品）**：装载并运行插件的那个具体产品，比如某个 GUI、Web UI、TUI 或启动器。它通过一份机器可读的自述文件告诉外界自己支持什么。规范定义见 [spec/host-descriptor.md](spec/host-descriptor.md)。

> **Host Descriptor（宿主自述）**：宿主产品发布的机器可读描述文件，写明自己支持的 API 版本、能力清单、执行环境和信任档位。插件装不装得上，先拿它和 manifest 静态比对。规范定义见 [spec/host-descriptor.md](spec/host-descriptor.md)。

## 代码在哪跑、界面在哪显示（架构分层）

> **Runtime / Presentation / Control / Transport / Invocation**：描述"一次插件调用"的五个独立维度——代码在哪执行、界面在哪显示、谁有权拍板、消息走哪条路、这一次调用本身。之所以拆成五个，是因为它们可以自由组合（代码在远端跑、界面在本地显示是常态），任何一个维度都证明不了另一个。规范定义见 [rfcs/0002-runtime-presentation.md](rfcs/0002-runtime-presentation.md)。

> **Adapter（适配器）**：整个体系里唯一允许接触 dsh 上游内部接口的一层。它把标准能力翻译成具体 dsh 版本能听懂的实现；上游变了只改它，插件无感。规范定义见 [rfcs/0001-core-contract.md](rfcs/0001-core-contract.md) 原则 ⑤。

> **Broker（能力经纪）**：宿主侧的"总管"：校验、协商、授权、生命周期调度都经过它，插件注册的每个 command、每个订阅都被它归属到具体某次激活名下。规范定义见 [spec/lifecycle.md](spec/lifecycle.md)。

> **runtime generation（运行时代际）**：宿主的一次"组队发车"——把协商通过的插件在同一批里一起激活。v0.15 没有"用到才启动"的按需激活，只有按代际整批激活。规范定义见 [spec/lifecycle.md](spec/lifecycle.md)。

## 名字与版本（契约）

> **capability / contract（能力 / 契约）**：一项宿主声明能提供、插件声明需要的标准化服务，比如注册命令或本地存储。每个契约都有带版本的名字（坐标），以 registry 里的条目为唯一权威——不能从文档正文里自行发明"等价"名字。规范定义见 [registry/README.md](registry/README.md)。

> **契约坐标（`apiVersion + kind`）**：一个契约的全名，形如 `commands.dsh/v1alpha1` + `Command`。前半截管版本线，后半截管"这是哪一类东西"。版本语义与 breaking 规则见 [VERSIONING.md](VERSIONING.md)。

## 信任与验证

> **trusted-in-process（进程内受信任）**：v0.15 唯一的执行档位——插件和宿主跑在同一进程里，技术上插件可以绕过标准接口直接调用系统能力。所以能力声明的作用是兼容判断、授权和审计，**不是安全沙箱**，宿主必须以显著方式向用户公示这一点。规范定义见 [rfcs/0001-core-contract.md](rfcs/0001-core-contract.md) 原则 ④。

> **effect ledger（效果台账）**：Broker 记的流水账——哪个插件的哪次激活创建、绑定、替换、释放了哪项资源，清理失败也记一笔。用来回答"这东西是谁干的、收拾干净没有"。最小记录字段见 [spec/lifecycle.md](spec/lifecycle.md)，完整版见 [rfcs/0004-provenance-diagnostics.md](rfcs/0004-provenance-diagnostics.md)。

> **conformance（一致性）**：一套"说到做到"的验证——宿主跑通一致性测试套件、插件通过校验、双方再拿出多宿主多插件的互操作证据。通过一致性只证明行为符合标准文本，**不代表"安全"，更不代表"官方认证"**。规范定义见 [spec/conformance.md](spec/conformance.md)。
