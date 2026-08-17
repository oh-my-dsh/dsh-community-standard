# conformance/fixtures

> **状态：骨架占位**。fixtures 随各 spec 产出——**每一条 spec 里的"必须"都要能在这里找到抓住它的 fixture**（写作纪律第 2 条）。

## 规划结构

```text
fixtures/
├── manifest/          # 随 spec/manifest.md 产出
│   ├── valid/         # 合法 manifest 样本（每个覆盖一种典型形态）
│   └── invalid/       # 非法样本：一个文件只违反一条规则，文件名说明违反哪条
├── host-descriptor/   # 随 spec/host-descriptor.md 产出
└── negotiation/       # 随 spec/negotiation.md 产出：兼容 / 拒载 / 待授权三种结局
```

## 约定（待 spec 撰写时确认）

- 非法 fixture 命名：`invalid-<被违反的规则简称>.json`，一个文件只埋一个错
- 每个 fixture 配 `.expected.json` 或在 suites 里断言预期判定
