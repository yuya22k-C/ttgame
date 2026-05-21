// 下部メニューボタンの配線.
// M3 では「建てる」のみ機能を持ち、他は未実装トースト.

import { showToast } from "@/ui/toast";

export type MenuAction = "build" | "grow" | "ship" | "status" | "settings";

export interface MenuHandlers {
  build(): void;
  ship(): void;
}

export function mountMenu(handlers: MenuHandlers): void {
  const menu = document.getElementById("menu");
  if (!menu) throw new Error("#menu not found");
  for (const btn of menu.querySelectorAll<HTMLButtonElement>(".menu-btn")) {
    btn.addEventListener("click", () => {
      const action = btn.dataset.action as MenuAction | undefined;
      switch (action) {
        case "build":
          handlers.build();
          break;
        case "ship":
          handlers.ship();
          break;
        case "grow":
        case "status":
        case "settings":
          showToast(`${btn.textContent ?? action} は今後のマイルストーンで実装`);
          break;
      }
    });
  }
}

export function setBuildButtonActive(active: boolean): void {
  const btn = document.querySelector<HTMLButtonElement>('.menu-btn[data-action="build"]');
  if (!btn) return;
  btn.classList.toggle("menu-btn--active", active);
  btn.textContent = active ? "やめる" : "建てる";
}
