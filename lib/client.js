window.__ModuleLoader__.load({
	id: "dsh-attention-pack",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		//#region deps
		const React = require("react");
		const { createElement: h, useEffect, useRef, useState } = React;
		//#endregion

		//#region css
		/**
		 * Self-contained stylesheet, theme-aware through the stock DSW
		 * variables (--dsw-alias-*), narrow-screen aware via a media query.
		 * The bar floats bottom-right, just above the composer dock, so it
		 * never fights the input area and stays visible while typing.
		 */
		const CSS = [
			"/* dsh-attention-pack */",
			".dap_root{position:fixed;right:12px;bottom:calc(var(--dsh-composer-height, 152px) + 12px);z-index:40;box-sizing:border-box;width:min(360px,calc(100vw - 24px));max-height:min(44vh,480px);display:flex;flex-direction:column;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2);border-radius:12px;box-shadow:var(--dsw-shadow-lv3);overflow:hidden;font-family:var(--dsw-font-family);}",
			".dap_head{display:flex;align-items:center;gap:6px;padding:6px 8px;border-bottom:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);}",
			".dap_headTitle{flex:1;min-width:0;color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xs-strong-13);white-space:nowrap;text-overflow:ellipsis;overflow:hidden;}",
			".dap_headBtn{all:unset;box-sizing:border-box;cursor:pointer;color:var(--dsw-alias-label-tertiary);border-radius:4px;flex:none;display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;font-size:12px;line-height:1;}",
			".dap_headBtn:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover);}",
			".dap_headBtn:focus-visible{outline:1px solid var(--dsw-alias-state-business-primary);outline-offset:-1px;}",
			".dap_list{overflow:auto;padding:4px;display:flex;flex-direction:column;gap:2px;overscroll-behavior:contain;}",
			".dap_row{box-sizing:border-box;display:flex;align-items:center;gap:8px;min-height:32px;padding:5px 8px;border-radius:8px;color:var(--dsw-alias-label-primary);font-size:13px;line-height:18px;}",
			".dap_row:hover{background:var(--dsw-alias-interactive-bg-hover);}",
			".dap_rowSettled{color:var(--dsw-alias-label-tertiary);}",
			".dap_dot{flex:none;width:8px;height:8px;border-radius:50%;background:var(--dsw-alias-state-warn-label);}",
			".dap_dot.running{background:var(--dsw-alias-state-business-primary);animation:dap-pulse 1.6s ease-in-out infinite;}",
			".dap_dot.completed{background:var(--dsw-alias-state-success-primary);}",
			".dap_dot.failed{background:var(--dsw-alias-state-error-primary);}",
			".dap_dot.killed{background:var(--dsw-alias-state-warn-label);}",
			"@keyframes dap-pulse{0%,100%{opacity:1}50%{opacity:.35}}",
			".dap_kind{flex:none;background:var(--dsw-alias-fill-l2);color:var(--dsw-alias-label-secondary);border-radius:5px;padding:0 6px;font-size:11px;line-height:18px;}",
			".dap_label{min-width:0;font-family:var(--dsw-font-mono);white-space:nowrap;text-overflow:ellipsis;overflow:hidden;flex:1;}",
			".dap_status{flex:none;color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:18px;white-space:nowrap;max-width:40%;text-overflow:ellipsis;overflow:hidden;}",
			".dap_duration{flex:none;color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:18px;font-variant-numeric:tabular-nums;}",
			".dap_flash{animation:dap-flash 1s ease-in-out 3;border-radius:6px;}",
			"@keyframes dap-flash{0%,100%{background:transparent}50%{background:color-mix(in srgb, var(--dsw-alias-state-success-primary) 22%, transparent)}}",
			".dap_flash.failed{animation-name:dap-flash-fail;}",
			"@keyframes dap-flash-fail{0%,100%{background:transparent}50%{background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 22%, transparent)}}",
			"@media (max-width: 760px){.dap_root{right:8px;left:8px;bottom:calc(var(--dsh-composer-height, 152px) + 8px);width:auto;max-height:32vh;}}"
		].join("\n");
		function ensureCss() {
			if (document.querySelector('style[data-plugin="dsh-attention-pack"]')) return;
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-attention-pack";
			tag.textContent = CSS;
			document.head.appendChild(tag);
		}
		//#endregion

		//#region helpers
		/** Stable empty list so a session with no jobs keeps one array identity. */
		const NO_JOBS = [];
		const LIVE_STATUSES = new Set(["running", "stopping"]);
		const SETTLED_STATUSES = new Set(["completed", "failed", "killed"]);

		function isLive(job) {
			return LIVE_STATUSES.has(job.status);
		}

		function durationText(job, now, t) {
			const start = job.startedAt;
			const end = isLive(job) ? now : (job.finishedAt ?? job.startedAt);
			const total = Math.max(0, Math.floor((end - start) / 1000));
			const seconds = total % 60;
			const minutes = Math.floor(total / 60) % 60;
			const hours = Math.floor(total / 3600);
			if (hours > 0) return t("duration.hours", { hours, minutes });
			if (minutes > 0) return t("duration.minutes", { minutes, seconds });
			return t("duration.seconds", { seconds });
		}

		function statusWord(job, t) {
			switch (job.status) {
				case "running": return t("status.running");
				case "stopping": return t("status.stopping");
				case "completed": return t("status.completed");
				case "killed": return t("status.killed");
				case "failed": return t("status.failed");
				default: return job.status;
			}
		}

		/** Live rows first in start order, then settled rows newest-first. */
		function ordered(jobs) {
			return [...jobs].sort((left, right) => {
				const liveLeft = isLive(left);
				if (liveLeft !== isLive(right)) return liveLeft ? -1 : 1;
				if (liveLeft) return left.startedAt - right.startedAt;
				const finished = (right.finishedAt ?? right.startedAt) - (left.finishedAt ?? left.startedAt);
				return finished !== 0 ? finished : left.startedAt - right.startedAt;
			});
		}

		//#region settings
		const SETTINGS_KEY = "dsh-attention-pack:settings";
		function readSettings() {
			try {
				const raw = localStorage.getItem(SETTINGS_KEY);
				if (!raw) return {};
				return JSON.parse(raw);
			} catch {
				return {};
			}
		}
		function writeSettings(patch) {
			try {
				localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...readSettings(), ...patch }));
			} catch {
				/* storage unavailable — settings are best-effort */
			}
		}
		//#endregion

		//#region audio
		/** Web Audio chime; the context is only created after a user gesture
		 * (autoplay policy) and unlocked lazily. Failures are silent. */
		let audioCtx = null;
		function ensureAudio() {
			try {
				if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
				if (audioCtx.state === "suspended") audioCtx.resume();
			} catch {
				/* no audio support — silent */
			}
		}
		function chime(ok) {
			if (!audioCtx || audioCtx.state !== "running") return;
			try {
				const now = audioCtx.currentTime;
				const notes = ok ? [[880, 0], [1318.5, 0.16]] : [[440, 0], [311.1, 0.22]];
				for (const [freq, at] of notes) {
					const osc = audioCtx.createOscillator();
					const gain = audioCtx.createGain();
					osc.type = "sine";
					osc.frequency.value = freq;
					gain.gain.setValueAtTime(0.0001, now + at);
					gain.gain.exponentialRampToValueAtTime(0.22, now + at + 0.02);
					gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.18);
					osc.connect(gain);
					gain.connect(audioCtx.destination);
					osc.start(now + at);
					osc.stop(now + at + 0.22);
				}
			} catch {
				/* chime failure is not worth a crash */
			}
		}
		//#endregion

		//#region system notification
		function systemNotify(job, t) {
			if (!("Notification" in window)) return;
			const ok = job.status === "completed";
			const title = ok ? t("notify.done", { label: job.label }) : t("notify." + job.status, { label: job.label });
			const body = job.detail || statusWord(job, t);
			const send = () => {
				try {
					new Notification(title, { body, tag: "dsh-attention-pack:" + job.id });
				} catch {
					/* some engines reject tags — retry without */
					try {
						new Notification(title, { body });
					} catch {
						/* last resort: silent */
					}
				}
			};
			if (Notification.permission === "granted") send();
			else if (Notification.permission === "default") {
				Notification.requestPermission().then((permission) => {
					if (permission === "granted") send();
				}).catch(() => {});
			}
		}
		//#endregion

		//#region title flash
		let baseTitle = null;
		let flashUntil = 0;
		let flashTimer = null;
		/** Flash the tab title with the outcome, then restore. */
		function flashTitle(ok, label) {
			if (baseTitle === null) baseTitle = document.title;
			document.title = (ok ? "✓ " : "✗ ") + label;
			flashUntil = Date.now() + 6000;
			if (flashTimer) clearTimeout(flashTimer);
			flashTimer = setTimeout(refreshTitle, 6200);
		}
		/** Live-count prefix while jobs run; base title otherwise. */
		function refreshTitle(liveCount) {
			if (Date.now() < flashUntil) return;
			if (baseTitle === null) baseTitle = document.title;
			document.title = liveCount > 0 ? `(${liveCount}) ${baseTitle}` : baseTitle;
		}
		//#endregion

		//#region completion observer
		/**
		 * Diff job statuses across renders and alert once per live→settled
		 * transition. `seen` is a ref Map id → previous status; a job that
		 * appears already settled is recorded silently (the plugin was
		 * loaded after it finished), so no spurious alerts on page load.
		 */
		function useCompletionAlerts(jobs, soundOn, t) {
			const seen = useRef(new Map());
			useEffect(() => {
				const map = seen.current;
				for (const job of jobs) {
					const prev = map.get(job.id);
					if (prev && isLive(prev) && SETTLED_STATUSES.has(job.status)) {
						const ok = job.status === "completed";
						if (soundOn) chime(ok);
						systemNotify(job, t);
						flashTitle(ok, job.label);
						flashRow(job.id, ok);
					}
					map.set(job.id, job.status);
				}
			}, [jobs, soundOn, t]);
		}

		/** Briefly highlight the settling row in the bar (also the iOS /
		 * no-Notification-API fallback: the user is watching the page). */
		const flashRows = new Set();
		function flashRow(id, ok) {
			flashRows.add(id);
			setTimeout(() => flashRows.delete(id), 3000);
		}
		//#endregion

		//#region component
		/**
		 * Session-header entry point. Renders nothing until the session has
		 * at least one job; while jobs exist it shows the mini bar and runs
		 * the completion-alert pipeline. Effects run even when the bar is
		 * hidden by the user (close button), so alerts keep working.
		 */
		function AttentionPack({ sessionId, useSessions, t }) {
			const jobs = useSessions((state) => (state && state.jobsBySession ? state.jobsBySession[sessionId] : undefined)) ?? NO_JOBS;
			const live = jobs.filter(isLive);
			const [now, setNow] = useState(() => Date.now());
			const [soundOn, setSoundOn] = useState(() => readSettings().sound !== false);
			const [notifyOn, setNotifyOn] = useState(() => readSettings().notifications !== false);
			const [barHidden, setBarHidden] = useState(() => {
				try {
					return sessionStorage.getItem("dsh-attention-pack:barHidden") === "1";
				} catch {
					return false;
				}
			});

			// 1s tick while live jobs exist (duration + title live count).
			useEffect(() => {
				if (live.length === 0) return undefined;
				const timer = setInterval(() => {
					setNow(Date.now());
					refreshTitle(live.length);
				}, 1000);
				return () => clearInterval(timer);
			}, [live.length]);

			// Restore the base title when nothing runs anymore.
			useEffect(() => {
				if (live.length === 0) refreshTitle(0);
			}, [live.length]);

			// Unlock Web Audio on the first user gesture (autoplay policy).
			useEffect(() => {
				const unlock = () => {
					ensureAudio();
					document.removeEventListener("pointerdown", unlock);
				};
				document.addEventListener("pointerdown", unlock);
				return () => document.removeEventListener("pointerdown", unlock);
			}, []);

			// Completion alerts: the notifyOn flag gates system notifications
			// only; the in-page flash always fires.
			useCompletionAlerts(jobs, soundOn, t);

			if (jobs.length === 0) return null;

			const rows = ordered(jobs);
			const liveCount = live.length;
			const headLabel = liveCount > 0
				? t(liveCount === 1 ? "head.live.one" : "head.live.other", { count: liveCount })
				: t(jobs.length === 1 ? "head.idle.one" : "head.idle.other", { count: jobs.length });

			const toggleSound = () => {
				const next = !soundOn;
				setSoundOn(next);
				writeSettings({ sound: next });
			};
			const toggleNotify = () => {
				const next = !notifyOn;
				setNotifyOn(next);
				writeSettings({ notifications: next });
			};
			const hideBar = () => {
				setBarHidden(true);
				try {
					sessionStorage.setItem("dsh-attention-pack:barHidden", "1");
				} catch { /* no storage */ }
			};

			if (barHidden) return null;

			return h("div", { className: "dap_root", role: "region", "aria-label": t("bar.aria") },
				h("div", { className: "dap_head" },
					h("span", { className: "dap_headTitle", title: headLabel }, headLabel),
					h("button", {
						type: "button",
						className: "dap_headBtn",
						"aria-label": t(soundOn ? "btn.sound.on" : "btn.sound.off"),
						title: t(soundOn ? "btn.sound.on" : "btn.sound.off"),
						onClick: toggleSound
					}, soundOn ? "🔊" : "🔇"),
					h("button", {
						type: "button",
						className: "dap_headBtn",
						"aria-label": t(notifyOn ? "btn.notify.on" : "btn.notify.off"),
						title: t(notifyOn ? "btn.notify.on" : "btn.notify.off"),
						onClick: toggleNotify
					}, notifyOn ? "🔔" : "🔕"),
					h("button", {
						type: "button",
						className: "dap_headBtn",
						"aria-label": t("btn.close"),
						title: t("btn.close"),
						onClick: hideBar
					}, "✕")
				),
				h("div", { className: "dap_list" },
					rows.map((job) => {
						const liveNow = isLive(job);
						const cls = ["dap_row"];
						if (!liveNow) cls.push("dap_rowSettled");
						if (flashRows.has(job.id)) {
							cls.push("dap_flash");
							if (job.status === "failed" || job.status === "killed") cls.push("failed");
						}
						const word = statusWord(job, t);
						return h("div", {
							key: job.id,
							className: cls.join(" "),
							title: job.detail ? `${job.label} — ${job.detail}` : job.label
						},
							h("span", { className: "dap_dot " + (liveNow ? "running" : job.status) }),
							h("span", { className: "dap_kind" }, job.kind),
							h("span", { className: "dap_label" }, job.label),
							h("span", { className: "dap_status" }, job.detail ?? word),
							h("span", { className: "dap_duration" }, durationText(job, now, t))
						);
					})
				)
			);
		}
		//#endregion

		//#region locale
		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			"bar.aria": "后台任务状态条",
			"head.live.one": "{count} 个后台任务运行中",
			"head.live.other": "{count} 个后台任务运行中",
			"head.idle.one": "{count} 个后台任务",
			"head.idle.other": "{count} 个后台任务",
			"status.running": "运行中",
			"status.stopping": "正在停止",
			"status.completed": "已完成",
			"status.killed": "已取消",
			"status.failed": "已失败",
			"duration.seconds": "{seconds}秒",
			"duration.minutes": "{minutes}分{seconds}秒",
			"duration.hours": "{hours}小时{minutes}分",
			"notify.done": "✅ 任务完成：{label}",
			"notify.failed": "❌ 任务失败：{label}",
			"notify.killed": "任务已取消：{label}",
			"btn.sound.on": "提示音已开（点击关闭）",
			"btn.sound.off": "提示音已关（点击开启）",
			"btn.notify.on": "系统通知已开（点击关闭）",
			"btn.notify.off": "系统通知已关（点击开启）",
			"btn.close": "收起状态条（提醒仍然有效）"
		};
		/** English dictionary, key-identical to the Chinese source of truth. */
		const en = {
			"bar.aria": "Background job status bar",
			"head.live.one": "{count} background job running",
			"head.live.other": "{count} background jobs running",
			"head.idle.one": "{count} background job",
			"head.idle.other": "{count} background jobs",
			"status.running": "running",
			"status.stopping": "stopping",
			"status.completed": "completed",
			"status.killed": "cancelled",
			"status.failed": "failed",
			"duration.seconds": "{seconds}s",
			"duration.minutes": "{minutes}m {seconds}s",
			"duration.hours": "{hours}h {minutes}m",
			"notify.done": "✅ Done: {label}",
			"notify.failed": "❌ Failed: {label}",
			"notify.killed": "Cancelled: {label}",
			"btn.sound.on": "Sound on (click to mute)",
			"btn.sound.off": "Sound muted (click to enable)",
			"btn.notify.on": "Notifications on (click to disable)",
			"btn.notify.off": "Notifications off (click to enable)",
			"btn.close": "Collapse bar (alerts stay on)"
		};
		//#endregion

		//#region plugin body
		/** Required services: sessions store, slot injection, locale. */
		const inject = ["sessions", "slots", "locale"];

		function apply(ctx) {
			ensureCss();
			ctx.effect(() => ctx.locale.register("attention", { zh, en }), "attention: dictionaries");
			ctx.slots.inject("conversation.session.header.actions", () => ctx.slots.register({
				name: "conversation.session.header.actions",
				id: "attention-pack",
				order: 10,
				locale: "attention"
			}, AttentionPack));
		}
		//#endregion

		exports.name = "dsh-attention-pack";
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
