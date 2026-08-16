// v2 宿主推送逻辑端到端测试：加载 lib/index.js，stub ctx，向 mock 推送服务发真实 HTTP
import { readFileSync } from "node:fs";

const mod = await import("file:///Users/mac/workspace/projects/P009-dsh-attention-pack/lib/index.js");
if (typeof mod.apply !== "function") throw new Error("apply 缺失");

let capturedListener = null;
const fakeCtx = {
  effect: (fn) => fn(),
  jobs: {
    onJobDone: (listener) => { capturedListener = listener; return () => {}; }
  }
};

mod.apply(fakeCtx);
if (!capturedListener) throw new Error("onJobDone 未注册");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const now = Date.now();

// 1) 成功任务（exit 0）
capturedListener({ id: "j-ok", kind: "bash", label: "sleep 5", status: "completed", detail: "exit code: 0", startedAt: now - 5000, finishedAt: now });
// 2) 失败任务（exit 3）
capturedListener({ id: "j-fail", kind: "bash", label: "boom && exit 3", status: "completed", detail: "exit code: 3", startedAt: now - 3000, finishedAt: now });
// 3) 取消任务
capturedListener({ id: "j-kill", kind: "bash", label: "long job", status: "killed", detail: "signal: SIGTERM", startedAt: now - 9000, finishedAt: now });
// 4) 去重：重复同一 id 不应再推
capturedListener({ id: "j-ok", kind: "bash", label: "sleep 5", status: "completed", detail: "exit code: 0", startedAt: now - 5000, finishedAt: now });

await sleep(1500);

const pushes = readFileSync("/tmp/mock-push.log", "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
console.log(`mock 收到 ${pushes.length} 条推送（预期 6：3 个任务 × 2 通道，重复 id 不推）`);
for (const p of pushes) {
  const body = JSON.parse(p.body || "{}");
  console.log(`  ${p.method} ${p.url} | title=${body.title || "-"} | body=${(body.body || body.message || "").slice(0, 40)} | tags=${JSON.stringify(body.tags || p.headers.tags || "-")} priority=${body.priority || p.headers.priority || "-"}`);
}

const check = (name, cond) => { console.log((cond ? "PASS" : "FAIL") + "  " + name); return cond; };
const results = [
  check("成功任务推送 ✅ 标题", pushes.some((p) => (JSON.parse(p.body || "{}").title || "").includes("✅ 任务完成"))),
  check("失败任务推送 ❌ 标题 + exit code", pushes.some((p) => (JSON.parse(p.body || "{}").title || "").includes("❌ 任务失败") && ((JSON.parse(p.body || "{}").body || JSON.parse(p.body || "{}").message || "")).includes("exit code: 3"))),
  check("取消任务推送", pushes.some((p) => (JSON.parse(p.body || "{}").title || "").includes("已取消"))),
  check("ntfy 通道 JSON（title/tags/priority）", pushes.filter((p) => p.url.includes("dsh-attention-test")).length === 3 && pushes.some((p) => JSON.stringify(JSON.parse(p.body || "{}").tags || []).includes("x")) && pushes.some((p) => (JSON.parse(p.body || "{}").priority) === "high")),
  check("bark 通道 JSON 格式", pushes.filter((p) => (p.headers["content-type"] || "").includes("application/json") && p.url.includes("TESTKEY123")).length === 3),
  check("去重生效（j-ok 重复事件不推：总 6 条而非 8 条）", pushes.length === 6 && pushes.filter((p) => (JSON.parse(p.body || "{}").title || "").includes("sleep 5")).length === 2),
];
const pass = results.filter(Boolean).length;
console.log(`\n${pass}/${results.length} 通过`);
process.exit(pass === results.length ? 0 : 1);
