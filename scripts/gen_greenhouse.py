"""ビニールハウス外観スプライト生成スクリプト.

要件定義 4.1 で「1棟 = 2×3マス想定」と定義されているため、
1マス=32px のグリッドに対し 3 マス × 2 マスの横長配置で 96×64 px を採用。
ASCII グリッドではなく ImageDraw プリミティブで描く (大きい絵向き).

実行: python3 scripts/gen_greenhouse.py
出力: assets/sprites/greenhouse/exterior.png + preview.png
"""

from __future__ import annotations

import os
from PIL import Image, ImageDraw

W, H = 96, 64

# パレット (トマトと共通色 + ハウス専用色)
OUTLINE = (28, 22, 26, 255)
VINYL = (224, 240, 248, 255)          # ビニール本体 (薄水色)
VINYL_DARK = (170, 200, 220, 255)     # ビニール影
VINYL_HL = (255, 255, 255, 255)       # ビニール反射
FRAME = (98, 108, 118, 255)           # 鉄骨フレーム
FRAME_DARK = (60, 68, 78, 255)        # フレーム影
FOUNDATION = (160, 138, 102, 255)     # 基礎 (木枠)
FOUNDATION_DARK = (108, 86, 56, 255)
DOOR = (118, 84, 48, 255)             # 扉
DOOR_DARK = (72, 50, 26, 255)
DOOR_KNOB = (240, 198, 80, 255)
SHADOW = (0, 0, 0, 80)


def draw_greenhouse() -> Image.Image:
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # 地面の影 (楕円)
    d.ellipse((4, 56, W - 4, 62), fill=SHADOW)

    # 基礎 (土台)
    d.rectangle((6, 50, W - 7, 57), fill=FOUNDATION, outline=OUTLINE)
    # 基礎の下半分を影色で
    d.rectangle((7, 54, W - 8, 56), fill=FOUNDATION_DARK)

    # 本体壁 (ビニール) 矩形部分
    body_top = 22
    body_bot = 50
    d.rectangle((8, body_top, W - 9, body_bot), fill=VINYL, outline=OUTLINE)
    # 下端に影
    d.rectangle((9, body_bot - 3, W - 10, body_bot - 1), fill=VINYL_DARK)

    # 屋根 (アーチ) — 多角形で表現
    roof_pts = [
        (8, body_top),
        (14, 14),
        (28, 8),
        (48, 5),
        (W - 1 - 48 + 48, 5),  # = (48,5) for symmetry; replaced below
        (W - 29, 8),
        (W - 15, 14),
        (W - 9, body_top),
    ]
    # 対称な屋根頂点
    roof_pts = [
        (8, body_top),
        (14, 14),
        (28, 8),
        (44, 5),
        (52, 5),
        (W - 29, 8),
        (W - 15, 14),
        (W - 9, body_top),
    ]
    d.polygon(roof_pts, fill=VINYL, outline=OUTLINE)

    # 屋根のハイライト
    d.line((30, 7, 42, 6), fill=VINYL_HL)
    d.line((16, 16, 26, 11), fill=VINYL_HL)

    # 本体下部の影をもう一段
    d.line((9, body_bot - 1, W - 10, body_bot - 1), fill=VINYL_DARK)

    # 鉄骨フレーム (縦リブ) - 扉のある中央を避けて配置
    rib_xs = [18, 30, 66, 78]
    for x in rib_xs:
        d.line((x, body_top + 1, x, body_bot - 1), fill=FRAME)
        # 屋根上のリブは短く
        d.line((x, body_top - 1, x, body_top - 3), fill=FRAME)

    # フレームの横棒 (屋根との接合部)
    d.line((9, body_top, W - 10, body_top), fill=FRAME)
    # 屋根中央の棟
    d.line((44, 5, 52, 5), fill=FRAME_DARK)

    # 扉
    door_left = 42
    door_right = 54
    door_top = 30
    door_bot = 50
    d.rectangle((door_left, door_top, door_right, door_bot), fill=DOOR, outline=OUTLINE)
    # 扉の中央線
    d.line((48, door_top + 2, 48, door_bot - 1), fill=DOOR_DARK)
    # 扉の上に小窓
    d.rectangle((door_left + 2, door_top + 2, door_right - 2, door_top + 6), fill=VINYL)
    d.line((door_left + 3, door_top + 4, door_right - 3, door_top + 4), fill=VINYL_DARK)
    # ドアノブ
    img.putpixel((52, 40), DOOR_KNOB)
    img.putpixel((44, 40), DOOR_KNOB)

    # 扉の前の踏み石
    d.rectangle((40, 50, 56, 53), fill=FOUNDATION_DARK, outline=OUTLINE)

    return img


def gen_preview(img: Image.Image) -> Image.Image:
    scale = 3
    margin = 6
    big = img.resize((W * scale, H * scale), Image.NEAREST)
    bg = Image.new("RGBA", (big.width + margin * 2, big.height + margin * 2), (244, 240, 232, 255))
    bg.paste(big, (margin, margin), big)
    return bg


def main() -> None:
    out_dir = os.path.join(os.path.dirname(__file__), "..", "assets", "sprites", "greenhouse")
    out_dir = os.path.normpath(out_dir)
    os.makedirs(out_dir, exist_ok=True)

    img = draw_greenhouse()
    img.save(os.path.join(out_dir, "exterior.png"), "PNG")
    print(f"wrote {os.path.join(out_dir, 'exterior.png')}")

    preview = gen_preview(img)
    preview.save(os.path.join(out_dir, "preview.png"), "PNG")
    print(f"wrote {os.path.join(out_dir, 'preview.png')}")


if __name__ == "__main__":
    main()
