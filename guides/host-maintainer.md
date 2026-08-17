# 宿主维护者指南（Host Maintainer Guide）

> **优先级：P1 ｜ 状态：骨架占位（待撰写）**
> **本文非规范，冲突以 spec/ 为准。**

## 写作提纲

成为兼容宿主的清单：

- [ ] 发布 Host Descriptor（[spec/host-descriptor.md](../spec/host-descriptor.md)）——只能声明实际实现的 registry 精确条目
- [ ] 实现协商与拒载提示（[spec/negotiation.md](../spec/negotiation.md)）——required 缺失时给人话报错
- [ ] 按生命周期顺序激活与停用（[spec/lifecycle.md](../spec/lifecycle.md)）
- [ ] 接 conformance 套件，跑通 headless 场景（[spec/conformance.md](../spec/conformance.md)）
- [ ] trustMode 公示义务：trusted-in-process 不构成安全边界，必须显著告知用户
- [ ] 案例引用：[dsh-TUI](https://github.com/ccch1mneyyy/dsh-TUI) 已认领首个标准兼容宿主（Manifest 严格校验、协商拒载提示、生命周期顺序、机器可读能力清单，与溯源记录联动）
