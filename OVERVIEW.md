# OVERVIEW.md — P007 dsh-attention-pack（注意力套装）

> 一句话：DSH 后台任务「干完了叫你」——完成提醒（系统通知 + 提示音 + 标题闪烁）+ 常驻迷你任务条。
> 2026-08-16 新建（本机 MBA 创建；worker 登记册同步见 PROJECTS.md 备注）

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
- [ ] 实测验收（真实后台任务）
- [ ] README 中英双语 + 截图 + 咖啡二维码（微信/支付宝，老板供图）
- [ ] 发布 GitHub（需确认账号/仓库名）
- [ ] 回查 ask_user_question 多题卡片中断 bug
