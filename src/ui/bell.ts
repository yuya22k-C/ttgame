// 通知ベルのUI. ベルアイコン + 未読バッジ + ドロップダウン一覧.

import { markAllRead, type Notification, type NotificationCenter } from "@/game/notifications";

export interface BellHandlers {
  onOpen?(): void;
  onItemClick?(n: Notification): void;
}

let openState = false;

function get(id: string): HTMLElement | null {
  return document.getElementById(id);
}

export function mountBell(getCenter: () => NotificationCenter, h: BellHandlers = {}): void {
  const btn = get("bell");
  btn?.addEventListener("click", () => {
    openState = !openState;
    if (openState) {
      h.onOpen?.();
      renderList(getCenter());
      get("bell-list")?.removeAttribute("hidden");
    } else {
      get("bell-list")?.setAttribute("hidden", "");
    }
  });

  // ドロップダウン外クリックで閉じる
  document.addEventListener("pointerdown", (e) => {
    if (!openState) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest("#bell") || target?.closest("#bell-list")) return;
    closeList();
  });

  // 通知アイテムクリックでハンドラ
  get("bell-list")?.addEventListener("click", (e) => {
    const item = (e.target as HTMLElement | null)?.closest<HTMLElement>(".bell-item");
    if (!item) return;
    const idx = Number(item.dataset.idx);
    const center = getCenter();
    const n = center.list[idx];
    if (n) h.onItemClick?.(n);
  });
}

export function closeList(): void {
  openState = false;
  get("bell-list")?.setAttribute("hidden", "");
}

export function refreshBadge(center: NotificationCenter): void {
  const badge = get("bell-count");
  if (!badge) return;
  if (center.unread <= 0) {
    badge.setAttribute("hidden", "");
  } else {
    badge.removeAttribute("hidden");
    badge.textContent = String(Math.min(99, center.unread));
  }
  if (openState) renderList(center);
}

function formatRel(now: number, t: number): string {
  const sec = Math.max(0, Math.floor((now - t) / 1000));
  if (sec < 5) return "今";
  if (sec < 60) return `${sec}秒前`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}分前`;
  const hr = Math.floor(min / 60);
  return `${hr}時間前`;
}

export function renderList(center: NotificationCenter): void {
  const root = get("bell-list");
  if (!root) return;
  root.replaceChildren();
  if (center.list.length === 0) {
    const empty = document.createElement("div");
    empty.className = "bell-list-empty";
    empty.textContent = "通知はありません";
    root.appendChild(empty);
    return;
  }
  const now = Date.now();
  for (let i = 0; i < center.list.length; i += 1) {
    const n = center.list[i]!;
    const row = document.createElement("div");
    row.className = `bell-item${n.read ? "" : " bell-item--unread"}`;
    row.dataset.idx = String(i);
    row.innerHTML = `
      <span class="bell-dot bell-dot--${n.kind}"></span>
      <span class="bell-msg">${escapeHtml(n.message)}</span>
      <span class="bell-time">${formatRel(now, n.createdAt)}</span>
    `;
    root.appendChild(row);
  }
  // 開いた時点で全部既読化
  markAllRead(center);
  refreshBadgeOnly(center);
}

function refreshBadgeOnly(center: NotificationCenter): void {
  const badge = get("bell-count");
  if (!badge) return;
  if (center.unread <= 0) badge.setAttribute("hidden", "");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
