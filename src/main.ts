import { Application, Container, Text, TextStyle } from "pixi.js";
import { createInitialState, type GameState } from "@/game/state";
import { tick } from "@/game/tick";
import { mountHud, renderHud } from "@/ui/hud";
import { mountSpeedControls, refresh as refreshSpeed } from "@/ui/speed";

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

  // ----- 仮の中央表示 (M3 のマップ描画で置き換える) ----------------------
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
    text: "M2: realtime clock running (1 real sec = 3 game min)",
    style: new TextStyle({
      fontFamily: "system-ui, sans-serif",
      fontSize: 12,
      fill: "#f0c440",
    }),
  });
  sub.anchor.set(0.5);
  sub.position.set(app.screen.width / 2, app.screen.height / 2 + 16);
  root.addChild(sub);

  // ----- State + UI bootstrap ------------------------------------------
  let state: GameState = createInitialState();
  state.clock.lastTickAt = performance.now();

  mountHud();
  renderHud(state);
  mountSpeedControls(
    () => state,
    (speed) => {
      state = { ...state, clock: { ...state.clock, speed } };
      refreshSpeed(state);
      renderHud(state);
    },
  );

  // ----- rAF ループ -----------------------------------------------------
  let last = performance.now();
  let hudAccum = 0;
  const HUD_REFRESH_MS = 100; // HUD は 10fps で十分

  function loop(now: number): void {
    const delta = now - last;
    last = now;
    state = tick(state, delta, now);
    hudAccum += delta;
    if (hudAccum >= HUD_REFRESH_MS) {
      hudAccum = 0;
      renderHud(state);
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

bootstrap().catch((err: unknown) => {
  console.error("Failed to bootstrap:", err);
});
