import { Application, Container } from "pixi.js";
import { FERTILIZER_COST, GRID_H, GRID_W, TILE_SIZE } from "@/config/balance";
import { effectiveGreenhouseCost, placeGreenhouse } from "@/game/farm";
import { allocateSkill } from "@/game/player";
import { shipAll, shipGrade } from "@/game/shipping";
import { createInitialState, type GameState, type Greenhouse } from "@/game/state";
import { tick } from "@/game/tick";
import { effectiveSeedCost, fertilizePlot, harvestPlot, plantSeed, waterPlot } from "@/game/tomato";
import { FarmView } from "@/render/farmView";
import { HouseView, type HouseAction } from "@/render/houseView";
import { loadSprites } from "@/render/sprites";
import { mountHud, renderHud } from "@/ui/hud";
import { mountMenu, setBuildButtonActive } from "@/ui/menu";
import {
  hideShipping,
  isShippingOpen,
  mountShippingModal,
  renderShipping,
  showShipping,
} from "@/ui/shipping";
import { decode, encode } from "@/save/codec";
import { clearAuto, flushPendingSave, loadAuto, scheduleSave } from "@/save/storage";
import { hideSettings, mountSettingsModal, showSettings } from "@/ui/settings";
import { mountSpeedControls, refresh as refreshSpeed } from "@/ui/speed";
import {
  hideStatus,
  isStatusOpen,
  mountStatusModal,
  renderStatus,
  showStatus,
} from "@/ui/status";
import { showToast } from "@/ui/toast";

type Scene = "farm" | "house";

