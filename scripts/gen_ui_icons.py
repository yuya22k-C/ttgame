"""UI アイコン生成スクリプト.

要件定義 6 章で要求される主要アクション/メニュー用の 16×16 アイコンを 8 個生成.
ASCII グリッド方式 (トマトと同じ作法).

実行: python3 scripts/gen_ui_icons.py
出力:
  assets/sprites/ui/{water,fertilizer,harvest,ship,coin,settings,warning,build}.png
  assets/sprites/ui/sheet.png  (横並びシート)
  assets/sprites/ui/preview.png (拡大プレビュー)
"""

from __future__ import annotations

import os
from PIL import Image, ImageDraw

W = H = 16

PALETTE: dict[str, tuple[int, int, int, int]] = {
    ".": (0, 0, 0, 0),
    "o": (28, 22, 26, 255),       # アウトライン
    # water
    "W": (76, 144, 220, 255),     # 水 (青)
    "w": (190, 222, 250, 255),    # 水 (ハイライト)
    "B": (40, 92, 168, 255),      # 水 (影)
    # fertilizer
    "F": (218, 188, 132, 255),    # 袋 (クリーム)
    "f": (170, 130, 80, 255),     # 袋 (影)
    "T": (132, 90, 50, 255),      # 紐
    "k": (108, 80, 50, 255),      # 袋の質感点
    # harvest (tomato)
    "R": (200, 56, 48, 255),      # トマト (赤)
    "r": (236, 92, 80, 255),      # トマト (明)
    "p": (255, 168, 156, 255),    # トマト (ハイライト)
    "g": (120, 168, 70, 255),     # ヘタ (明)
    "G": (66, 122, 56, 255),      # ヘタ (濃)
    # ship (truck)
    "C": (244, 244, 244, 255),    # キャビン
    "X": (118, 162, 218, 255),    # 窓
    "L": (190, 132, 78, 255),     # 荷台
    "l": (138, 88, 44, 255),      # 荷台 (影)
    "Z": (40, 40, 40, 255),       # タイヤ
    "z": (80, 80, 80, 255),       # ホイール
    # coin
    "Y": (240, 196, 64, 255),     # 金
    "y": (252, 232, 130, 255),    # 金 (ハイライト)
    "u": (180, 130, 36, 255),     # 金 (影)
    # warning
    "E": (220, 60, 56, 255),      # 警告赤
    "M": (255, 240, 80, 255),     # 警告黄
    # build (hammer)
    "K": (148, 148, 156, 255),    # 金属
    "j": (200, 200, 210, 255),    # 金属ハイライト
    "N": (88, 56, 32, 255),       # 木目
    "n": (140, 92, 50, 255),      # 木目ハイライト
    # settings (gear) — uses K/j/g colors
}

# ---- 1. water (水やり) -----------------------------------------------------
WATER = [
    "................",
    ".......o........",
    ".......o........",
    "......oWo.......",
    "......oWo.......",
    ".....owWWo......",
    ".....oWWWo......",
    "....owWWWWo.....",
    "....oWWWWWo.....",
    "...owWWWWWBo....",
    "...oWWWWWBBo....",
    "...oWWWWBBBo....",
    "...oWWWBBBWo....",
    "....oWWBBWo.....",
    ".....oWWWo......",
    "......ooo.......",
]

# ---- 2. fertilizer (肥料) --------------------------------------------------
FERTILIZER = [
    "................",
    "......ooo.......",
    ".....oTTTo......",
    "....ooooooo.....",
    "...oFfFFFfFo....",
    "..oFFFFFFFFFo...",
    "..oFkFFFFFkFo...",
    "..oFFFFkFFFFo...",
    "..oFFkFFFFkFo...",
    "..oFFFFFkFFFo...",
    "..oFkFFFFFFFo...",
    "..oFFFFkFFkFo...",
    "..oFffFFFffFo...",
    "..oFFFFFFFFFo...",
    "...oooooooo.....",
    "................",
]

# ---- 3. harvest (収穫トマト) -----------------------------------------------
HARVEST = [
    "................",
    "................",
    ".......gg.......",
    "......ggSg......",
    ".....oogggoo....",
    "....oGggGggGo...",
    "...oGGggGggGGo..",
    "..oRRRRRRRRRRo..",
    "..oRprrrrrrRRo..",
    ".oRrprrrrrrrRo..",
    ".oRrrrrrrrrrRo..",
    ".oRrrrrrrrrrRo..",
    "..oRrrrrrrrrRo..",
    "..oRRrrrrrrRo...",
    "...oRRRRRRRRo...",
    "....oooooooo....",
]
# 'S' は使わないが空キーを避けるため透明に置換
HARVEST = [row.replace("S", "g") for row in HARVEST]

# ---- 4. ship (出荷トラック) ------------------------------------------------
SHIP = [
    "................",
    "................",
    "................",
    "........oooo....",
    ".......oCCCCo...",
    ".......oCXXCo...",
    "...ooooooCCCo...",
    "..oLLLLLLLLLLo..",
    "..oLLLLLLLLLLo..",
    "..oLlllllllLLo..",
    "..oLLLLLLLLLLo..",
    "..oooooooooooo..",
    "....oZo...oZo...",
    "...oZzZo.oZzZo..",
    "...oZzZo.oZzZo..",
    "....oZo...oZo...",
]

