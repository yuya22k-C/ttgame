// 短時間表示の通知 (建設失敗・買い物完了など).
// 6.7 ゲーム内お知らせの暫定実装.

let timer: number | null = null;

export function showToast(message: string, ms = 1800): void {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = message;
  el.classList.add("toast--show");
  if (timer !== null) {
    window.clearTimeout(timer);
  }
  timer = window.setTimeout(() => {
    el.classList.remove("toast--show");
    timer = null;
  }, ms);
}
