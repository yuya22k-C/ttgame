import { Application, Container, Text, TextStyle } from "pixi.js";
import { createInitialState } from "@/game/state";
import { mountHud, renderHud } from "@/ui/hud";

async function bootstrap(): Promise<void> {
  const stage = document.getElementById("stage");
  if (!(stage instanceof HTMLElement)) {
    throw new Error("#stage element not found");
  }

  const app = new Application();
  await app.init({
    width: 480,
    height: 320,
    background: "#3d6b3d",
    antialias: false,
    roundPixels: true,
    autoDensity: false,
    resolution: 1,
  });
  stage.appendChild(app.canvas);

  const root = new Container();
  app.stage.addChild(root);

  // ----- 仮のタイトル表記 (M1 の動作確認用) ------------------------------
  const title = new Text({
    text: "大玉トマト農園",
    style: new TextStyle({
      fontFamily: "system-ui, sans-serif",
      fontSize: 28,
      fontWeight: "700",
      fill: "#f4ecd8",
      stroke: { color: "#1a1620", width: 4 },
      align: "center",
    }),
  });
  title.anchor.set(0.5);
  title.position.set(app.screen.width / 2, app.screen.height / 2 - 24);
  root.addChild(title);

  const sub = new Text({
    text: "M1: skeleton ready (Vite + TS + PixiJS)",
    style: new TextStyle({
      fontFamily: "system-ui, sans-serif",
      fontSize: 13,
      fill: "#f0c440",
    }),
  });
  sub.anchor.set(0.5);
  sub.position.set(app.screen.width / 2, app.screen.height / 2 + 16);
  root.addChild(sub);

  // ----- HUD を最初の GameState で描画 -----------------------------------
  const state = createInitialState();
  mountHud();
  renderHud(state);
}

bootstrap().catch((err: unknown) => {
  console.error("Failed to bootstrap:", err);
});
