# PITFALLS.md — P009 dsh-attention-pack 踩坑日志

> 最新在上。agent 出错后自己追加，不用等老板说。

---

## 2026-08-16 · 宿主端（node half）代码改动必须重启应用才生效

**现象**：v2 推送写进 `lib/index.js` 后，宿主日志无任何输出、mock 推送无记录——客户端 bundle 是热加载的（页面刷新即新代码），**宿主 node half 是启动时加载的**。

**根因**：cordis loader 在启动时 import 插件 node 入口；改文件不重跑。

**防护**：改 `lib/index.js` → 必须重启 Harness.app（老板操作，会话持久不受影响）→ 用 `~/.dsh/attention-pack.push.log` 是否出现 "host push: loaded" 判断是否生效。客户端（`lib/client.js`）不受此限，刷新页面即可。

## 2026-08-16 · 【事故】宿主运行中改插件真实路径 → 插件包 404、页面报 "Failed to load plugins"

**现象**：项目改号 P007→P009（目录改名）后，刷新页面出现 `Failed to load plugins: bundle script /plugins/dsh-attention-pack/client.js failed to load`；同 rev/无 rev 全部 404，其他插件（mobile-sidebar-fix/jobs）正常 200。

**根因**：Harness 宿主启动时把插件 id 解析成**真实路径**（symlink 指向的 P007 目录）并缓存；目录改名后旧真实路径不存在 → 静态服务 404。manifest 仍列出插件（配置未变），所以表面"在"，实际"死"。

**防护（已落地）**：在旧路径放兼容符号链接 `~/workspace/projects/P007-dsh-attention-pack → P009-dsh-attention-pack`，宿主重启前保持存活（已验证 200 + 字节一致 + 页面恢复）。**宿主重启后即可删除该兼容链接**（重启会重新解析真实路径）。
**教训**：改插件真实路径 = 需要重启宿主；动手前先确认宿主是否在跑。

## 2026-08-16 · notifyOn 开关"设置了但没用"——系统通知永远关不掉

**现象**：🔔 按钮点了、localStorage 也写了，但系统通知照发。

**根因**：`notifyOn` state 只在按钮 UI 上被读取，从没传给 `useCompletionAlerts`——`systemNotify` 无条件调用。属于"state 写了没人读"的静默死代码。

**防护**：发布前通读全文，**逐个 state 交叉核对使用点**（写了→有没有人读）；这类 bug SSR 测试也抓不到（它只验证渲染）。已修复：notifyOn 传入 effect 并门控 systemNotify。

## 2026-08-16 · wire 语义：非零退出码的任务状态是 "completed" 不是 "failed"

**现象**：`exit 1` 的任务完成时插件闪了 ✓（成功色）。

**根因**：DSH 任务 wire 只在执行器契约违约（promise reject）时报 `failed`；非零退出码照常报 `completed`，退出码放在 detail（`exit code: 3`）里。

**防护**：插件加了 `jobFailed()`：解析 detail 的 `exit code: N`（N≠0）→ 按失败处理（✗ 闪烁/红色/失败音）；wire 原生 failed/killed 也归失败。README 如实说明。

## 2026-08-16 · 【血泪】isLive(prev) 传了状态字符串——转变检测永远不触发

**现象**：状态条/计时/标题计数全部正常，但"任务完成→提醒"永远不触发；SSR 自测 6/6 全过也没抓到。

**根因**：`seen` Map 里存的是**状态字符串**（如 `"running"`），检测时却调 `isLive(prev)`——它接收**任务对象**、内部访问 `job.status`；`"running".status` 是 `undefined` → 条件恒假。SSR 测试抓不到是因为 **effect 在 renderToString 里根本不执行**——渲染正确 ≠ 副作用正确。

**防护**：
1. 状态字符串判活直接用集合：`LIVE_STATUSES.has(prev)`；
2. **凡是 effect 里的逻辑，必须用真浏览器验证**——本项目的 CDP 验证法（headless Chrome + 埋点计数器 + 真实后台任务）已写成套路，见 `docs/` 或 OVERVIEW；
3. 埋点计数器（renders/effectRuns/transitions）证明"渲染在跑、effect 在跑、检测没触发"，是定位这类 bug 最快路径。

## 2026-08-16 · 完成闪烁后标题前缀有 2 秒空窗

**现象**：闪烁恢复后 "(n) 运行中" 前缀消失约 2 秒才回来。

**根因**：闪烁恢复定时器调 `refreshTitle()` 没传 live 计数，而计数只有 1 秒 tick 才重新写入。

**防护**：模块级 `lastLiveCount`，`refreshTitle` 记住最近一次计数，恢复时用它。

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
