// ハウス内画面 (PixiJS).
// 2行×3列のプロット + 下部アクションボタン + 上部ヘッダ.

import { Container, Graphics, Sprite, Text, TextStyle } from "pixi.js";
import { TILE_SIZE } from "@/config/balance";
import type { Greenhouse, Plot } from "@/game/state";
import { textureForStage, type SpriteRegistry } from "@/render/sprites";

const HEADER_H = 32;
const FOOTER_H = 56;
const PLOT_W = 96;
const PLOT_H = 96;
const PLOT_COLS = 3;
const PLOT_ROWS = 2;
const PLOT_GAP = 6;

export type HouseAction = "plant" | "water" | "fertilize" | "close";

export interface HouseViewOpts {
  sprites: SpriteRegistry;
  viewWidth: number;
  viewHeight: number;
  onAction(action: HouseAction, plotId: string | null): void;
}

export class HouseView {
  readonly root = new Container();
  private readonly headerLabel: Text;
  private readonly bg: Graphics;
  private readonly plotsLayer = new Container();
  private readonly actionsLayer = new Container();
  private currentGh: Greenhouse | null = null;
  private selectedPlotId: string | null = null;

  constructor(private readonly opts: HouseViewOpts) {
    // 半透明オーバーレイ背景
    this.bg = new Graphics()
      .rect(0, 0, opts.viewWidth, opts.viewHeight)
      .fill({ color: 0x1a1620, alpha: 0.94 });
    this.root.addChild(this.bg);

    this.headerLabel = new Text({
      text: "",
      style: new TextStyle({
        fontFamily: "system-ui, sans-serif",
        fontSize: 16,
        fontWeight: "700",
        fill: "#f4ecd8",
      }),
    });
    this.headerLabel.position.set(12, 8);
    this.root.addChild(this.headerLabel);

    // 閉じる (×) ボタン
    const close = this.makeButton("×", opts.viewWidth - 36, 4, 28, 24, "close");
    this.root.addChild(close);

    this.root.addChild(this.plotsLayer, this.actionsLayer);
  }

  setVisible(v: boolean): void {
    this.root.visible = v;
    if (!v) this.selectedPlotId = null;
  }

  show(gh: Greenhouse): void {
    this.currentGh = gh;
    this.selectedPlotId = null;
    this.root.visible = true;
    this.refresh();
  }

  /** state 変更時に呼ぶ. 同じハウスIDで再描画する. */
  refresh(updatedGh?: Greenhouse): void {
    if (updatedGh) this.currentGh = updatedGh;
    if (!this.currentGh) return;
    const gh = this.currentGh;
    const idx = (this.currentGh.id.match(/[a-z0-9]+$/i) ?? ["?"])[0];
    this.headerLabel.text = `ビニールハウス #${idx}`;
    this.renderPlots(gh);
    this.renderActions(gh);
  }

  private renderPlots(gh: Greenhouse): void {
    this.plotsLayer.removeChildren();
    const totalW = PLOT_COLS * PLOT_W + (PLOT_COLS - 1) * PLOT_GAP;
    const totalH = PLOT_ROWS * PLOT_H + (PLOT_ROWS - 1) * PLOT_GAP;
    const x0 = (this.opts.viewWidth - totalW) / 2;
    const y0 = HEADER_H + ((this.opts.viewHeight - HEADER_H - FOOTER_H - totalH) / 2);

    for (let r = 0; r < PLOT_ROWS; r += 1) {
      for (let c = 0; c < PLOT_COLS; c += 1) {
        const idx = r * PLOT_COLS + c;
        const plot = gh.plots[idx];
        if (!plot) continue;
        const px = x0 + c * (PLOT_W + PLOT_GAP);
        const py = y0 + r * (PLOT_H + PLOT_GAP);
        const cell = this.makePlot(plot, px, py);
        this.plotsLayer.addChild(cell);
      }
    }
  }