async function bootstrap(): Promise<void> {
  const stageEl = document.getElementById("stage");
  if (!(stageEl instanceof HTMLElement)) throw new Error("#stage element not found");

  const VIEW_W = GRID_W * TILE_SIZE;
  const VIEW_H = GRID_H * TILE_SIZE;

  const app = new Application();
  await app.init({
    width: VIEW_W,
    height: VIEW_H,
    background: "#3d6b3d",
    antialias: false,
    roundPixels: true,
    autoDensity: false,
    resolution: 1,
  });
  stageEl.appendChild(app.canvas);

  const sprites = await loadSprites();

  // ---- セーブからロード or 新規開始 ------------------------------------
  let state: GameState;
  const loaded = loadAuto();
  if (loaded.ok) {
    state = loaded.state;
    // 経過時間の暴走を避けるため lastTickAt は現在に揃える (オフライン進行は MVP では行わない)
    state = { ...state, clock: { ...state.clock, lastTickAt: performance.now() } };
  } else {
    state = createInitialState();
    state.clock.lastTickAt = performance.now();
  }
  let buildMode = false;
  let scene: Scene = "farm";
  let openHouseId: string | null = null;

  // ---- Pixi シーン構成 ------------------------------------------------
  const root = new Container();
  app.stage.addChild(root);
  const farmView = new FarmView({
    sprites,
    onCellClick: (gx, gy) => handleFarmCellClick(gx, gy),
  });
  root.addChild(farmView.root);
  farmView.renderBuildings(state.farm);

  const houseView = new HouseView({
    sprites,
    viewWidth: VIEW_W,
    viewHeight: VIEW_H,
    onAction: (action, plotId) => handleHouseAction(action, plotId),
  });
  houseView.setVisible(false);
  root.addChild(houseView.root);

  // ---- UI 接続 -------------------------------------------------------
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
    build: () => toggleBuildMode(),
    ship: () => {
      showShipping(state);
    },
    status: () => {
      showStatus(state);
    },
    settings: () => {
      showSettings();
    },
  });
  mountSettingsModal({
    export: () => encode(state),
    import: (code) => {
      const r = decode(code);
      if (!r.ok) {
        showToast(`インポート失敗: ${r.message}`);
        return false;
      }
      state = { ...r.state, clock: { ...r.state.clock, lastTickAt: performance.now() } };
      farmView.renderBuildings(state.farm);
      farmView.renderOverlay(state);
      renderHud(state);
      scheduleSave(state, 0); // 即座に上書き
      showToast(r.checksumOk ? "インポート完了" : "インポート完了 (整合性警告)");
      return true;
    },
    reset: () => {
      clearAuto();
      state = createInitialState();
      state.clock.lastTickAt = performance.now();
      buildMode = false;
      setBuildButtonActive(false);
      farmView.renderBuildings(state.farm);
      farmView.setBuildMode(false, state);
      renderHud(state);
      hideSettings();
      showToast("新規ゲームを開始しました");
    },
    close: () => hideSettings(),
  });
  mountStatusModal({
    allocate: (skill) => {
      const r = allocateSkill(state.player, skill);
      if (!r.ok) {
        showToast("スキルポイントがありません");
        return;
      }
      state = { ...state, player: r.player };
      renderStatus(state);
      renderHud(state);
    },
    close: () => hideStatus(),
  });
  mountShippingModal({
    shipGrade: (grade) => {
      const r = shipGrade(state, grade);
      if (r.revenue === 0) {
        showToast("在庫がありません");
        return;
      }
      state = r.state;
      renderHud(state);
      renderShipping(state);
      showToast(`グレード ${grade} を出荷 (+¥${r.revenue.toLocaleString("ja-JP")})`);
    },
    shipAll: () => {
      const r = shipAll(state);
      if (r.revenue === 0) {
        showToast("在庫がありません");
        return;
      }
      state = r.state;
      renderHud(state);
      renderShipping(state);
      showToast(`全て出荷 (+¥${r.revenue.toLocaleString("ja-JP")})`);
    },
    close: () => hideShipping(),
  });

  function toggleBuildMode(): void {
    if (scene !== "farm") return;
    buildMode = !buildMode;
    setBuildButtonActive(buildMode);
    farmView.setBuildMode(buildMode, state);
    if (buildMode) {
      const cost = effectiveGreenhouseCost(state);
      showToast(`空きマスをタップして配置 (¥${cost.toLocaleString("ja-JP")})`);
    }
  }

  function handleFarmCellClick(gx: number, gy: number): void {
    if (buildMode) {
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
      const cost = state.cash - result.state.cash;
      state = result.state;
      farmView.renderBuildings(state.farm);
      farmView.renderOverlay(state);
      renderHud(state);
      showToast(`ハウスを建設しました (-¥${cost.toLocaleString("ja-JP")})`);
      return;
    }

    // 通常モード: クリックしたマスにあるハウスを開く
    const hit = findGreenhouseAt(state.farm.greenhouses, gx, gy);
    if (hit) openHouse(hit);
  }

  function openHouse(gh: Greenhouse): void {
    scene = "house";
    openHouseId = gh.id;
    houseView.show(gh);
    farmView.root.visible = false;
  }

  function closeHouse(): void {
    scene = "farm";
    openHouseId = null;
    houseView.setVisible(false);
    farmView.root.visible = true;
  }

  function handleHouseAction(action: HouseAction, plotId: string | null): void {
    if (action === "close") {
      closeHouse();
      return;
    }
    if (!openHouseId) return;
    if (!plotId) {
      showToast("プロットを選択してください");
      return;
    }
    if (action === "harvest") {
      const r = harvestPlot(state, openHouseId, plotId);
      if (!r.ok) {
        const msg =
          r.reason === "not_ready_to_harvest"
            ? "まだ収穫できません"
            : r.reason === "not_planted"
              ? "何も植えられていません"
              : "操作できません";
        showToast(msg);
        return;
      }
      state = r.state;
      renderHud(state);
      refreshOpenHouse();
      showToast(`収穫: ${r.grade} ${r.kg}kg (+${r.expGained} EXP)`);
      if (r.levelsGained > 0) {
        showToast(`レベルアップ! Lv ${state.player.level} (+${r.levelsGained} SP)`, 2400);
      }
      return;
    }
    let result;
    switch (action) {
      case "plant":
        result = plantSeed(state, openHouseId, plotId);
        break;
      case "water":
        result = waterPlot(state, openHouseId, plotId);
        break;
      case "fertilize":
        result = fertilizePlot(state, openHouseId, plotId);
        break;
    }
    if (!result.ok) {
      const msg =
        result.reason === "not_enough_cash"
          ? "資金が足りません"
          : result.reason === "already_planted"
            ? "すでに植えられています"
            : result.reason === "not_planted"
              ? "何も植えられていません"
              : "操作できません";
      showToast(msg);
      return;
    }
    state = result.state;
    renderHud(state);
    refreshOpenHouse();
    if (action === "plant") {
      const cost = effectiveSeedCost(state);
      showToast(`種を撒きました (-¥${cost})`);
    } else if (action === "fertilize") {
      showToast(`追肥しました (-¥${FERTILIZER_COST})`);
    }
  }

  function refreshOpenHouse(): void {
    if (!openHouseId) return;
    const gh = state.farm.greenhouses.find((g) => g.id === openHouseId);
    if (gh) houseView.refresh(gh);
  }

  // ---- rAF ループ -----------------------------------------------------
  let last = performance.now();
  let hudAccum = 0;
  let houseAccum = 0;
  let saveAccum = 0;
  const HUD_REFRESH_MS = 100;
  const HOUSE_REFRESH_MS = 250;
  const SAVE_INTERVAL_MS = 5000;
  function loop(now: number): void {
    const delta = now - last;
    last = now;
    state = tick(state, delta, now);
    hudAccum += delta;
    houseAccum += delta;
    saveAccum += delta;
    if (saveAccum >= SAVE_INTERVAL_MS) {
      saveAccum = 0;
      scheduleSave(state);
    }
    if (hudAccum >= HUD_REFRESH_MS) {
      hudAccum = 0;
      renderHud(state);
    }
    if (scene === "house" && houseAccum >= HOUSE_REFRESH_MS) {
      houseAccum = 0;
      refreshOpenHouse();
    }
    if (isShippingOpen() && hudAccum === 0) {
      renderShipping(state);
    }
    if (isStatusOpen() && hudAccum === 0) {
      renderStatus(state);
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // タブを閉じる/離れるときに最後のセーブを確実にする
  window.addEventListener("beforeunload", () => flushPendingSave(state));
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushPendingSave(state);
  });
}

function findGreenhouseAt(
  greenhouses: Greenhouse[],
  gx: number,
  gy: number,
): Greenhouse | undefined {
  return greenhouses.find(
    (gh) =>
      gx >= gh.position.x &&
      gx < gh.position.x + gh.size.w &&
      gy >= gh.position.y &&
      gy < gh.position.y + gh.size.h,
  );
}

bootstrap().catch((err: unknown) => {
  console.error("Failed to bootstrap:", err);
});
