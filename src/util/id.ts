// 短い ID 生成. セーブ可搬コードのサイズ削減のため小さく保つ.

let counter = 0;

export function nextId(prefix: string): string {
  counter += 1;
  const t = Date.now().toString(36).slice(-4);
  return `${prefix}_${t}${counter.toString(36)}`;
}