# ---- 5. coin (お金) --------------------------------------------------------
COIN = [
    "................",
    "................",
    ".....ooooo......",
    "....oYyYYYo.....",
    "...oYyYYYYYo....",
    "..oYyYYYYuYo....",
    "..oYYYYYYYuo....",
    "..oYYYyyyYuo....",
    "..oYYYyYYYuo....",
    "..oYYyyyyYuo....",
    "..oYYYYYYYuo....",
    "..oYYYYYYuuo....",
    "...oYYYYuuo.....",
    "....oYYuuo......",
    ".....ooooo......",
    "................",
]

# ---- 6. settings (≡ メニュー) ----------------------------------------------
# 16×16 では歯車は潰れるためハンバーガーメニュー (3本横棒) で代用.
# UI上は「メニュー/設定」として広く認識される.
SETTINGS = [
    "................",
    "................",
    "...oooooooooo...",
    "...oggggggggo...",
    "...oooooooooo...",
    "................",
    "...oooooooooo...",
    "...oggggggggo...",
    "...oooooooooo...",
    "................",
    "...oooooooooo...",
    "...oggggggggo...",
    "...oooooooooo...",
    "................",
    "................",
    "................",
]

# settings の 'g' は金属色で描画する.
PALETTE_GEAR = (164, 168, 176, 255)

# ---- 7. warning (! マーク) -------------------------------------------------
WARNING = [
    "................",
    "................",
    ".....ooooo......",
    "....oEEEEEo.....",
    "...oEEMMMEEo....",
    "..oEEEMMMEEEo...",
    "..oEEEMMMEEEo...",
    "..oEEEMMMEEEo...",
    "..oEEEMMMEEEo...",
    "..oEEEEMEEEEo...",
    "..oEEEEEEEEEo...",
    "..oEEEMMMEEEo...",
    "..oEEEMMMEEEo...",
    "...oEEEEEEEo....",
    "....oEEEEEo.....",
    ".....ooooo......",
]

# ---- 8. build (建設ハンマー) -----------------------------------------------
BUILD = [
    "................",
    "................",
    ".....oooooo.....",
    "....oKjKKKKo....",
    "...oKjKKKKKKo...",
    "...oKKKKKKKKo...",
    "...oKKKKKKKKo...",
    "....oKKKKKKo....",
    ".....ooKKoo.....",
    "......oNNo......",
    "......oNno......",
    "......oNNo......",
    "......oNNo......",
    "......oNno......",
    "......oNNo......",
    "......oooo......",
]


def render(rows: list[str], name: str) -> Image.Image:
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            color = PALETTE.get(ch, (0, 0, 0, 0))
            # 歯車だけ 'g' を金属色に上書き
            if name == "settings" and ch == "g":
                color = PALETTE_GEAR
            img.putpixel((x, y), color)
    return img


def gen_sheet(images: list[Image.Image]) -> Image.Image:
    sheet = Image.new("RGBA", (W * len(images), H), (0, 0, 0, 0))
    for i, img in enumerate(images):
        sheet.paste(img, (i * W, 0), img)
    return sheet


def gen_preview(items: list[tuple[str, Image.Image]]) -> Image.Image:
    scale = 5
    margin = 8
    cell_w = W * scale + margin
    out_h = H * scale + margin * 2
    out = Image.new("RGBA", (cell_w * len(items) + margin, out_h), (244, 240, 232, 255))
    for i, (_, img) in enumerate(items):
        big = img.resize((W * scale, H * scale), Image.NEAREST)
        out.paste(big, (margin + i * cell_w, margin), big)
    return out


def main() -> None:
    out_dir = os.path.join(os.path.dirname(__file__), "..", "assets", "sprites", "ui")
    out_dir = os.path.normpath(out_dir)
    os.makedirs(out_dir, exist_ok=True)

    specs = [
        ("water", WATER),
        ("fertilizer", FERTILIZER),
        ("harvest", HARVEST),
        ("ship", SHIP),
        ("coin", COIN),
        ("settings", SETTINGS),
        ("warning", WARNING),
        ("build", BUILD),
    ]

    # 全行 16 幅・16 行に揃える
    for name, rows in specs:
        assert len(rows) == H, f"{name}: rows={len(rows)} (need {H})"
        for i, r in enumerate(rows):
            assert len(r) == W, f"{name}[{i}]: width={len(r)} (need {W}): {r!r}"

    images: list[tuple[str, Image.Image]] = []
    for name, rows in specs:
        img = render(rows, name)
        path = os.path.join(out_dir, f"{name}.png")
        img.save(path, "PNG")
        print(f"wrote {path}")
        images.append((name, img))

    sheet = gen_sheet([img for _, img in images])
    sheet.save(os.path.join(out_dir, "sheet.png"), "PNG")
    print(f"wrote {os.path.join(out_dir, 'sheet.png')}")

    preview = gen_preview(images)
    preview.save(os.path.join(out_dir, "preview.png"), "PNG")
    print(f"wrote {os.path.join(out_dir, 'preview.png')}")


if __name__ == "__main__":
    main()
