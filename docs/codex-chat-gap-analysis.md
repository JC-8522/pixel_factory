# Codex Chat Box 对齐清单

## 目标

把 `pixel_factory` 里的员工会话区，从“你一句我一句的聊天窗口”升级成“独立的 Codex 式会话工作台”。

这份文档只回答三件事：

1. 需要支持哪些功能，才算具备 Codex 对话框级别的能力。
2. 需要改成什么交互模式，才能让 manager 看见员工的工作过程。
3. 需要替换哪些 UI 元素，才能把当前星露谷物语式聊天框切成 Codex 风格。

---

## 当前代码状态

基于当前仓库代码，而不是旧截图，现状可以分成三类：

### 已经具备

- 会话区已经不再依赖旧 `AgentDetailDrawer`，而是独立的 `AgentConversationWorkspace`。
- 数据已经具备 `thread -> run -> entry/process` 聚合模型。
- composer 已支持：
  - 多行输入
  - 自增高
  - `Enter` 发送 / `Shift+Enter` 换行
  - 附件拖拽、粘贴、选择、删除
  - 草稿保存
- context bar 已支持：
  - workspace
  - mode
  - branch
  - model/profile
  - approval
- run 卡片已支持：
  - summary
  - process
  - evidence
  - inline approval
  - retry / continue / reuse brief
- thread 已支持：
  - 新建
  - 切换
  - 重命名
  - 归档
  - 恢复

### 已经接近，但还没完全收口

- 主视觉和布局已经明显偏向 Codex 风格，但仍有部分旧聊天心智残留。
- manager 可见过程流已经存在，但部分文案和事件组织仍偏工程日志，而不是管理视角。
- 外部读模型已经大多切到 `entries / process / totalEntries`，但部分验证脚本和旧兼容层刚开始清理。

### 仍然缺失或需要继续加强

- Goal / Voice 目前还是占位入口，不是真能力。
- 需要更稳定的 active run 自动聚焦与高优先级展开规则。
- 需要更统一的 manager summary 文案规范。
- 需要继续减少会话主舞台里的“chat / message”旧语义。
- 需要更完整的当前 UI 自动截图与验收链路，方便 manager 直接看效果。

---

## 1. 功能对齐清单

### 1.1 会话与运行模型

必须具备的能力：

- 独立会话工作台，而不是附属 drawer/panel。
- 一个连续 thread，承载多次 run。
- 每次 brief 启动一个 run，而不是简单“发消息 -> 回消息”。
- run 内有三层阅读结构：
  - summary
  - process
  - evidence
- thread 支持：
  - 新建 thread
  - 切换 thread
  - 重命名 thread
  - 归档 / 恢复 thread
- run 支持：
  - active run 聚焦
  - blocked run 提前
  - failed run 恢复动作
  - history run 回看

当前状态：

- 已基本具备，剩余工作主要是继续清理旧兼容语义和验证链路。

### 1.2 Composer 能力

必须具备的能力：

- 单一大 composer，作为任务主入口。
- 多行输入、自增高。
- `Enter` 发送，`Shift+Enter` 换行。
- 发送中禁用。
- 草稿自动保存。
- 空状态是“先输入 brief 再运行”的入口，而不是大空白聊天板。
- 支持附件：
  - 拖拽
  - 粘贴
  - 文件选择
  - 缩略图/卡片预览
  - 删除
- 预留但不强暴露：
  - Goal 位
  - Voice 位

当前状态：

- 基本已具备。
- Goal / Voice 仍是占位，需要后续决定是真接入还是先弱化。

### 1.3 Context Bar 能力

必须具备的能力：

- workspace 选择器
- mode 选择器
- branch 选择器
- model/profile 选择器
- approval 策略入口
- root path 展示

当前状态：

- 已具备。
- 后续主要是交互细节和命名统一。

### 1.4 Manager 可见过程流

这里展示的不是私有 CoT，而是 manager 可见工作过程。

必须具备的能力：

- thinking
- reading files
- running command
- editing files
- waiting user input / waiting approval
- error
- token / cost / duration
- changed files
- reviewed files
- command summary

必须具备的呈现结构：

- 默认先看 summary
- 需要时展开 process
- transcript/evidence 作为证据层，不抢主舞台
- 审批请求做 inline card
- run 结束后给 summary

当前状态：

- 大部分已经具备。
- 还需要继续把事件文案和排序规则调成 manager 语言。

