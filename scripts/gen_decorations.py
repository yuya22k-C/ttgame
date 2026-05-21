"""装飾物アセット生成スクリプト.

農園マップに置く小物 4 種を生成:
  - tree  : 32×32 px 小さな木
  - fence : 32×16 px 木製フェンス (横長)
  - sign  : 32×32 px 看板 (杭+板)
  - well  : 32×32 px 井戸 (給水イメージ)

実行: python3 scripts/gen_decorations.py
出力:
  assets/sprites/decorations/{tree,fence,sign,well}.png
  assets/sprites/decorations/preview.png
"""

from __future__ import annotations

import os
from PIL import Image, ImageDraw

PALETTE: dict[str, tuple[int, int, int, int]] = {
    ".": (0, 0, 0, 0),
    "o": (28, 22, 26, 255),       # アウトライン
    # tree
    "G": (66, 122, 56, 255),      # 葉 (濃)
    "g": (112, 178, 88, 255),     # 葉
    "h": (188, 224, 132, 255),    # 葉 (ハイライト)
    "N": (88, 56, 32, 255),       # 幹 (濃)
    "n": (140, 92, 50, 255),      # 幹 (明)
    "S": (40, 32, 38, 80),        # 地面の影 (半透明)
    # fence
    "F": (160, 110, 60, 255),     # 木目
    "f": (110, 70, 36, 255),      # 木目 (影)
    "L": (210, 168, 110, 255),    # 木目 (明)
    # sign
    "P": (132, 90, 50, 255),      # 杭
    "p": (180, 130, 80, 255),     # 杭ハイライト
    "B": (218, 188, 132, 255),    # 看板の板
    "b": (170, 130, 80, 255),     # 板 (影)
    "x": (28, 22, 26, 255),       # 看板の文字
    # well
    "K": (148, 148, 156, 255),    # 石 (明)
    "k": (96, 96, 104, 255),      # 石 (影)
    "W": (76, 144, 200, 255),     # 水
    "w": (160, 210, 240, 255),    # 水ハイライト
    "R": (118, 84, 48, 255),      # 屋根の木
    "r": (170, 120, 70, 255),     # 屋根の木 明
}


# ---- tree (32×32) ----------------------------------------------------------
TREE = [
    "................................",
    "................................",
    "..............ooooo.............",
    ".............oGgggGo............",
    "............oGgggggGo...........",
    "...........oGghggghGGo..........",
    "..........oGgggghgggGGo.........",
    "..........oGghggggghgGo.........",
    ".........oGggggghggggGGo........",
    ".........oGggghgghhggggo........",
    ".........oGggggggggggGGo........",
    "..........oGggghgggggGo.........",
    "..........oGgghhggggGo..........",
    "...........oGggggggGo...........",
    "............oGGggGGo............",
    ".............oGGGGo.............",
    "..............oNNo..............",
    "..............oNno..............",
    "..............oNNo..............",
    "..............oNNo..............",
    "..............oNNo..............",
    "..............oNno..............",
    "..............oNNo..............",
    ".............oNNNNo.............",
    "............oNNnnNNo............",
    "...........ooNNNNNNoo...........",
    "..........SSooooooooSS..........",
    ".........SSSSSSSSSSSSSS.........",
    "..........SSSSSSSSSSSS..........",
    "................................",
    "................................",
    "................................",
]

# ---- fence (32×16) — 横長 -------------------------------------------------
FENCE_W, FENCE_H = 32, 16
FENCE = [
    "..oo......oo......oo......oo....",
    ".oFFo....oFFo....oFFo....oFFo...",
    ".oFLo....oFLo....oFLo....oFLo...",
    ".oFFo....oFFo....oFFo....oFFo...",
    "ooFFoooooFFoooooofFoooooofFooooo",  # 上の横木
    "oFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFo",
    "ofFLLLLLLLFLLLLLLLFLLLLLLLFFFLLo",
    "oooooooooooooooooooooooooooooooo",  # 上の横木 下端
    ".oFFo....oFFo....oFFo....oFFo...",
    ".oFLo....oFLo....oFLo....oFLo...",
    ".oFFo....oFFo....oFFo....oFFo...",
    "ooFFoooooFFoooooofFoooooofFooooo",  # 下の横木
    "oFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFo",
    "ofFLLLLLLLFLLLLLLLFLLLLLLLFFFLLo",
    "oooooooooooooooooooooooooooooooo",
    ".oFFo....oFFo....oFFo....oFFo...",
]

