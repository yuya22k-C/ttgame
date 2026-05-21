"""ハウス内部床タイル生成スクリプト.

要件定義 11.1 の「ビニールハウス外観 + 内部床」のうち内部床を生成.
2 種類を出力:
  - concrete : コンクリート通路 (作業導線)
  - bed      : 栽培ベッド (耕した土に畝)

シームレスタイリング対応 (mod 32 巻き付け).

実行: python3 scripts/gen_greenhouse_floor.py
出力:
  assets/sprites/greenhouse/floor_{concrete,bed}.png
  assets/sprites/greenhouse/floor_preview.png  (3×3 タイリング)
"""

from __future__ import annotations

import os
import random
from PIL import Image, ImageDraw

T = 32

# ---- パレット ---------------------------------------------------------------
CON_BASE = (198, 192, 178, 255)
CON_DARK = (148, 144, 132, 255)
CON_LIGHT = (228, 224, 212, 255)
CON_CRACK = (110, 104, 92, 255)

BED_BASE = (122, 80, 48, 255)   # 栽培土 (やや赤茶)
BED_DARK = (82, 50, 28, 255)
BED_LIGHT = (160, 116, 76, 255)
BED_FURROW = (62, 38, 22, 255)  # 畝の谷の影
BED_WET = (54, 32, 18, 255)     # 湿った土


def wrap_put(img: Image.Image, x: int, y: int, color: tuple) -> None:
    img.putpixel((x % T, y % T), color)


def make_concrete() -> Image.Image:
    img = Image.new("RGBA", (T, T), CON_BASE)
    rng = random.Random(101)

    # コンクリのざらつき (暗い点)
    for _ in range(60):
        x, y = rng.randint(0, T - 1), rng.randint(0, T - 1)
        wrap_put(img, x, y, CON_DARK)
    # ハイライト
    for _ in range(40):
        x, y = rng.randint(0, T - 1), rng.randint(0, T - 1)
        wrap_put(img, x, y, CON_LIGHT)
    # スラブの目地 (上端と左端に 1 px ライン) でタイルの境界を演出
    for x in range(T):
        img.putpixel((x, 0), CON_CRACK)
    for y in range(T):
        img.putpixel((0, y), CON_CRACK)
    # ひび割れ風の短い線を 1〜2 本
    for cx, cy in [(8, 14), (22, 6)]:
        for d in range(4):
            wrap_put(img, cx + d, cy + d // 2, CON_CRACK)
    return img


def make_bed() -> Image.Image:
    img = Image.new("RGBA", (T, T), BED_BASE)
    rng = random.Random(102)

    # 横方向の畝 (8 px ピッチで畝の谷)
    for y in (3, 11, 19, 27):
        for x in range(T):
            img.putpixel((x, y), BED_FURROW)
            img.putpixel((x, (y + 1) % T), BED_DARK)
        # 畝の頂部 (1 px 上) は明るく
        for x in range(T):
            img.putpixel((x, (y - 1) % T), BED_LIGHT)

    # 土塊の散らし
    for _ in range(36):
        x, y = rng.randint(0, T - 1), rng.randint(0, T - 1)
        wrap_put(img, x, y, BED_DARK)
        if rng.random() < 0.3:
            wrap_put(img, x + 1, y, BED_DARK)
    # 明色斑
    for _ in range(20):
        x, y = rng.randint(0, T - 1), rng.randint(0, T - 1)
        wrap_put(img, x, y, BED_LIGHT)
    # 湿り気
    for _ in range(8):
        x, y = rng.randint(0, T - 1), rng.randint(0, T - 1)
        wrap_put(img, x, y, BED_WET)
        wrap_put(img, x + 1, y, BED_WET)
    return img


def gen_preview(tiles: dict[str, Image.Image]) -> Image.Image:
    scale = 2
    margin = 10
    label_h = 14
    cell_w = T * 3 * scale + margin
    cell_h = T * 3 * scale + margin + label_h
    n = len(tiles)
    out = Image.new("RGBA", (cell_w * n + margin, cell_h + margin), (244, 240, 232, 255))
    draw = ImageDraw.Draw(out)
    for i, (name, img) in enumerate(tiles.items()):
        tiled = Image.new("RGBA", (T * 3, T * 3), (0, 0, 0, 0))
        for r in range(3):
            for c in range(3):
                tiled.paste(img, (c * T, r * T))
        big = tiled.resize((T * 3 * scale, T * 3 * scale), Image.NEAREST)
        x = margin + i * cell_w
        y = margin + label_h
        out.paste(big, (x, y), big)
        draw.text((x + 4, y - label_h), name, fill=(40, 36, 32, 255))
    return out


def main() -> None:
    out_dir = os.path.join(os.path.dirname(__file__), "..", "assets", "sprites", "greenhouse")
    out_dir = os.path.normpath(out_dir)
    os.makedirs(out_dir, exist_ok=True)

    tiles = {
        "concrete": make_concrete(),
        "bed": make_bed(),
    }
    for name, img in tiles.items():
        path = os.path.join(out_dir, f"floor_{name}.png")
        img.save(path, "PNG")
        print(f"wrote {path}")

    preview = gen_preview(tiles)
    preview.save(os.path.join(out_dir, "floor_preview.png"), "PNG")
    print(f"wrote {os.path.join(out_dir, 'floor_preview.png')}")


if __name__ == "__main__":
    main()
