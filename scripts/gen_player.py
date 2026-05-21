"""農園主 (プレイヤー) キャラクタースプライト生成スクリプト.

要件定義 11.1 の方針:
- 16×24 px / 4方向 (down/up/left/right)
- 麦わら帽子 + オーバーオールのカイロ風農夫
- 各方向に 3フレーム (idle / walk1 / walk2) — 2フレーム歩行サイクル
- right は left のミラー反転で生成

実行: python3 scripts/gen_player.py
出力:
  assets/sprites/player/{down,up,left,right}.png            (=idle, 後方互換)
  assets/sprites/player/{dir}_{idle,walk1,walk2}.png        (個別フレーム)
  assets/sprites/player/{dir}_walk.png                       (1方向3フレームの横シート)
  assets/sprites/player/sheet.png                            (4方向×3フレームの全シート)
  assets/sprites/player/preview.png                          (拡大プレビュー)
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


# ============================================================================
# 歩行フレーム生成
# ============================================================================
# 戦略: 頭・胴体 (rows 0-20) はそのまま、脚部 (rows 21-23) のみ書き換える.
#       walk1 = 右足を 1px 持ち上げ, walk2 = 左足を 1px 持ち上げ.
#       LEFT/RIGHT は横向きなので末端 (row 23) のみ脚の前後を入れ替える.


def with_legs(base: list[str], legs: list[str], start_row: int) -> list[str]:
    """`base` の `start_row` から `legs` で置き換えた新リストを返す."""
    return base[:start_row] + legs + base[start_row + len(legs):]


# DOWN/UP の脚部入れ替え (rows 21-23)
DOWN_UP_WALK1_LEGS = [
    "...oPPPoPPPo....",  # row 21: ズボンを左右に分割 (中央に縫い目)
    "...oKKKoKKKo....",  # row 22: ブーツ上端も分割
    "...oKkKo........",  # row 23: 左足のみ接地 (右足は1px上=row 22終点)
]
DOWN_UP_WALK2_LEGS = [
    "...oPPPoPPPo....",
    "...oKKKoKKKo....",
    "........oKKko...",  # 右足のみ接地
]

# LEFT の脚部入れ替え (row 23 のみ)
LEFT_WALK1_LEGS = ["..oKkK.........."]   # 後ろ足 (奥) を持ち上げ → 前足のみ
LEFT_WALK2_LEGS = ["....oKKko......."]   # 前足を持ち上げ → 後ろ足のみ (1px後ろにずらす)


def make_walks(base: list[str], dirname: str) -> tuple[list[str], list[str]]:
    if dirname in ("down", "up"):
        return (
            with_legs(base, DOWN_UP_WALK1_LEGS, 21),
            with_legs(base, DOWN_UP_WALK2_LEGS, 21),
        )
    if dirname == "left":
        return (
            with_legs(base, LEFT_WALK1_LEGS, 23),
            with_legs(base, LEFT_WALK2_LEGS, 23),
        )
    raise ValueError(dirname)


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


def validate(rows: list[str], name: str) -> None:
    assert len(rows) == H, f"{name}: rows={len(rows)} (need {H})"
    for i, r in enumerate(rows):
        assert len(r) == W, f"{name}[{i}]: width={len(r)} (need {W}): {r!r}"


def main() -> None:
    out_dir = os.path.join(os.path.dirname(__file__), "..", "assets", "sprites", "player")
    out_dir = os.path.normpath(out_dir)
    os.makedirs(out_dir, exist_ok=True)

    bases = {"down": DOWN, "up": UP, "left": LEFT}
    for name, rows in bases.items():
        validate(rows, name)

    # 各方向の (idle, walk1, walk2) を作成
    frames: dict[str, list[Image.Image]] = {}
    for dirname, base in bases.items():
        idle_rows = base
        walk1_rows, walk2_rows = make_walks(base, dirname)
        for label, rows in [("idle", idle_rows), ("walk1", walk1_rows), ("walk2", walk2_rows)]:
            validate(rows, f"{dirname}_{label}")
        frames[dirname] = [render(idle_rows), render(walk1_rows), render(walk2_rows)]

    # right は left のミラー
    frames["right"] = [img.transpose(Image.FLIP_LEFT_RIGHT) for img in frames["left"]]

    # 個別 PNG 出力
    for dirname in ("down", "up", "left", "right"):
        idle, walk1, walk2 = frames[dirname]
        for label, img in [("idle", idle), ("walk1", walk1), ("walk2", walk2)]:
            path = os.path.join(out_dir, f"{dirname}_{label}.png")
            img.save(path, "PNG")
            print(f"wrote {path}")
        # 後方互換: {dir}.png = idle
        idle.save(os.path.join(out_dir, f"{dirname}.png"), "PNG")
        # 1方向 3フレームの横シート
        per_dir = Image.new("RGBA", (W * 3, H), (0, 0, 0, 0))
        for i, img in enumerate([idle, walk1, walk2]):
            per_dir.paste(img, (i * W, 0), img)
        per_dir.save(os.path.join(out_dir, f"{dirname}_walk.png"), "PNG")
        print(f"wrote {os.path.join(out_dir, f'{dirname}_walk.png')}")

    # 4方向×3フレームの全シート (rows=dir, cols=frame)
    all_sheet = Image.new("RGBA", (W * 3, H * 4), (0, 0, 0, 0))
    for r, dirname in enumerate(("down", "up", "left", "right")):
        for c, img in enumerate(frames[dirname]):
            all_sheet.paste(img, (c * W, r * H), img)
    all_sheet.save(os.path.join(out_dir, "sheet.png"), "PNG")
    print(f"wrote {os.path.join(out_dir, 'sheet.png')}")

    # プレビュー: 4列(方向) × 3行(フレーム) を 5倍拡大して並べる
    scale = 5
    margin = 8
    cols = 4  # 方向
    rows_n = 3  # フレーム
    cell_w = W * scale + margin
    cell_h = H * scale + margin
    out = Image.new("RGBA", (cell_w * cols + margin, cell_h * rows_n + margin), (244, 240, 232, 255))
    for ci, dirname in enumerate(("down", "up", "left", "right")):
        for ri, img in enumerate(frames[dirname]):
            big = img.resize((W * scale, H * scale), Image.NEAREST)
            out.paste(big, (margin + ci * cell_w, margin + ri * cell_h), big)
    out.save(os.path.join(out_dir, "preview.png"), "PNG")
    print(f"wrote {os.path.join(out_dir, 'preview.png')}")


if __name__ == "__main__":
    main()