  private makePlot(plot: Plot, x: number, y: number): Container {
    const c = new Container();
    c.position.set(x, y);

    // 背景: 栽培ベッドタイルを 3x3 (= 96x96) 並べる
    for (let ty = 0; ty < PLOT_H / TILE_SIZE; ty += 1) {
      for (let tx = 0; tx < PLOT_W / TILE_SIZE; tx += 1) {
        const s = new Sprite(this.opts.sprites.floorBed);
        s.position.set(tx * TILE_SIZE, ty * TILE_SIZE);
        c.addChild(s);
      }
    }

    // 選択枠 / アウトライン
    const border = new Graphics();
    const isSel = plot.id === this.selectedPlotId;
    border.rect(0, 0, PLOT_W, PLOT_H).stroke({
      width: 2,
      color: isSel ? 0xf0c440 : 0x1a1620,
      alpha: 1,
    });
    c.addChild(border);

    // トマトスプライト (中央配置)
    if (plot.plant) {
      const tex = textureForStage(this.opts.sprites, plot.plant.stage);
      if (tex) {
        const sp = new Sprite(tex);
        sp.anchor.set(0.5, 1);
        sp.position.set(PLOT_W / 2, PLOT_H - 4);
        c.addChild(sp);
      }
      // 種ステージはアイコンなし、テキストで補助
      if (plot.plant.stage === "seed") {
        const t = new Text({
          text: "🌱",
          style: new TextStyle({ fontSize: 16, fill: "#f0c440" }),
        });
        t.anchor.set(0.5);
        t.position.set(PLOT_W / 2, PLOT_H / 2);
        c.addChild(t);
      }
    }

    // 水・肥料バー
    this.drawBar(c, 4, PLOT_H - 12, PLOT_W - 8, 4, plot.waterLevel / 100, 0x4aa8e0);
    this.drawBar(c, 4, PLOT_H - 6, PLOT_W - 8, 4, plot.fertilizerLevel / 100, 0xc6a23a);

    // ステージラベル (上部)
    if (plot.plant) {
      const label = new Text({
        text: stageLabel(plot.plant.stage),
        style: new TextStyle({
          fontFamily: "system-ui, sans-serif",
          fontSize: 10,
          fill: "#f4ecd8",
          stroke: { color: "#1a1620", width: 3 },
          fontWeight: "700",
        }),
      });
      label.anchor.set(0.5, 0);
      label.position.set(PLOT_W / 2, 2);
      c.addChild(label);
    }

    // タップ判定
    c.eventMode = "static";
    c.cursor = "pointer";
    c.on("pointertap", () => {
      this.selectedPlotId = plot.id;
      this.refresh();
    });

    return c;
  }

  private drawBar(
    parent: Container,
    x: number,
    y: number,
    w: number,
    h: number,
    ratio: number,
    color: number,
  ): void {
    const r = Math.max(0, Math.min(1, ratio));
    const g = new Graphics();
    g.rect(x, y, w, h).fill({ color: 0x000000, alpha: 0.5 });
    g.rect(x, y, w * r, h).fill({ color });
    parent.addChild(g);
  }

  private renderActions(gh: Greenhouse): void {
    this.actionsLayer.removeChildren();
    const plot = gh.plots.find((p) => p.id === this.selectedPlotId) ?? null;
    const planted = !!plot?.plant;

    const buttons: { label: string; action: HouseAction; enabled: boolean }[] = [
      { label: "植える", action: "plant", enabled: !!plot && !planted },
      { label: "水やり", action: "water", enabled: !!plot && planted },
      { label: "追肥", action: "fertilize", enabled: !!plot && planted },
    ];

    const btnW = 96;
    const btnH = 36;
    const gap = 12;
    const totalW = buttons.length * btnW + (buttons.length - 1) * gap;
    const x0 = (this.opts.viewWidth - totalW) / 2;
    const y = this.opts.viewHeight - FOOTER_H + 8;
    for (let i = 0; i < buttons.length; i += 1) {
      const b = buttons[i]!;
      const btn = this.makeButton(
        b.label,
        x0 + i * (btnW + gap),
        y,
        btnW,
        btnH,
        b.action,
        b.enabled,
      );
      this.actionsLayer.addChild(btn);
    }
  }

  private makeButton(
    label: string,
    x: number,
    y: number,
    w: number,
    h: number,
    action: HouseAction,
    enabled = true,
  ): Container {
    const c = new Container();
    c.position.set(x, y);
    const g = new Graphics();
    g.rect(0, 0, w, h)
      .fill({ color: enabled ? 0x5a4f60 : 0x3a3340 })
      .stroke({ color: 0x1a1620, width: 2 });
    c.addChild(g);
    const t = new Text({
      text: label,
      style: new TextStyle({
        fontFamily: "system-ui, sans-serif",
        fontSize: 14,
        fontWeight: "700",
        fill: enabled ? "#f4ecd8" : "#9a93a6",
      }),
    });
    t.anchor.set(0.5);
    t.position.set(w / 2, h / 2);
    c.addChild(t);
    if (enabled) {
      c.eventMode = "static";
      c.cursor = "pointer";
      c.on("pointertap", () => this.opts.onAction(action, this.selectedPlotId));
    }
    return c;
  }
}

function stageLabel(stage: import("@/config/balance").GrowthStage): string {
  switch (stage) {
    case "seed":
      return "種";
    case "sprout":
      return "発芽";
    case "seedling":
      return "育苗";
    case "planted":
      return "定植";
    case "flower":
      return "開花";
    case "fruit":
      return "着果";
    case "grow":
      return "肥大";
    case "harvest":
      return "収穫期";
  }
}
