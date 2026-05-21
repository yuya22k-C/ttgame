// PixiJS のテクスチャレジストリ.
// Vite のアセットインポートで URL を取得し、Assets API で一括ロードする.
// 全テクスチャを nearest フィルタにしてピクセル拡大時のボケを防ぐ.

import { Assets, type Texture } from "pixi.js";

import grassUrl from "@assets/sprites/ground/grass.png";
import soilUrl from "@assets/sprites/ground/soil.png";
import pathUrl from "@assets/sprites/ground/path.png";
import waterUrl from "@assets/sprites/ground/water.png";
import greenhouseUrl from "@assets/sprites/greenhouse/exterior.png";
import floorBedUrl from "@assets/sprites/greenhouse/floor_bed.png";
import floorConcreteUrl from "@assets/sprites/greenhouse/floor_concrete.png";
import tomato1Url from "@assets/sprites/tomato/stage1_seedling.png";
import tomato2Url from "@assets/sprites/tomato/stage2_growing.png";
import tomato3Url from "@assets/sprites/tomato/stage3_flowering.png";
import tomato4Url from "@assets/sprites/tomato/stage4_fruiting.png";

const MANIFEST: Record<string, string> = {
  grass: grassUrl,
  soil: soilUrl,
  path: pathUrl,
  water: waterUrl,
  greenhouse: greenhouseUrl,
  floorBed: floorBedUrl,
  floorConcrete: floorConcreteUrl,
  tomato1: tomato1Url,
  tomato2: tomato2Url,
  tomato3: tomato3Url,
  tomato4: tomato4Url,
};

export interface SpriteRegistry {
  grass: Texture;
  soil: Texture;
  path: Texture;
  water: Texture;
  greenhouse: Texture;
  floorBed: Texture;
  floorConcrete: Texture;
  tomato1: Texture;
  tomato2: Texture;
  tomato3: Texture;
  tomato4: Texture;
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
    floorBed: loaded.floorBed!,
    floorConcrete: loaded.floorConcrete!,
    tomato1: loaded.tomato1!,
    tomato2: loaded.tomato2!,
    tomato3: loaded.tomato3!,
    tomato4: loaded.tomato4!,
  };
}

import type { GrowthStage } from "@/config/balance";

/** ステージ8段階を 4 スプライトに割り付け. seed は非表示 (土だけ見せる). */
export function textureForStage(
  sprites: SpriteRegistry,
  stage: GrowthStage,
): Texture | null {
  switch (stage) {
    case "seed":
      return null;
    case "sprout":
    case "seedling":
      return sprites.tomato1;
    case "planted":
    case "flower":
      return sprites.tomato2;
    case "fruit":
      return sprites.tomato3;
    case "grow":
    case "harvest":
      return sprites.tomato4;
  }
}