# ---- sign (32×32) ----------------------------------------------------------
SIGN = [
    "................................",
    "................................",
    "................................",
    "................................",
    "................................",
    ".......ooooooooooooooo..........",
    "......oBBBBBBBBBBBBBBBo.........",
    "......oBxxBxxBxBxxxxxBo.........",
    "......oBxxBxxBxBxBBBBo..........",  # 仮の文字模様 (汚れに見せる)
    "......oBxxBxxBxBxxxBBo..........",
    "......oBxxBxxBxBxBBBBo..........",
    "......oBxxBxxBxBxxxxxBo.........",
    "......oBbbBbbBbbbbbbbBo.........",
    ".......ooooooooooooooo..........",
    "..............oPo...............",
    "..............oPo...............",
    "..............oPo...............",
    "..............oPo...............",
    "..............oPo...............",
    "..............oPo...............",
    "..............oPo...............",
    "..............oPo...............",
    "..............oPo...............",
    "..............oPo...............",
    "..............oPo...............",
    "..............oPo...............",
    "..............oPo...............",
    "..............oPo...............",
    "..............oPo...............",
    ".............SSSSS..............",  # 影
    "................................",
    "................................",
]

# ---- well (32×32) -----------------------------------------------------------
WELL = [
    "................................",
    "................................",
    "..............ooooo.............",
    ".............oRRRRRo............",
    "............oRrRrRrRo...........",
    "...........oRRrRrRrRRo..........",
    "..........oRRRRRRRRRRRo.........",
    "..........oNNNNNNNNNNNo.........",  # 屋根の下のはり
    "..........o..o.....o..o.........",
    "..........o..o.....o..o.........",
    "..........o..o.....o..o.........",
    "........ooKKKKKKKKKKKKKoo.......",
    ".......oKKKKKKKKKKKKKKKKKo......",
    "......oKKkKKkKKKKKKKkKKKKKo.....",
    ".....oKKKKKKKKKKKKKKKKKKKKKo....",
    ".....oKKkKKKKKKKKKKKKKKkKKKo....",
    ".....oKKKKKWwwwWWWWWWKKKKKKo....",  # 水面
    ".....oKkKKWwwwwwwwwwwWKKKkKo....",
    ".....oKKKKWWWWWWWWWWWWKKKKKo....",
    ".....oKKkKKKKKKKKKKKKKKKkKKo....",
    ".....oKKKKKKKKKKKKKKKKKKKKKo....",
    ".....oKkKKKKKKKKKKKKKKKkKKKo....",
    ".....oKKKKKKKKKKKKKKKKKKKKKo....",
    "......oKKKKKKKKKKKKKKKKKKKo.....",
    ".......oKKKKKKKKKKKKKKKKKo......",
    "........ooKKKKKKKKKKKKKoo.......",
    ".........oooooooooooooooo.......",
    ".........SSSSSSSSSSSSSSSS.......",  # 地面影
    "..........SSSSSSSSSSSSSS........",
    "................................",
    "................................",
    "................................",
]


def render(rows: list[str], w: int, h: int) -> Image.Image:
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            img.putpixel((x, y), PALETTE.get(ch, (0, 0, 0, 0)))
    return img


def gen_preview(items: list[tuple[str, Image.Image]]) -> Image.Image:
    scale = 4
    margin = 10
    label_h = 14
    # 各アセット幅は scale * 元幅 + margin
    widths = [img.width * scale + margin for _, img in items]
    height = max(img.height for _, img in items) * scale + margin * 2 + label_h
    total_w = sum(widths) + margin
    out = Image.new("RGBA", (total_w, height), (244, 240, 232, 255))
    draw = ImageDraw.Draw(out)
    x_cursor = margin
    for name, img in items:
        big = img.resize((img.width * scale, img.height * scale), Image.NEAREST)
        # 下揃え
        y = height - margin - big.height
        out.paste(big, (x_cursor, y), big)
        draw.text((x_cursor, margin), name, fill=(40, 36, 32, 255))
        x_cursor += img.width * scale + margin
    return out


def main() -> None:
    out_dir = os.path.join(os.path.dirname(__file__), "..", "assets", "sprites", "decorations")
    out_dir = os.path.normpath(out_dir)
    os.makedirs(out_dir, exist_ok=True)

    specs = [
        ("tree", TREE, 32, 32),
        ("fence", FENCE, FENCE_W, FENCE_H),
        ("sign", SIGN, 32, 32),
        ("well", WELL, 32, 32),
    ]
    for name, rows, w, h in specs:
        assert len(rows) == h, f"{name}: rows={len(rows)} need {h}"
        for i, r in enumerate(rows):
            assert len(r) == w, f"{name}[{i}]: width={len(r)} need {w}: {r!r}"

    images: list[tuple[str, Image.Image]] = []
    for name, rows, w, h in specs:
        img = render(rows, w, h)
        path = os.path.join(out_dir, f"{name}.png")
        img.save(path, "PNG")
        print(f"wrote {path}")
        images.append((name, img))

    preview = gen_preview(images)
    preview.save(os.path.join(out_dir, "preview.png"), "PNG")
    print(f"wrote {os.path.join(out_dir, 'preview.png')}")


if __name__ == "__main__":
    main()
