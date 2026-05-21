"""地面タイル生成スクリプト.

要件定義 11.1 の「農園地面タイル (土・草・道)」+ 水タイルを生成.
1タイル = 32×32 px / シームレスタイリング対応 (座標を mod 32 で巻き付け).

実行: python3 scripts/gen_ground_tiles.py
出力:
  assets/sprites/ground/{grass,soil,path,water}.png
  assets/sprites/ground/preview.png  (3×3 で並べた繋ぎ目確認用)
"""

from __future__ import annotations

import os
import random
from PIL import Image, ImageDraw

T = 32  # タイル辺長

# ---- パレット ---------------------------------------------------------------
GRASS_BASE = (108, 172, 86, 255)
GRASS_DARK = (72, 130, 56, 255)
GRASS_LIGHT = (158, 206, 112, 255)
FLOWER_W = (250, 248, 222, 255)
FLOWER_Y = (240, 210, 80, 255)

SOIL_BASE = (134, 92, 60, 255)
SOIL_DARK = (94, 60, 36, 255)
SOIL_LIGHT = (178, 134, 88, 255)
STONE = (90, 78, 72, 255)
STONE_HL = (140, 130, 120, 255)

PATH_BASE = (176, 170, 158, 255)
PATH_DARK = (120, 112, 98, 255)
PATH_LIGHT = (210, 204, 190, 255)
PATH_MORTAR = (66, 60, 52, 255)

WATER_BASE = (76, 144, 200, 255)
WATER_LIGHT = (132, 196, 240, 255)
WATER_DARK = (44, 102, 156, 255)
WATER_HL = (228, 244, 252, 255)


def wrap_put(img: Image.Image, x: int, y: int, color: tuple) -> None:
    """シームレス用に座標を mod 32 で巻き付けて putpixel."""
    img.putpixel((x % T, y % T), color)


# ---- grass (草) -----------------------------------------------------------
def make_grass() -> Image.Image:
    img = Image.new("RGBA", (T, T), GRASS_BASE)
    rng = random.Random(42)

    # 暗い草の房 (L 字 3 px)
    for _ in range(22):
        x, y = rng.randint(0, T - 1), rng.randint(0, T - 1)
        wrap_put(img, x, y, GRASS_DARK)
        wrap_put(img, x + 1, y, GRASS_DARK)
        wrap_put(img, x, y + 1, GRASS_DARK)

    # 明るいハイライト点
    for _ in range(20):
        x, y = rng.randint(0, T - 1), rng.randint(0, T - 1)
        wrap_put(img, x, y, GRASS_LIGHT)

    # 小さい花 (黄 + 白の十字)
    fx, fy = 10, 22
    wrap_put(img, fx, fy, FLOWER_Y)
    wrap_put(img, fx - 1, fy, FLOWER_W)
    wrap_put(img, fx + 1, fy, FLOWER_W)
    wrap_put(img, fx, fy - 1, FLOWER_W)
    wrap_put(img, fx, fy + 1, FLOWER_W)

    # 反対側にもう一輪 (繋ぎ目検証用にもなる)
    fx, fy = 26, 7
    wrap_put(img, fx, fy, FLOWER_W)
    wrap_put(img, fx - 1, fy, FLOWER_Y)
    wrap_put(img, fx + 1, fy, FLOWER_Y)
    wrap_put(img, fx, fy - 1, FLOWER_Y)
    wrap_put(img, fx, fy + 1, FLOWER_Y)

    return img


# ---- soil (土) ------------------------------------------------------------
def make_soil() -> Image.Image:
    img = Image.new("RGBA", (T, T), SOIL_BASE)
    rng = random.Random(43)

    for _ in range(34):
        x, y = rng.randint(0, T - 1), rng.randint(0, T - 1)
        wrap_put(img, x, y, SOIL_DARK)
        if rng.random() < 0.4:
            wrap_put(img, x + 1, y, SOIL_DARK)

    for _ in range(22):
        x, y = rng.randint(0, T - 1), rng.randint(0, T - 1)
        wrap_put(img, x, y, SOIL_LIGHT)

    # 小石を 2 個
    for cx, cy in [(8, 12), (22, 24)]:
        for dx, dy in [(0, 0), (1, 0), (0, 1), (1, 1)]:
            wrap_put(img, cx + dx, cy + dy, STONE)
        wrap_put(img, cx, cy, STONE_HL)

    return img


