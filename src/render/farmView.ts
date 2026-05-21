// 農園トップビューの描画 (PixiJS).
// 地面 → 既存ハウス → 建設モードオーバーレイ の3層を分けて管理.

import { Container, Graphics, Sprite } from "pixi.js";
import { GREENHOUSE_SIZE, GRID_H, GRID_W, TILE_SIZE } from "@/config/balance";
import { canPlaceGreenhouse } from "@/game/farm";
import type { Farm, GameState } from "@/game/state";
import type { SpriteRegistry } from "@/render/sprites";

export interface FarmViewOpts {
  sprites: SpriteRegistry;
  onCellClick(gx: number, gy: number): void;
}

export class FarmView {
  readonly root = new Container();
  private readonly ground = new Container();
  private readonly buildings = new Container();
  private readonly overlay = new Container();
  private readonly hitArea = new Graphics();
  private buildMode = false;

  constructor(private readonly opts: FarmViewOpts) {
    this.root.addChild(this.ground, this.buildings, this.overlay, this.hitArea);
    this.renderGround();

    // クリックヒット領域 (グリッド全面)
    this.hitArea
      .rect(0, 0, GRID_W * TILE_SIZE, GRID_H * TILE_SIZE)
      .fill({ color: 0xffffff, alpha: 0.001 });
    this.hitArea.eventMode = "static";
    this.hitArea.cursor = "pointer";
    this.hitArea.on("pointertap", (e) => {
      const { x, y } = this.hitArea.toLocal(e.global);
      const gx = Math.floor(x / TILE_SIZE);
      const gy = Math.floor(y / TILE_SIZE);
      if (gx < 0 || gx >= GRID_W || gy < 0 || gy >= GRID_H) return;
      this.opts.onCellClick(gx, gy);
    });
  }

  /** 地面タイル (草) を全マスに敷く. */
  private renderGround(): void {
    for (let y = 0; y < GRID_H; y += 1) {
      for (let x = 0; x < GRID_W; x += 1) {
        const sprite = new Sprite(this.opts.sprites.grass);
        sprite.x = x * TILE_SIZE;
        sprite.y = y * TILE_SIZE;
        this.ground.addChild(sprite);
      }
    }
  }

  /** ハウス群を State に合わせて再描画 (差分ではなく全置換). */
  renderBuildings(farm: Farm): void {
    this.buildings.removeChildren();
    for (const gh of farm.greenhouses) {
      const sprite = new Sprite(this.opts.sprites.greenhouse);
      sprite.x = gh.position.x * TILE_SIZE;
      sprite.y = gh.position.y * TILE_SIZE;
      this.buildings.addChild(sprite);
    }
  }

  setBuildMode(on: boolean, state: GameState): void {
    this.buildMode = on;
    this.renderOverlay(state);
  }

  /** 建設モード中、配置候補のヒントを表示する. */
  renderOverlay(state: GameState): void {
    this.overlay.removeChildren();
    if (!this.buildMode) return;
    const size = GREENHOUSE_SIZE;
    const g = new Graphics();
    // 全マスを薄く塗り、配置可能なマス (左上に置いたときに収まる) は緑系で強調
    for (let y = 0; y < GRID_H; y += 1) {
      for (let x = 0; x < GRID_W; x += 1) {
        const canPlace = canPlaceGreenhouse(state.farm, x, y, size);
        g.rect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE - 1, TILE_SIZE - 1).fill({
          color: canPlace ? 0x4ade80 : 0x000000,
          alpha: canPlace ? 0.18 : 0.25,
        });
      }
    }
    // 配置可能なアンカーマスの外枠を強調
    for (let y = 0; y < GRID_H; y += 1) {
      for (let x = 0; x < GRID_W; x += 1) {
        if (canPlaceGreenhouse(state.farm, x, y, size)) {
          g.rect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE - 1, TILE_SIZE - 1).stroke({
            width: 1,
            color: 0x4ade80,
            alpha: 0.6,
          });
        }
      }
    }
    this.overlay.addChild(g);
  }
}
