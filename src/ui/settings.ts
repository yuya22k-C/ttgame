// 設定モーダル: 持ち運びコードのエクスポート / インポート / 新規開始.

export interface SettingsHandlers {
  export(): string;
  import(code: string): boolean;
  reset(): void;
  close(): void;
}

function get<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

export function mountSettingsModal(h: SettingsHandlers): void {
  get("settings-close")?.addEventListener("click", () => h.close());
  get<HTMLButtonElement>("settings-export")?.addEventListener("click", () => {
    const code = h.export();
    const ta = get<HTMLTextAreaElement>("settings-code");
    if (ta) ta.value = code;
  });
  get<HTMLButtonElement>("settings-copy")?.addEventListener("click", async () => {
    const ta = get<HTMLTextAreaElement>("settings-code");
    if (!ta?.value) return;
    try {
      await navigator.clipboard.writeText(ta.value);
    } catch {
      ta.select();
      document.execCommand?.("copy");
    }
  });
  get<HTMLButtonElement>("settings-import")?.addEventListener("click", () => {
    const ta = get<HTMLTextAreaElement>("settings-code");
    if (!ta) return;
    const code = ta.value.trim();
    if (!code) return;
    h.import(code);
  });
  get<HTMLButtonElement>("settings-reset")?.addEventListener("click", () => {
    if (window.confirm?.("本当に最初からやり直しますか？保存中の進行は失われます。")) {
      h.reset();
    }
  });
}

export function showSettings(): void {
  document.getElementById("settings")?.removeAttribute("hidden");
  const ta = get<HTMLTextAreaElement>("settings-code");
  if (ta) ta.value = "";
}

export function hideSettings(): void {
  document.getElementById("settings")?.setAttribute("hidden", "");
}
