# PHONE-SETUP.md — 手机锁屏推送配置手册（1 分钟）

> v2 功能：任务完成/失败时，DSH 宿主直接推送到手机——页面关着、锁屏都能收到。
> 任选一个通道即可（可以两个都配）。

## 方案 A：iPhone 用 Bark（推荐）

1. App Store 搜索 **Bark**，安装并打开；
2. 打开后 App 首页就显示你的专属 Key（`https://api.day.app/xxxxx` 里的 `xxxxx`）；
3. 把 Key 填进配置文件：
   ```bash
   cat > ~/.dsh/attention-pack.push.json <<'EOF'
   {
     "channels": [
       { "type": "bark", "key": "你的BarkKey" }
     ]
   }
   EOF
   ```
4. 重启 DSH 应用，随便跑个任务验证。

## 方案 B：安卓 / 任意手机用 ntfy

1. 应用商店装 **ntfy**（开源免费），或直接用浏览器打开 https://ntfy.sh ；
2. 主题（topic）随便起名（越随机越私密），比如 `dsh-attention-pack-8f3k2q`；
3. 填进配置文件：
   ```bash
   cat > ~/.dsh/attention-pack.push.json <<'EOF'
   {
     "channels": [
       { "type": "ntfy", "topic": "你的主题" }
     ]
   }
   EOF
   ```
4. **手机 ntfy App 里订阅同一个主题**（点 + 号，输入主题名）；
5. 重启 DSH 应用，跑个任务验证——锁屏也会弹。

## 两个都配（示例）

```json
{
  "channels": [
    { "type": "bark", "key": "BarkKey" },
    { "type": "ntfy", "topic": "dsh-attention-pack-xxxx" }
  ]
}
```

## 验证/排错

- 推送日志：`tail -f ~/.dsh/attention-pack.push.log`（每条推送有 ok=true/false）
- 没收到？① 检查配置文件 JSON 格式；② 确认重启过 DSH；③ 看日志里 push ok 是不是 true；④ 手机 App 通知权限是否开启
- 取消推送：删掉配置文件即可
- 想自托管 ntfy / 本地测试：通道加 `"baseUrl": "https://你的域名"` 覆盖默认服务器
