# CLAUDE.md — P009 dsh-attention-pack

DSH（DeepSeek Harness）客户端插件项目：后台任务完成提醒 + 迷你任务条。

- 全部实现集中在 `lib/client.js`（浏览器端，无构建步骤）；`lib/index.js` 刻意为空。
- 数据接入走 slot + `useSessions`（见 OVERVIEW.md「数据接入」），JSX 不可用。
- 修改后刷新 GUI 页面生效（`~/.dsh/profiles/web` 下 patch 加载）。
- 测试：起一个真实后台任务看状态条/提醒；注意去重逻辑（见 PITFALLS）。
- 老板非工程师：沟通讲用途，别堆术语。
- 对外发布（GitHub/README）前先跟老板确认账号和仓库名；README 的收款码图等老板提供。
