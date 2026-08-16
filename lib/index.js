/**
 * dsh-attention-pack — node half.
 *
 * Deliberately empty: all the work happens in the browser bundle
 * (lib/client.js). The browser side watches the session's background-job
 * records (the same `jobsBySession` mirror the stock job-list dropdown
 * renders) and:
 *
 *   1. Alerts when a live job settles — system notification (Web
 *      Notification), a two-tone Web Audio chime, and a document-title
 *      flash ("✓ / ✗ 任务名"), with a per-job fallback to an in-page
 *      highlight when the platform has no Notification API (iOS Safari).
 *   2. Renders a persistent mini task bar above the composer while any
 *      background job is live: status dot, kind badge, label, status
 *      detail, ticking duration — so long-running work stays visible
 *      without opening the dropdown.
 *
 * Loaded via the web profile's cordis.patch.yml insert; remove that row
 * to uninstall.
 */
function apply() {}
export { apply };
