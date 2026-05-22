// ステータス画面 (DOM モーダル).
// 農園主の Lv / EXP / スキルポイント振り分け UI.

import { expForNextLevel } from "@/config/balance";
import type { GameState, PlayerSkills } from "@/game/state";

export interface StatusHandlers {
  allocate(skill: keyof PlayerSkills): void;
  close(): void;
}

let handlers: StatusHandlers | null = null;

export function mountStatusModal(h: StatusHandlers): void {
  handlers = h;
  document.getElementById("status-close")?.addEventListener("click", () => h.close());
}

export function showStatus(state: GameState): void {
  const modal = document.getElementById("status");
  modal?.removeAttribute("hidden");
  renderStatus(state);
}

export function hideStatus(): void {
  document.getElementById("status")?.setAttribute("hidden", "");
}

export function isStatusOpen(): boolean {
  const modal = document.getElementById("status");
  return !!modal && !modal.hasAttribute("hidden");
}

const SKILL_LABELS: Record<keyof PlayerSkills, { name: string; effect: (lvl: number) => string }> = {
  cultivate: {
    name: "栽培",
    effect: (lvl) => `収穫時 careScore +${(lvl - 1) * 5}`,
  },
  business: {
    name: "経営",
    effect: (lvl) =>
      `出荷単価 ×${(1 + (lvl - 1) * 0.05).toFixed(2)} / 建設 −${((lvl - 1) * 3).toFixed(0)}%`,
  },
  appraisal: {
    name: "目利き",
    effect: (lvl) =>
      `種苗 −${((lvl - 1) * 2).toFixed(0)}% / 初期 care +${(lvl - 1) * 5}`,
  },
};

export function renderStatus(state: GameState): void {
  const body = document.getElementById("status-body");
  const points = document.getElementById("status-points");
  if (!body || !points) return;

  body.replaceChildren();

  // サマリ (Lv, EXP)
  const summary = document.createElement("div");
  summary.className = "status-summary";
  const need = expForNextLevel(state.player.level);
  summary.innerHTML = `
    <div>レベル<b>${state.player.level}</b></div>
    <div>EXP<b>${state.player.exp.toLocaleString("ja-JP")} / ${need.toLocaleString("ja-JP")}</b></div>
    <div>SP<b>${state.player.skillPoints}</b></div>
  `;
  body.appendChild(summary);

  // スキル
  for (const key of ["cultivate", "business", "appraisal"] as const) {
    const meta = SKILL_LABELS[key];
    const lvl = state.player.skills[key];
    const row = document.createElement("div");
    row.className = "skill-row";
    row.innerHTML = `
      <div class="skill-name">${meta.name}<small>${meta.effect(lvl)}</small></div>
      <span class="skill-level">Lv ${lvl}</span>
      <button class="skill-plus" data-skill="${key}" ${state.player.skillPoints <= 0 ? "disabled" : ""}>+</button>
    `;
    row.querySelector<HTMLButtonElement>(".skill-plus")?.addEventListener("click", () => {
      if (handlers) handlers.allocate(key);
    });
    body.appendChild(row);
  }

  points.textContent = `未割振り SP: ${state.player.skillPoints}`;
}
