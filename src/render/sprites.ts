// PixiJS のテクスチャレジストリ.
// Vite のアセットインポートで URL を取得し、Assets API で一括ロードする.
// 全テクスチャを nearest フィルタにしてピクセル拡大時のボケを防ぐ.

import { Assets, type Texture } from "pixi.js";

import grassUrl from "@assets/sprites/ground/grass.png";
import soilUrl from "@assets/sprites/ground/soil.png";
import pathUrl from "@assets/sprites/ground/path.png";
import waterUrl from "@assets/sprites/ground/water.png";
import greenhouseUrl from "@assets/sprites/greenhouse/exterior.png";

const MANIFEST: Record<string, string> = {
  grass: grassUrl,
  soil: soilUrl,
  path: pathUrl,
  water: waterUrl,
  greenhouse: greenhouseUrl,
};

export interface SpriteRegistry {
  grass: Texture;
  soil: Texture;
  path: Texture;
  water: Texture;
  greenhouse: Texture;
}

export async function loadSprites(): Promise<SpriteRegistry> {
  for (const [alias, src] of Object.entries(MANIFEST)) {
    Assets.add({ alias, src });
  }
  const loaded = (await Assets.load(Object.keys(MANIFEST))) as Record<string, Texture>;
  for (const tex of Object.values(loaded)) {
    tex.source.scaleMode = "nearest";
  }
  return {
    grass: loaded.grass!,
    soil: loaded.soil!,
    path: loaded.path!,
    water: loaded.water!,
    greenhouse: loaded.greenhouse!,
  };
}
