// 速度切替 UI (停止 / 1× / 2× / 4× / 8×).
// DOM 直書き. 要件定義 3.3 / 6.6 参照.

import type { GameState } from "@/game/state";

type Speed = GameState["clock"]["speed"];
const SPEEDS: { value: Speed; label: string }[] = [
  { value: 0, label: "II" },
  { value: 1, label: "1×" },
  { value: 2, label: "2×" },
  { value: 4, label: "4×" },
  { value: 8, label: "8×" },
];

export function mountSpeedControls(getState: () => GameState, setSpeed: (s: Speed) => void): void {
  const container = document.getElementById("speed");
  if (!container) throw new Error("#speed element not found");
  container.replaceChildren();
  for (const { value, label } of SPEEDS) {
    const btn = document.createElement("button");
    btn.className = "speed-btn";
    btn.dataset.speed = String(value);
    btn.textContent = label;
    btn.addEventListener("click", () => {
      setSpeed(value);
      refresh(getState());
    });
    container.appendChild(btn);
  }
  refresh(getState());
}

export function refresh(state: GameState): void {
  const container = document.getElementById("speed");
  if (!container) return;
  for (const btn of container.querySelectorAll<HTMLButtonElement>(".speed-btn")) {
    const v = Number(btn.dataset.speed) as Speed;
    btn.classList.toggle("speed-btn--active", v === state.clock.speed);
  }
}
