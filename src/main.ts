import { Application, Container } from "pixi.js";
import { GREENHOUSE_COST, GRID_H, GRID_W, TILE_SIZE } from "@/config/balance";
import { placeGreenhouse } from "@/game/farm";
import { createInitialState, type GameState } from "@/game/state";
import { tick } from "@/game/tick";
import { FarmView } from "@/render/farmView";
import { loadSprites } from "@/render/sprites";
import { mountHud, renderHud } from "@/ui/hud";
import { mountMenu, setBuildButtonActive } from "@/ui/menu";
import { mountSpeedControls, refresh as refreshSpeed } from "@/ui/speed";
import { showToast } from "@/ui/toast";

async function bootstrap(): Promise<void> {
  const stageEl = document.getElementById("stage");
  if (!(stageEl instanceof HTMLElement)) throw new Error("#stage element not found");

  // Pixi セットアップ
  const app = new Application();
  await app.init({
    width: GRID_W * TILE_SIZE,
    height: GRID_H * TILE_SIZE,
    background: "#3d6b3d",
    antialias: false,
    roundPixels: true,
    autoDensity: false,
    resolution: 1,
  });
  stageEl.appendChild(app.canvas);

  // アセット読み込み
  const sprites = await loadSprites();

  // ----- State + Build mode flag --------------------------------------
  let state: GameState = createInitialState();
  state.clock.lastTickAt = performance.now();
  let buildMode = false;

  const root = new Container();
  app.stage.addChild(root);
  const farmView = new FarmView({
    sprites,
    onCellClick: (gx, gy) => handleCellClick(gx, gy),
  });
  root.addChild(farmView.root);
  farmView.renderBuildings(state.farm);

  // ----- UI 接続 -------------------------------------------------------
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
  mountMenu({
    build: () => {
      buildMode = !buildMode;
      setBuildButtonActive(buildMode);
      farmView.setBuildMode(buildMode, state);
      if (buildMode) {
        showToast(`空きマスをタップして配置 (¥${GREENHOUSE_COST.toLocaleString("ja-JP")})`);
      }
    },
  });

  function handleCellClick(gx: number, gy: number): void {
    if (!buildMode) return;
    const result = placeGreenhouse(state, gx, gy);
    if (!result.ok) {
      const msg =
        result.reason === "not_enough_cash"
          ? "資金が足りません"
          : result.reason === "overlap"
            ? "他のハウスと重なります"
            : "ここには建てられません";
      showToast(msg);
      return;
    }
    state = result.state;
    farmView.renderBuildings(state.farm);
    farmView.renderOverlay(state);
    renderHud(state);
    showToast(`ハウスを建設しました (-¥${GREENHOUSE_COST.toLocaleString("ja-JP")})`);
  }

  // ----- rAF ループ -----------------------------------------------------
  let last = performance.now();
  let hudAccum = 0;
  const HUD_REFRESH_MS = 100;
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
