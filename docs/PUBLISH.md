# PUBLISH.md — 发布清单（老板确认后一次性执行）

> 目标：GitHub 公开仓库 `dsh-attention-pack`（MIT），README 带微信/支付宝咖啡码。
> 本文件是操作清单；执行前每步口头跟老板确认一次即可。

## 前置（老板提供）

- [ ] 确认 GitHub 账号（本机 git 身份是 `yuxiao0817`）与仓库名（默认 `dsh-attention-pack`）
- [ ] 微信收款码图 → `docs/qrcode-wechat.png`（同名覆盖占位图）
- [ ] 支付宝收款码图 → `docs/qrcode-alipay.png`（同名覆盖占位图）

## 发布步骤（老板说"发"之后）

```bash
cd ~/workspace/projects/P009-dsh-attention-pack
# 0. 最终自查（已全过：9 commits / SSR 6-6 / 真浏览器全链路 / 敏感扫描干净）
git status --short          # 必须为空
git log --oneline | head    # 核对提交

# 1. 创建 GitHub 仓库（gh 未装，先装：brew install gh && gh auth login）
gh repo create dsh-attention-pack --public --source=. --remote=origin --push

# 2. 本地 git 身份与 GitHub 一致（若 gh 登录账号 ≠ yuxiao0817 则改）
git config user.name "yuxiao0817"
git config user.email "yuxiao0817@gmail.com"

# 3. 推送
git push -u origin main
```

## 发布后

- [ ] 打开 GitHub 仓库页，亲眼核对：README 渲染（截图/二维码显示）、LICENSE、文件树
- [ ] 手机打开仓库页，扫码测试两张收款码是否可用
- [ ] 同步更新 `docs/README.md` 占位说明（标记已替换）
- [ ] （可选）在 deepseek-harness 上游提 issue：ask_user_question 多题卡片中断 bug（PITFALLS 有完整证据链）
- [ ] （可选）npm 发布 `dsh-attention-pack`（`npm publish`，需 npm 账号；README 安装段会简化成一条命令）

## 红线

- 发布是对外动作：老板明确说"发"才执行；发布后不可删除重来（会丢 star/收藏）
- 仓库里无任何密钥（已扫描）；收款码是个人收款用途，确认老板本人提供
