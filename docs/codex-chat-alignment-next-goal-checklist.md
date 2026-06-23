# Codex Chat Alignment Next Goal Checklist

## Goal

在保留 `AI 员工可视化界面`、`办公室场景`、`work station` 的前提下，
把当前员工工作区对齐到 `Codex chat box / Codex workspace` 的交互模型，
并给 manager 一个能直接验收的 QA 清单。

这份文档回答四件事：

1. 下一轮开发必须补齐哪些能力。
2. 哪些现有能力已经可用，可以保留。
3. 哪些交互要继续向 Codex 对齐。
4. QA 必须怎样覆盖，才能满足“所有按钮可用、不报错”。

---

## Non-Negotiables

以下边界在下一轮 goal 里不能丢：

- 保留 `办公室主视图`，不能把产品退回成纯聊天页。
- 保留 `AI 员工可视化`，并继续支持 `创建 / 删除 / 进入工作区`。
- 保留 `work station` 概念，员工必须从工位进入独立工作区。
- 工作区内部继续向 `Codex` 对齐，而不是回到“你一句我一句”的普通聊天框。
- 所有顶部动作按钮、运行按钮、审批按钮、线程按钮都要可点击、可完成动作、不可静默报错。

---

## Current Product Shape

### A. 已经对齐到位的部分

- 工位进入后，已经不是旧 drawer，而是独立的 `AgentConversationWorkspace`。
- 工作区主结构已经是 `thread -> run -> entry/process`，不再只是 message list。
- Composer 已具备：
  - 多行输入
  - `Enter` 发送 / `Shift+Enter` 换行
  - 草稿保存
  - 附件添加 / 删除 / 预览恢复
- Context bar 已具备：
  - workspace
  - mode
  - profile
  - branch
  - model
  - approval
- Thread actions 已具备入口：
  - `Back to office`
  - `New thread`
  - `Rename`
  - `Archive / Restore`
  - `Remove`
- Manager 可见的 run 结构已经不是普通消息泡泡，而是：
  - summary
  - process
  - visible record
  - usage / files / commands

### B. 已经验证通过的链路

- 办公室 -> 空工位 -> 确认 -> 创建员工 -> 进入工作区 -> Run -> Remove -> 返回办公室
- 工作区附件链路：
  - 带图片附件发起 run
  - 线程内保留附件卡片
  - `Reuse brief / Restore brief` 后附件回到 composer
- 完成态 run 的 summary / process / evidence 展示

### C. 仍需加强的部分

- 线程动作按钮的端到端自动化验收还要补齐。
- 顶部按钮虽然都有实现，但还需要一个稳定的回归脚本证明：
  - 点了有效
  - 状态正确切换
  - 不产生 renderer error
- 当前自动化环境还存在 Electron 隐藏运行时挂起问题，属于 QA 基础设施问题，不是产品交互本身已经失败。

---

## Next Goal Scope

## 1. Conversation Model Alignment

下一轮要继续完成这些对齐项：

- 把所有“聊天语义”继续压缩成“工作区语义”。
- 所有主阅读路径固定成：
  - summary first
  - process second
  - evidence third
- 把 manager 看到的每一轮交互统一成：
  - brief
  - run
  - visible work
  - outcome
  - next brief
- 继续清理旧的 `message / timeline / totalMessages` 外露命名。

完成标准：

- manager 打开一个员工后，第一感觉是工作区，不是聊天面板。
- 一轮执行的核心对象是 `run`，不是一串消息泡泡。

## 2. Manager-Visible Process

下一轮需要把 manager 视角再收紧：

- process 文案改得更像“管理语义”，少一点工程内部语义。
- blocked / failed / waiting approval 的排序和展开优先级继续明确。
- run 完成后 summary 要始终在最前。
- `Continue in composer`、`Reuse brief`、`Retry` 的行为说明要稳定。

完成标准：

- manager 一眼能回答：
  - 它在做什么
  - 卡在哪
  - 改了什么
  - 下一步该怎么接

## 3. Workspace Controls

下一轮需要把上下文栏和线程动作做成真正稳定的产品能力：

- `New thread` 要确认不会丢上下文、不误带旧附件。
- `Rename` 要保证保存后 rail / header / 当前 thread 同步。
- `Archive / Restore` 要保证只读状态和恢复状态一致。
- `Back to office` 要保证回办公室后，原工位仍可重新进入。
- `Remove` 要保证删除员工后工位释放，办公室状态正确刷新。
- `workspace / mode / profile / branch / model / approval` 的持久化要统一。

完成标准：

- 所有顶部按钮都存在。
- 所有顶部按钮都能完成动作。
- 所有动作后 UI 状态与数据状态一致。

## 4. UI Boundary

下一轮 UI 只做“边界强化”，不做反向回退：

- 办公室继续保留星露谷风格。
- 工作区继续保留 Codex 风格。
- 不允许把像素风聊天框重新带回工作区主画布。
- 创建员工表单可以继续简化，但不能丢创建能力。

完成标准：

- 办公室和工作区是两套明确的视觉系统。
- 用户从办公室进入后，视觉上明确切到 Codex 工作区。

---

## QA Matrix

下一轮 goal 至少要覆盖以下 QA：

### P0 QA

- `办公室空工位 -> 创建员工 -> 打开工作区`
- `工作区 Run`
- `Remove -> 返回办公室 -> 工位释放`
- `附件发送 -> 线程保留 -> Reuse brief 恢复附件`
- `审批态显示`
- `completed run summary / process / evidence`

### P1 QA

- `Rename thread`
- `New thread`
- `Archive / Restore thread`
- `Back to office -> reopen same workstation`
- `workspace / branch / model / approval` 持久化

### P2 QA

- 所有可见按钮点击一轮：
  - 顶栏按钮
  - run 级按钮
  - approval 按钮
  - thread rail 展开收起按钮
  - process / record 展开收起按钮
- 收集 `uiErrors`
- 确认没有 renderer crash

---

## Button Inventory That Must Be Proven Usable

至少要验证这些按钮：

- `Back to office`
- `New thread`
- `Rename`
- `Save`
- `Archive`
- `Restore`
- `Remove`
- `Run`
- `Attach`
- `Continue in composer`
- `Reuse brief`
- `Retry`
- `Allow once`
- `Allow for project`
- `Deny`
- `Show / Hide`
- `View timeline / Open process`

---

## Recommended Next Development Order

1. 先修稳定 QA 基础设施，让 Electron 自动化重新稳定跑通。
2. 再把 thread controls 全部纳入自动化。
3. 然后补 manager-visible process 的文案和排序。
4. 最后再做剩余视觉打磨，而不是先做样式。

---

## Current Status Summary

- 产品方向已经切到正确轨道：`办公室保留，工作区 Codex 化`。
- 关键主链路已经做出来了，不需要回炉重做架构。
- 下一轮最重要的不是再造一个新 UI，而是：
  - 把现有工作区动作全部验证稳定
  - 把 manager 视角的可见过程再收紧
  - 把 QA 自动化补成真正能挡回归的基线
