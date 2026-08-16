# PITFALLS.md — P007 dsh-attention-pack 踩坑日志

> 最新在上。agent 出错后自己追加，不用等老板说。

---

## 2026-08-16 · 【DSH 上游 bug 调查】ask_user_question 多题卡片中途被 abort

**现象**：两题卡片，老板点完第一题选项（自动进第二题）、还没点第二题，整卡消失，工具报 `ASK_ABORTED: ask_user_question was aborted before the user answered`。

**调查结论（证据链）**：
1. 宿主 `dsh-user-questions` 只在 `request.signal.aborted` 时抛 ASK_ABORTED；signal = 工具执行信号（`dsh-tool-ask-user` 直接透传 `exec.signal`）。
2. `exec.signal` 由 agent loop 的 phase abort 触发（`dsh-agent-loop` cancel/teardown 路径）；GUI「停止」按钮是 cancel 的一个入口，但老板没点。
3. **关键时刻证据**：abort 发生的那一分钟（15:48:48），`~/.dsh/sessions/` 里新建了会话记录 `session-096c1caf` —— 提问挂起期间会话/运行时被重建，旧回合被 teardown → 提问被 abort。
4. 卡片自身代码无此 bug：单选点选项只 `choose()` + 自动 `setIndex+1`，不提交不取消（`dsh-client-ui-user-questions`）。

**未确认**：会话重建的触发源（GUI 新会话？运行时重启？）。**待办**：复现 = 提问卡片挂起时观察是否重建会话；建议作为 issue 反馈 deepseek-harness 上游（对外动作，先问老板）。

**防护（本插件无关但记录）**：给老板的提问一次只发一题，避免中途重建丢答案；长问题拆多个单题卡片。

---

## 2026-08-16 · jobs 没有投影，只能走 React slot

**现象**：想用纯 DOM（mobile-sidebar-fix 同款）订阅任务数据失败。

**根因**：仓库里只有 `faceOf("goal")` 和 `faceOf("permissions")` 两个投影；jobs 数据只存在于 sessions store（`jobsBySession[sessionId]`），官方 job-list 下拉是 React 组件用 `useSessions` hook 读的。纯 DOM 拿不到。

**防护**：本插件走 slot 注入 React 组件（`conversation.session.header.actions`），`inject: ["sessions","slots","locale"]`；JSX 不可用（无构建），用 `React.createElement` 手写。

## 2026-08-16 · 任务 wire 模型没有实时日志

**现象**：迷你条想显示"当前命令日志尾部"。

**根因**：任务只有 `detail`（短状态摘要），没有输出流字段；实时日志要另开通道（超出插件能力范围）。

**防护**：迷你条展示 status/detail + 计时；README 如实说明，不画饼。

## 2026-08-16 · 提醒去重：必须 diff 转变，不能见 settled 就提醒

**现象**：页面加载时若已有已结束任务，会误报"完成"。

**根因**：渲染时只看到当前状态，不知道它是不是刚结束。

**防护**：ref Map 记 id→旧状态；只有"上一帧 live → 本帧 settled"才触发提醒；首次见到的 settled 任务静默记录。

## 2026-08-16 · 音频自动播放策略

**现象**：AudioContext 未解锁时 `resume()` 不生效，提示音静默。

**根因**：浏览器 autoplay 策略要求用户手势后才能出声。

**防护**：首次 pointerdown 时惰性创建/解锁 AudioContext；失败静默（不 crash）。

## 2026-08-16 · iOS Safari 无 Web Notification

**现象**：手机端系统通知不出现。

**根因**：iOS Safari 网页不提供 Notification API（桌面 Safari 有）。

**防护**：降级为页面内行高亮闪烁 + 标题闪烁；README 说明手机端建议用「状态条常驻」体验。
