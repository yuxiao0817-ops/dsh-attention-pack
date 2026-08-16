# OVERVIEW.md — P009 dsh-attention-pack（注意力套装）

> 一句话：DSH 后台任务「干完了叫你」——完成提醒（系统通知 + 提示音 + 标题闪烁）+ 常驻迷你任务条。
> 2026-08-16 新建（本机 MBA 创建）。**编号史：最初领 P007，发现 worker 登记册 P007 已被「耳目」项目占用（本地旧副本误导），按 NAMING 规矩改号 P009 并在 worker 登记（commit 6c9b7a0）+ 同步。**

## 干什么

DSH Web GUI 的交互短板：长任务跑的时候用户不知道进行到哪，跑完了也没人叫。
本插件补齐「注意力管理」闭环：

1. **完成提醒**：后台任务从运行→结束（完成/失败/取消）时，系统通知（Web Notification）+ 双音提示音（Web Audio）+ 标签页标题闪烁（✓/✗ + 任务名）。iOS Safari 无 Notification API → 自动降级为页面内行高亮（状态条闪动）。
2. **迷你任务条**：有后台任务运行时常驻输入框上方（右下角浮层），显示 状态点/类型/任务名/状态摘要/计时，窄屏（≤760px）自动改为通栏。
3. 声音/通知/收起状态条均可点按钮开关，设置存 localStorage。

## 关键文件

- `lib/client.js` — 全部实现（浏览器端插件，无构建步骤，纯 JS + React.createElement）
- `lib/index.js` — node 半（刻意为空）
- `package.json` — DSH client 插件清单（`dsh.client` 字段）

## 数据接入（重要）

- 任务数据没有投影，只能走 React slot：`useSessions((s) => s.jobsBySession[sessionId])`（与官方 job-list 下拉同一数据源）。
- 任务 wire 模型：`{id, kind, label, status, startedAt, finishedAt?, detail?}`——**没有实时日志流**，迷你条展示 status/detail 摘要而非日志尾巴。
- 完成检测：组件内 ref Map 记 id→旧状态，渲染 diff 出 live→settled 转变才提醒；加载时已结束的任务静默记录，不误报。

## 怎么跑/验证

- 安装：`ln -s` 本目录到 `~/.dsh/profiles/web/node_modules/dsh-attention-pack` + `cordis.patch.yml` 加 insert 行（见 PITFALLS）。
- 刷新 GUI 页面 → 起一个后台任务（bash `run_in_background`）→ 状态条出现、计时走动 → 任务结束 → 标题闪烁/声音/系统通知。
- 验证要点：无任务时组件返回 null（不占 UI）；完成后不重复提醒。

## 待办

- [x] 插件本体（提醒 + 状态条）
- [x] 服务端装载验证（manifest + bundle 字节一致 + style tag；SSR 自测 6/6）
- [x] **真浏览器全链路验收**（headless Chrome + CDP 绑定真实会话 + 真实后台任务）：状态条渲染/计时跳动/标题计数前缀/完成转变检测/行高亮 3s/标题闪烁 6s 并干净恢复/去重不误报/失败红色提示/手机通栏/静音收起按钮——全部亲见；修了 isLive 类型错误、闪烁恢复空窗、notifyOn 未接线、改号 404 事故（见 PITFALLS）
- [x] README 中英双语 + 桌面/手机真实截图 + 收款码占位
- [x] **发布 GitHub（2026-08-16 完成）**：`https://github.com/yuxiao0817-ops/dsh-attention-pack`（PUBLIC，12 commits，页面渲染已验证）
- [ ] 老板肉眼复核（刷新 GUI 页面看状态条/提醒的交互手感；声音/系统通知需真机确认）
- [ ] 老板提供微信/支付宝收款码图 → `docs/` 同名覆盖 → push 一次即生效
- [x] 回查 ask_user_question 多题卡片中断 bug → 结论见 PITFALLS.md（会话重建导致 abort，触发源待复现）

## v2（手机锁屏推送，进行中）

- [x] 宿主端推送引擎（`lib/index.js`）：`ctx.jobs.onJobDone` 监听 → Bark/ntfy 双通道 → 失败识别同客户端语义 → 日志可观测 → 配置 `~/.dsh/attention-pack.push.json`
- [x] README v2 章节（设备覆盖表 + 配置 1 分钟指引）+ 配置模板 `docs/attention-pack.push.example.json`
- [ ] **实测验收**：需老板重启 DSH 应用（宿主 node half 启动时加载）→ 本地 mock 推送服务验证 payload（已完成：mock 服务 + 测试配置就位，等重启）
- [ ] 老板真机配置：iPhone 装 Bark / 安卓装 ntfy → 填 key → 真实推送验证
- [ ] 提交推送 GitHub