# ---- path (敷石) ----------------------------------------------------------
def make_path() -> Image.Image:
    img = Image.new("RGBA", (T, T), PATH_BASE)
    rng = random.Random(44)

    # 3×3 敷石 (10px stone + 1px mortar × 2 + 10 = 32)
    # 縦目地 x=10, 21 / 横目地 y=10, 21
    for x in (10, 21):
        for y in range(T):
            img.putpixel((x, y), PATH_MORTAR)
    for y in (10, 21):
        for x in range(T):
            img.putpixel((x, y), PATH_MORTAR)
    # 端の目地 (シームレス用に行 0 と列 0 も区切る)
    for x in range(T):
        img.putpixel((x, 0), PATH_MORTAR)
    for y in range(T):
        img.putpixel((0, y), PATH_MORTAR)

    # 各敷石にテクスチャを散らす
    stones = [(1, 1), (12, 1), (23, 1), (1, 12), (12, 12), (23, 12), (1, 23), (12, 23), (23, 23)]
    for sx, sy in stones:
        for _ in range(10):
            dx = rng.randint(0, 8)
            dy = rng.randint(0, 8)
            c = rng.choice([PATH_DARK, PATH_BASE, PATH_BASE, PATH_LIGHT])
            img.putpixel((sx + dx, sy + dy), c)
        # 左上ハイライト
        img.putpixel((sx + 1, sy + 1), PATH_LIGHT)

    return img


# ---- water (水) -----------------------------------------------------------
def make_water() -> Image.Image:
    img = Image.new("RGBA", (T, T), WATER_BASE)
    rng = random.Random(45)

    # 波 (明るい線 + 直下に暗い線のペア)
    for _ in range(7):
        y = rng.randint(0, T - 1)
        x = rng.randint(0, T - 1)
        length = rng.randint(4, 9)
        for i in range(length):
            wrap_put(img, x + i, y, WATER_LIGHT)
        for i in range(length):
            wrap_put(img, x + i, y + 1, WATER_DARK)

    # キラめき
    for _ in range(8):
        x, y = rng.randint(0, T - 1), rng.randint(0, T - 1)
        wrap_put(img, x, y, WATER_HL)

    return img


# ---- 出力 ----------------------------------------------------------------
def gen_tiling_preview(img: Image.Image, label: str) -> Image.Image:
    """3×3 並べた繋ぎ目チェック用プレビュー."""
    tiled = Image.new("RGBA", (T * 3, T * 3), (0, 0, 0, 0))
    for r in range(3):
        for c in range(3):
            tiled.paste(img, (c * T, r * T))
    scale = 3
    big = tiled.resize((T * 3 * scale, T * 3 * scale), Image.NEAREST)
    return big


def gen_combined_preview(tiles: dict[str, Image.Image]) -> Image.Image:
    """全タイルを 3×3 連結し横に並べたプレビュー."""
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
    out_dir = os.path.join(os.path.dirname(__file__), "..", "assets", "sprites", "ground")
    out_dir = os.path.normpath(out_dir)
    os.makedirs(out_dir, exist_ok=True)

    tiles = {
        "grass": make_grass(),
        "soil": make_soil(),
        "path": make_path(),
        "water": make_water(),
    }
    for name, img in tiles.items():
        path = os.path.join(out_dir, f"{name}.png")
        img.save(path, "PNG")
        print(f"wrote {path}")

    preview = gen_combined_preview(tiles)
    preview.save(os.path.join(out_dir, "preview.png"), "PNG")
    print(f"wrote {os.path.join(out_dir, 'preview.png')}")


if __name__ == "__main__":
    main()
