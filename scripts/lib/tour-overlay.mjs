/**
 * The video's overlay layer, as a script injected into every document.
 *
 * It is deliberately a *page* overlay rather than post-production: Playwright
 * records the page, so chapter cards, the lower third and the pointer have to
 * live in the page to appear in the recording at all. Everything is
 * `pointer-events: none` and mounted outside the React root, so it can never
 * interfere with the app it is filming.
 *
 * Exposes `window.__tour` — `card`, `caption`, `cursorTo`, `ripple`, `smoothScroll`.
 * Injected with `addInitScript`, so a full navigation re-mounts it automatically;
 * the caller re-applies the caption after a navigation (state does not survive).
 */

export const OVERLAY_SCRIPT = `(() => {
  if (window.__tour) return;

  const ACCENT = "#5b8cff";
  const FONT = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif';

  const el = (tag, style, html) => {
    const n = document.createElement(tag);
    Object.assign(n.style, style);
    if (html !== undefined) n.innerHTML = html;
    return n;
  };

  const root = el("div", {
    position: "fixed", inset: "0", zIndex: "2147483647",
    pointerEvents: "none", fontFamily: FONT,
  });
  root.id = "__tour";

  /* ---- Full-bleed chapter card ---------------------------------------- */
  const card = el("div", {
    position: "absolute", inset: "0",
    background: "radial-gradient(120% 90% at 50% 0%, #16202e 0%, #0a0d12 60%, #07090c 100%)",
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    gap: "18px", opacity: "0", transition: "opacity 520ms ease", textAlign: "center", padding: "0 8vw",
  });
  const cardEyebrow = el("div", {
    fontSize: "13px", fontWeight: "600", letterSpacing: "0.22em", textTransform: "uppercase", color: ACCENT,
  });
  const cardTitle = el("div", {
    fontSize: "50px", lineHeight: "1.1", fontWeight: "650", color: "#f4f7fb", letterSpacing: "-0.02em", maxWidth: "17ch",
  });
  const cardRule = el("div", { width: "56px", height: "2px", background: ACCENT, opacity: "0.75", borderRadius: "2px" });
  const cardSub = el("div", {
    fontSize: "19px", lineHeight: "1.5", color: "#9fb0c4", fontWeight: "400", maxWidth: "52ch",
  });
  card.append(cardEyebrow, cardTitle, cardRule, cardSub);

  /* ---- Lower third ----------------------------------------------------- */
  const lower = el("div", {
    position: "absolute", left: "44px", bottom: "40px", maxWidth: "620px",
    background: "rgba(10, 13, 18, 0.90)", backdropFilter: "blur(10px)",
    border: "1px solid rgba(255,255,255,0.09)", borderRadius: "14px",
    padding: "16px 20px 17px", boxShadow: "0 18px 48px rgba(0,0,0,0.42)",
    opacity: "0", transform: "translateY(14px)",
    transition: "opacity 380ms ease, transform 380ms ease",
  });
  const lowEyebrow = el("div", {
    fontSize: "10.5px", fontWeight: "700", letterSpacing: "0.2em", textTransform: "uppercase",
    color: ACCENT, marginBottom: "7px",
  });
  const lowTitle = el("div", { fontSize: "19px", fontWeight: "620", color: "#f4f7fb", letterSpacing: "-0.01em" });
  const lowBody = el("div", { fontSize: "14px", lineHeight: "1.5", color: "#a9b8c9", marginTop: "5px" });
  lower.append(lowEyebrow, lowTitle, lowBody);

  /* ---- Pointer --------------------------------------------------------- */
  const cursor = el("div", {
    position: "absolute", left: "0", top: "0", width: "24px", height: "24px",
    marginLeft: "-12px", marginTop: "-12px", borderRadius: "50%",
    border: "2px solid rgba(255,255,255,0.92)",
    boxShadow: "0 0 0 1.5px rgba(0,0,0,0.35), 0 3px 12px rgba(0,0,0,0.45)",
    background: "rgba(91,140,255,0.22)", opacity: "0",
    transition: "opacity 260ms ease", willChange: "transform",
  });
  const ripple = el("div", {
    position: "absolute", left: "0", top: "0", width: "24px", height: "24px",
    marginLeft: "-12px", marginTop: "-12px", borderRadius: "50%",
    border: "2px solid " + ACCENT, opacity: "0", willChange: "transform",
  });

  root.append(card, lower, cursor, ripple);

  const mount = () => document.body && !document.body.contains(root) && document.body.appendChild(root);
  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount, { once: true });

  /* ---- Animation helpers ------------------------------------------------ */
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  const animate = (ms, step) =>
    new Promise((resolve) => {
      const t0 = performance.now();
      const tick = (now) => {
        const p = Math.min(1, (now - t0) / Math.max(1, ms));
        step(easeInOut(p));
        if (p < 1) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });

  let cx = window.innerWidth / 2;
  let cy = window.innerHeight / 2;
  const place = (x, y) => {
    cx = x; cy = y;
    cursor.style.transform = "translate(" + x + "px," + y + "px)";
  };
  place(cx, cy);

  window.__tour = {
    card(o) {
      cardEyebrow.textContent = o.eyebrow ?? "";
      cardTitle.textContent = o.title ?? "";
      cardSub.textContent = o.sub ?? "";
      card.style.opacity = "1";
    },
    cardOut() { card.style.opacity = "0"; },

    /**
     * Show the lower third. "at" moves it out of the way of whatever the chapter
     * is driving — the chat, for instance, puts its input exactly where the
     * default bottom-left panel would sit.
     */
    caption(o) {
      lowEyebrow.textContent = o.eyebrow ?? "";
      lowTitle.textContent = o.title ?? "";
      lowBody.textContent = o.sub ?? "";
      const at = o.at ?? "bottom-left";
      Object.assign(lower.style, {
        left: at.endsWith("right") ? "auto" : "44px",
        right: at.endsWith("right") ? "44px" : "auto",
        top: at.startsWith("top") ? "78px" : "auto",
        bottom: at.startsWith("top") ? "auto" : "40px",
      });
      lower.style.opacity = "1";
      lower.style.transform = "translateY(0)";
    },
    captionOut() {
      lower.style.opacity = "0";
      lower.style.transform = "translateY(14px)";
    },

    cursorShow() { cursor.style.opacity = "1"; },
    cursorHide() { cursor.style.opacity = "0"; },
    cursorAt(x, y) { place(x, y); },

    cursorTo(x, y, ms) {
      const x0 = cx, y0 = cy;
      return animate(ms, (p) => place(x0 + (x - x0) * p, y0 + (y - y0) * p));
    },

    ripple() {
      ripple.style.transform = "translate(" + cx + "px," + cy + "px) scale(1)";
      ripple.style.opacity = "0.9";
      return animate(460, (p) => {
        ripple.style.transform = "translate(" + cx + "px," + cy + "px) scale(" + (1 + p * 1.9) + ")";
        ripple.style.opacity = String(0.9 * (1 - p));
      });
    },

    smoothScroll(to, ms) {
      const from = window.scrollY;
      const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      const target = Math.max(0, Math.min(to, max));
      return animate(ms, (p) => window.scrollTo(0, from + (target - from) * p));
    },

    /** Scroll a scrollable container (e.g. the chat transcript) rather than the page. */
    scrollElement(selector, to, ms) {
      const node = document.querySelector(selector);
      if (!node) return Promise.resolve();
      const from = node.scrollTop;
      const target = to < 0 ? node.scrollHeight : to;
      return animate(ms, (p) => { node.scrollTop = from + (target - from) * p; });
    },
  };
})();`;
