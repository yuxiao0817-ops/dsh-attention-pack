/**
 * dsh-attention-pack — node half (v2: lock-screen push).
 *
 * The browser half (lib/client.js) alerts while the page is open. This half
 * runs inside the DSH host process and pushes a notification to your phone
 * through configurable channels when a background job settles — so you get
 * pinged even when the browser is closed or the phone is locked:
 *
 *   - bark  → https://api.day.app/<key>          (iOS, free app)
 *   - ntfy  → https://ntfy.sh/<topic>            (Android/iOS/web, free)
 *   - any channel may override `baseUrl` (self-hosted ntfy, local test mock)
 *
 * Configuration file: ~/.dsh/attention-pack.push.json
 * {
 *   "channels": [
 *     { "type": "bark", "key": "your-bark-key" },
 *     { "type": "ntfy", "topic": "dsh-attention" }
 *   ]
 * }
 * (remove the file, or set channels to [], to disable push entirely)
 *
 * Events: `ctx.jobs.onJobDone(snapshot, owner)` — fires for every job in the
 * global layer exactly once at settle (completed / failed / killed).
 * Exit-code failures are detected from `snapshot.detail` ("exit code: N"),
 * matching the browser half's semantics.
 */
import { homedir } from "node:os";
import { join } from "node:path";
import { readFileSync, appendFileSync } from "node:fs";

const CONFIG_PATH = process.env.DSH_ATTENTION_PUSH_CONFIG || join(homedir(), ".dsh", "attention-pack.push.json");
const LOG_PATH = process.env.DSH_ATTENTION_PUSH_LOG || join(homedir(), ".dsh", "attention-pack.push.log");

/** Read the push config; malformed or missing config = no channels. */
function loadConfig() {
	try {
		const raw = readFileSync(CONFIG_PATH, "utf8");
		const cfg = JSON.parse(raw);
		if (!cfg || !Array.isArray(cfg.channels)) return { channels: [] };
		return cfg;
	} catch {
		return { channels: [] };
	}
}

/** True when the settled job actually failed (wire "failed"/"killed", or a
 *  non-zero exit code reported in detail as "exit code: N"). */
function jobFailed(snapshot) {
	if (snapshot.status === "failed" || snapshot.status === "killed") return true;
	if (snapshot.status !== "completed" || typeof snapshot.detail !== "string") return false;
	const match = /exit code:\s*(-?\d+)/.exec(snapshot.detail);
	return match !== null && Number(match[1]) !== 0;
}

function shortLabel(label) {
	const text = String(label ?? "");
	return text.length > 40 ? text.slice(0, 37) + "…" : text;
}

/** POST one payload through one channel; resolves true on HTTP success. */
async function deliver(channel, payload) {
	if (channel.type === "bark") {
		const base = channel.baseUrl || "https://api.day.app";
		const key = encodeURIComponent(String(channel.key ?? ""));
		if (!key) return false;
		const res = await fetch(`${base}/${key}`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ title: payload.title, body: payload.body, group: "dsh" })
		});
		return res.ok;
	}
	if (channel.type === "ntfy") {
		const base = channel.baseUrl || "https://ntfy.sh";
		const topic = encodeURIComponent(String(channel.topic ?? ""));
		if (!topic) return false;
		const res = await fetch(`${base}/${topic}`, {
			method: "POST",
			headers: {
				"Title": payload.title,
				"Tags": payload.tags,
				"Priority": payload.priority
			},
			body: payload.body
		});
		return res.ok;
	}
	return false;
}

function log(line) {
	try {
		appendFileSync(LOG_PATH, `[${new Date().toISOString()}] ${line}\n`);
	} catch {
		/* logging must never break the host */
	}
}

/** Host plugin body: register the job-done listener and fan out pushes. */
function apply(ctx) {
	ctx.effect(() => {
		const config = loadConfig();
		const channels = config.channels || [];
		log(`host push: loaded, channels=[${channels.map((c) => c.type).join(",") || "none"}] config=${CONFIG_PATH}`);
		if (channels.length === 0) {
			log("host push: no channels configured — disabled (see README for setup)");
			return undefined;
		}
		const pushed = new Set();
		let dispose = () => {};
		try {
			dispose = ctx.jobs.onJobDone((snapshot) => {
				if (pushed.has(snapshot.id)) return;
				pushed.add(snapshot.id);
				const bad = jobFailed(snapshot);
				const label = shortLabel(snapshot.label);
				const title = snapshot.status === "killed"
					? `已取消：${label}`
					: bad ? `❌ 任务失败：${label}`
					: `✅ 任务完成：${label}`;
				const body = snapshot.detail || snapshot.status;
				log(`job done: id=${snapshot.id} status=${snapshot.status} label=${label} detail=${snapshot.detail ?? ""}`);
				for (const channel of channels) {
					deliver(channel, {
						title,
						body,
						tags: bad ? "x" : "white_check_mark",
						priority: bad ? "high" : "default"
					}).then((ok) => {
						log(`push: channel=${channel.type} ok=${ok} job=${snapshot.id}`);
					}).catch((error) => {
						log(`push: channel=${channel.type} error=${String(error)} job=${snapshot.id}`);
					});
				}
			});
		} catch (error) {
			log(`host push: jobs service unavailable — ${String(error)}`);
		}
		return () => {
			dispose();
			log("host push: disposed");
		};
	}, "attention-pack: lock-screen push");
}

export { apply };
