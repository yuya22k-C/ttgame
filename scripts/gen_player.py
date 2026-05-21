"""農園主 (プレイヤー) キャラクタースプライト生成スクリプト.

要件定義 11.1 の方針:
- 16×24 px / 4方向 (down/up/left/right)
- 麦わら帽子 + オーバーオールのカイロ風農夫
- right は left のミラー反転で生成 (描画コストとイメージの一貫性)

実行: python3 scripts/gen_player.py
出力:
  assets/sprites/player/{down,up,left,right}.png
  assets/sprites/player/sheet.png  (4方向横並び)
  assets/sprites/player/preview.png (拡大版)
"""

from __future__ import annotations

import os
from PIL import Image

W, H = 16, 24

PALETTE: dict[str, tuple[int, int, int, int]] = {
    ".": (0, 0, 0, 0),            # 透明
    "o": (28, 22, 26, 255),       # アウトライン / 目
    "h": (210, 175, 90, 255),     # 麦わら帽子 (基本)
    "t": (244, 218, 142, 255),    # 麦わら帽子 (ハイライト)
    "H": (110, 70, 36, 255),      # 帽子の影/ヘッドバンド
    "s": (242, 208, 168, 255),    # 肌
    "S": (200, 168, 132, 255),    # 肌の影
    "e": (28, 22, 26, 255),       # 目 (見やすさで別キー)
    "m": (164, 80, 80, 255),      # 口
    "B": (236, 220, 188, 255),    # シャツ
    "b": (192, 178, 148, 255),    # シャツの影
    "O": (58, 92, 138, 255),      # オーバーオール (吊り紐)
    "P": (78, 122, 174, 255),     # オーバーオール (ズボン)
    "p": (122, 162, 210, 255),    # ズボンのハイライト
    "K": (88, 56, 32, 255),       # ブーツ
    "k": (140, 92, 50, 255),      # ブーツのハイライト
}

# ---- DOWN (正面) -----------------------------------------------------------
DOWN = [
    "................",
    "................",
    ".....ooooo......",
    "....ohhhhho.....",
    "...ohtttttho....",
    "..ohhhhhhhhho...",
    ".ooHHHHHHHHHoo..",
    "..oosssssssoo...",
    "....sessess.....",
    "....sssssss.....",
    "....smmmmms.....",
    "....ossssso.....",
    "..oBBBBBBBBBo...",
    "..oBOBBBBBOBo...",
    "..oBObbbBbOBo...",
    "..oBOBbbbBOBo...",
    "..oBOBBBBBOBo...",
    "..oOPPPPPPPOo...",
    "..oPpPPPPPpPo...",
    "..oPPPpPPPPPo...",
    "...oPPPPPPPo....",
    "...oPPPPPPPo....",
    "...oKKKKKKKo....",
    "...oKkKKKKko....",
]

# ---- UP (背面) -------------------------------------------------------------
UP = [
    "................",
    "................",
    ".....ooooo......",
    "....ohhhhho.....",
    "...ohhhhhhho....",
    "..ohhhhhhhhho...",
    ".ooHHHHHHHHHoo..",
    "..oosssssssoo...",
    "....sssssss.....",  # 顔は見えない (後頭部)
    "....sssssss.....",
    "....sssssss.....",
    "....ossssso.....",
    "..oBBBBBBBBBo...",
    "..oBOBBBBBOBo...",  # 背中側もストラップが見える
    "..oBOBBBBBOBo...",
    "..oBObbbbbOBo...",
    "..oBOBBBBBOBo...",
    "..oOPPPPPPPOo...",
    "..oPPPpPPPPPo...",
    "..oPpPPPPPpPo...",
    "...oPPPPPPPo....",
    "...oPPPPPPPo....",
    "...oKKKKKKKo....",
    "...oKkKKKKko....",
]

# ---- LEFT (左向き) — 横顔の側面プロフィール ---------------------------------
# right は left を水平反転で生成
LEFT = [
    "................",
    "................",
    "....oooo........",
    "...ohhho........",
    "..ohtttho.......",
    ".ohhhhhho.......",
    "ooHHHHHHHo......",
    ".ossssssSo......",
    ".ose.sssSo......",
    ".osssssSso......",
    ".osmmssSso......",
    ".osssssso.......",
    ".oBBBBbbBo......",
    ".oBObBBbBo......",
    ".oBObbbbBo......",
    ".oBObbbBBo......",
    ".oBObBBBbo......",
    ".oOPPPPPPo......",
    ".oPpPPPPPo......",
    ".oPPPpPPPo......",
    "..oPPPPPo.......",
    "..oPPPPPo.......",
    "..oKKKKKo.......",
    "..oKkKKko.......",
]


def render(rows: list[str]) -> Image.Image:
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            img.putpixel((x, y), PALETTE.get(ch, PALETTE["."]))
    return img


def gen_sheet(images: list[Image.Image]) -> Image.Image:
    """4方向を横に連結したスプライトシート."""
    sheet = Image.new("RGBA", (W * len(images), H), (0, 0, 0, 0))
    for i, img in enumerate(images):
        sheet.paste(img, (i * W, 0), img)
    return sheet


def gen_preview(images: list[Image.Image], labels: list[str]) -> Image.Image:
    scale = 5
    margin = 8
    cell_w = W * scale + margin
    out = Image.new("RGBA", (cell_w * len(images) + margin, H * scale + margin * 2 + 16), (244, 240, 232, 255))
    for i, img in enumerate(images):
        big = img.resize((W * scale, H * scale), Image.NEAREST)
        out.paste(big, (margin + i * cell_w, margin), big)
    return out


def main() -> None:
    out_dir = os.path.join(os.path.dirname(__file__), "..", "assets", "sprites", "player")
    out_dir = os.path.normpath(out_dir)
    os.makedirs(out_dir, exist_ok=True)

    # 行数検証
    for name, rows in [("DOWN", DOWN), ("UP", UP), ("LEFT", LEFT)]:
        assert len(rows) == H, f"{name} expected {H} rows, got {len(rows)}"
        for i, r in enumerate(rows):
            assert len(r) == W, f"{name}[{i}] expected width {W}, got {len(r)}: {r!r}"

    down_img = render(DOWN)
    up_img = render(UP)
    left_img = render(LEFT)
    right_img = left_img.transpose(Image.FLIP_LEFT_RIGHT)

    for name, img in [("down.png", down_img), ("up.png", up_img), ("left.png", left_img), ("right.png", right_img)]:
        img.save(os.path.join(out_dir, name), "PNG")
        print(f"wrote {os.path.join(out_dir, name)}")

    sheet = gen_sheet([down_img, up_img, left_img, right_img])
    sheet.save(os.path.join(out_dir, "sheet.png"), "PNG")
    print(f"wrote {os.path.join(out_dir, 'sheet.png')}")

    preview = gen_preview([down_img, up_img, left_img, right_img], ["down", "up", "left", "right"])
    preview.save(os.path.join(out_dir, "preview.png"), "PNG")
    print(f"wrote {os.path.join(out_dir, 'preview.png')}")


if __name__ == "__main__":
    main()
