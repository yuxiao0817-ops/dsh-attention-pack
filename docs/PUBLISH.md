# PUBLISH.md — 发布记录（2026-08-16 已完成）

> 目标达成：GitHub 公开仓库 `dsh-attention-pack`（MIT），README 带微信/支付宝咖啡码占位。
> **已发布**：https://github.com/yuxiao0817-ops/dsh-attention-pack（PUBLIC，main 分支，12 commits）

## 实际执行记录（2026-08-16）

1. 老板授权账号：**yuxiao0817-ops**（非 git 配置里的 yuxiao0817——以实际授权为准）
2. gh 2.97.0 手动安装至 `~/bin/gh`（本机无 brew）
3. `gh auth login --web`（设备码流程，老板浏览器授权）
4. `gh repo create dsh-attention-pack --public --source=. --remote=origin` ✓
5. remote 强制 HTTPS：`git remote set-url origin https://github.com/yuxiao0817-ops/dsh-attention-pack.git`
6. `git push -u origin main` ✓
7. 验收：headless Chrome 打开仓库页——README 渲染（注意力套装/请我喝杯咖啡/截图引用）、文件树（LICENSE/README/lib/docs/package.json）、visibility=PUBLIC，全部亲见

## 遗留（等老板，随时可做）

- [ ] 微信/支付宝收款码图 → `docs/qrcode-wechat.png`、`docs/qrcode-alipay.png` 同名覆盖 → `git push` 一次即上线
- [ ] 老板肉眼复核本地 GUI（刷新页面看状态条；声音/系统通知需真机确认）
- [ ] **宿主重启后删除兼容链接** `~/workspace/projects/P007-dsh-attention-pack`（改号事故的保活链接，见 PITFALLS）
- [ ] （可选）deepseek-harness 上游提 issue：ask_user_question 多题卡片中断 bug（PITFALLS 有证据链）
- [ ] （可选）npm 发布 `dsh-attention-pack`（README 安装段可简化成一条命令）

## 红线（仍然有效）

- 发布后删除重来会丢 star/收藏——不要删仓库
- 收款码是个人收款用途，务必老板本人提供
