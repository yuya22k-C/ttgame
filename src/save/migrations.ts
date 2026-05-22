// セーブスキーマのマイグレーションチェーン.
// 旧バージョンの状態を最新へ順番に変換する. v1 → v2 → v3 ...
// 将来フィールドが追加/変更されたら migrations.push(fn) する.

import type { GameState } from "@/game/state";

export const CURRENT_VERSION = 1;

type Migrator = (state: unknown) => unknown;

/**
 * 各エントリは「version N の state を N+1 へ変換」する関数.
 * 配列 index = 起点バージョン - 1.
 * v1 が最新なので現状は空 (登録例: migrations[0] = v1→v2 関数).
 */
const migrations: Migrator[] = [];

export type MigrationResult =
  | { ok: true; state: GameState }
  | { ok: false; reason: "missing_version" | "version_too_new" | "invalid_shape"; message: string };

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

/**
 * 任意の解析結果を最新の GameState へ昇格させる.
 * version の桁上げに失敗したら明示的にエラーを返す.
 */
export function migrate(raw: unknown): MigrationResult {
  if (!isObject(raw)) {
    return { ok: false, reason: "invalid_shape", message: "保存データの形式が不正です" };
  }
  const ver = raw.version;
  if (typeof ver !== "number" || !Number.isInteger(ver) || ver <= 0) {
    return { ok: false, reason: "missing_version", message: "バージョン番号がありません" };
  }
  if (ver > CURRENT_VERSION) {
    return {
      ok: false,
      reason: "version_too_new",
      message: `このゲームのバージョンより新しい保存データです (v${ver} > v${CURRENT_VERSION})`,
    };
  }
  let cur: unknown = raw;
  for (let v = ver; v < CURRENT_VERSION; v += 1) {
    const migrator = migrations[v - 1];
    if (!migrator) {
      return {
        ok: false,
        reason: "invalid_shape",
        message: `v${v} → v${v + 1} のマイグレーションが定義されていません`,
      };
    }
    cur = migrator(cur);
  }
  // 軽い妥当性チェックのみ. 主要トップレベルキーの存在を確認.
  if (!isObject(cur) || !("clock" in cur) || !("farm" in cur) || !("player" in cur)) {
    return { ok: false, reason: "invalid_shape", message: "保存データの構造が壊れています" };
  }
  return { ok: true, state: cur as unknown as GameState };
}