### 1.5 数据模型与读模型

必须具备的模型：

- thread
- run
- entry block
- process timeline item
- attachment metadata
- composer context persistence
- run summary aggregation

当前状态：

- 已经具备。
- 本轮又进一步把外露读模型从 `messages/timeline/totalMessages` 收口到 `entries/process/totalEntries`。

---

## 2. 交互模式改造清单

## 2.1 必须切换的心智

当前错误心智：

1. manager 打开员工聊天框
2. 发一条消息
3. 等员工回一条消息

目标心智：

1. manager 写一条 brief
2. 系统启动一轮 run
3. 页面展示 run 的可见工作过程
4. 页面优先展示结果、阻塞、风险
5. manager 在同一 thread 中继续下一轮 brief

也就是：

`brief -> run -> outcome -> next brief`

## 2.2 manager 应该看到什么“思考过程”

不能展示：

- 私有 chain-of-thought 原文

可以展示：

- 正在读哪些文件
- 执行了哪些命令
- 修改了哪些文件
- 当前卡在什么审批
- 遇到了什么错误
- 本轮 run 的结果是什么
- 下一步建议是什么

## 2.3 必须补齐的产品规则

- 所有 runtime event 都要映射成统一 process item。
- 默认阅读顺序固定为：
  - summary
  - process
  - evidence
- active run 自动聚焦。
- waiting approval 为最高优先级阻塞态。
- failed run 默认展开错误摘要和恢复动作。
- run / thread 排序按以下优先级：
  - blocked
  - failed
  - live
  - recent
- 继续下一轮时，要明确是：
  - 同 thread 继续
  - 新开 thread
  - 恢复 archived thread

## 2.4 manager 验收时需要看到的对比点

- 现在是不是“工作台”，而不是“聊天窗”。
- 现在是不是以 run 为中心，而不是以消息气泡为中心。
- manager 能不能一眼看到：
  - 当前在做什么
  - 卡在哪里
  - 改了什么
  - 下一步该怎么处理

---

## 3. UI 改造清单

### 3.1 必须去掉的旧元素

- 米黄色大底板
- 厚像素边框
- 大头像头图
- `AI EMPLOYEE CONVERSATION` 这类大横幅
- 强气泡聊天样式
- “Start a conversation...” 式大空白聊天板
- 聊天区继续混用像素风和工作台风

### 3.2 必须替换成的 Codex 风格元素

- 浅色 / 中性背景
- 大圆角 composer
- 轻边框
- 弱阴影
- 系统感排版
- 上下文条收纳在 composer 下方
- 内容块以 run summary / process / evidence 为主
- 消息仅作为 evidence，不再是主舞台

### 3.3 布局层级建议

建议固定成：

1. 顶部最轻的 thread 身份信息
2. thread rail / run rail
3. 当前 run 主内容区
4. 底部 composer
5. composer 下方 context bar

### 3.4 视觉边界原则

- 办公室主场景可以保留星露谷风格。
- 聊天工作台必须切出独立视觉系统。
- 不要再让办公室视觉 token 污染会话工作台。

---

## 建议拆成 4 个开发 Goal

### Goal A: Chat information architecture

说明：

- 收口 thread / run / entry / process 读模型
- 清理旧 message/timeline 兼容语义
- 让前端彻底按工作台模型消费数据

### Goal B: Manager-visible process stream

说明：

- runtime event -> process item
- inline approval
- blocked / failed / recovery 规则
- run summary 聚合

### Goal C: Codex-style composer and context bar

说明：

- 附件能力
- workspace / mode / branch / model / approval
- 发送规则
- 草稿与上下文持久化

### Goal D: Replace Stardew chat UI with Codex visual system

说明：

- 彻底切掉聊天区像素风
- 改成中性工作台视觉
- 只保留办公室主场景的星露谷风格

---

## 当前建议的优先级

### P0

- 继续清理旧 `message/timeline` 外露语义
- 固定 summary-first 阅读顺序
- 强化 blocked / failed / live 的自动聚焦和展开
- 把验证脚本和截图链路切到新工作台

### P1

- 收口 manager summary 文案规范
- 优化 thread rail / run rail 扫描性
- 补 attention 标记和更稳定的恢复动作区

### P2

- Goal / Voice 真能力接入
- 更完整的 thread 继承与恢复提示
- 更高级的自动验收与截图对比
