#!/usr/bin/env python3
"""
Generate LinguaLens marketplace icon (256×256) and a 16/32/64/128 comparison sheet.

Fonts (downloaded on demand, not committed — SIL Open Font License 1.1):
  - Noto Sans SC Bold: https://github.com/googlefonts/noto-cjk (via @fontsource mirror)
  - Inter Bold: https://github.com/rsms/inter (via @fontsource mirror)
"""

from __future__ import annotations

import json
import math
import sys
import urllib.request
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path

from fontTools.ttLib import TTFont
from PIL import Image, ImageChops, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
CACHE = Path("/tmp/lingua-lens-fonts")

FONT_SOURCES = {
    "NotoSansSC-Bold.otf": (
        "https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-sc@5.2.5/files/"
        "noto-sans-sc-chinese-simplified-700-normal.woff2",
        "Noto Sans SC Bold — Copyright 2014-2021 Adobe (http://www.adobe.com/), "
        "Google LLC. Licensed under SIL Open Font License 1.1.",
    ),
    "Inter-Bold.otf": (
        "https://cdn.jsdelivr.net/npm/@fontsource/inter@5.2.5/files/inter-latin-700-normal.woff2",
        "Inter Bold — Copyright 2016 The Inter Project Authors. "
        "Licensed under SIL Open Font License 1.1.",
    ),
}

BG = (30, 58, 95, 255)  # #1e3a5f
LENS_FILL = (18, 42, 72, 255)  # #122a48
WHITE = (255, 255, 255, 255)
CYAN = (126, 200, 227, 255)
RENDER_SIZE = 1024
OUT_SIZE = 256

# Magnifier geometry (local space, lens center at origin)
R_OUTER_FRAC = 0.34
STROKE_FRAC = 0.038
HANDLE_EXTRA_FRAC = 0.105
HANDLE_ANGLE_DEG = 138


@dataclass
class IconMetrics:
    magnifier_margins: dict[str, float]
    glyph_offset_from_lens_center: dict[str, float]


def ensure_font(filename: str) -> Path:
    CACHE.mkdir(parents=True, exist_ok=True)
    dest = CACHE / filename
    if dest.exists() and dest.stat().st_size > 1000:
        return dest
    url, _ = FONT_SOURCES[filename]
    print(f"Downloading {filename} from {url}", file=sys.stderr)
    data = urllib.request.urlopen(url, timeout=120).read()
    font = TTFont(BytesIO(data))
    font.save(dest)
    return dest


def circular_mask(size: int, center: tuple[float, float], radius: float) -> Image.Image:
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    cx, cy = center
    draw.ellipse([cx - radius, cy - radius, cx + radius, cy + radius], fill=255)
    return mask


def merge_bbox(a: tuple[float, float, float, float], b: tuple[float, float, float, float]):
    return (min(a[0], b[0]), min(a[1], b[1]), max(a[2], b[2]), max(a[3], b[3]))


def point_in_circle(x: float, y: float, cx: float, cy: float, r: float, pad: float) -> bool:
    return math.hypot(x - cx, y - cy) <= r - pad


def bbox_inside_circle(
    bbox: tuple[float, float, float, float], cx: float, cy: float, r: float, pad: float
) -> bool:
    corners = [(bbox[0], bbox[1]), (bbox[2], bbox[1]), (bbox[0], bbox[3]), (bbox[2], bbox[3])]
    return all(point_in_circle(x, y, cx, cy, r, pad) for x, y in corners)


def thick_line_bbox(x0: float, y0: float, x1: float, y1: float, width: float) -> tuple[float, float, float, float]:
    half = width / 2
    dx, dy = x1 - x0, y1 - y0
    length = math.hypot(dx, dy) or 1.0
    nx, ny = -dy / length * half, dx / length * half
    pts = [
        (x0 + nx, y0 + ny),
        (x0 - nx, y0 - ny),
        (x1 - nx, y1 - ny),
        (x1 + nx, y1 + ny),
    ]
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    cap = half
    return (min(xs) - cap, min(ys) - cap, max(xs) + cap, max(ys) + cap)


def circle_stroke_bbox(cx: float, cy: float, r: float, stroke: float) -> tuple[float, float, float, float]:
    pad = stroke / 2 + 1
    return (cx - r - pad, cy - r - pad, cx + r + pad, cy + r + pad)


def magnifier_local_bbox(size: int, r_outer: float, stroke: float) -> tuple[float, float, float, float]:
    angle = math.radians(HANDLE_ANGLE_DEG)
    ex = (r_outer - stroke * 0.3) * math.cos(angle)
    ey = (r_outer - stroke * 0.3) * math.sin(angle)
    hx = (r_outer + size * HANDLE_EXTRA_FRAC) * math.cos(angle)
    hy = (r_outer + size * HANDLE_EXTRA_FRAC) * math.sin(angle)
    bb = circle_stroke_bbox(0, 0, r_outer, stroke)
    bb = merge_bbox(bb, thick_line_bbox(ex, ey, hx, hy, stroke))
    return bb


def text_bbox_at(
    draw: ImageDraw.ImageDraw, pos: tuple[float, float], text: str, font: ImageFont.FreeTypeFont
) -> tuple[float, float, float, float]:
    return draw.textbbox(pos, text, font=font, anchor="mm")


def layout_glyphs(
    sc_path: Path,
    inter_path: Path,
    lens_cx: float,
    lens_cy: float,
    text_safe_r: float,
    size: int,
) -> tuple[Image.Image, tuple[float, float, float, float]]:
    """Return RGBA layer with glyphs and union bbox in canvas coordinates."""
    inner_d = 2 * text_safe_r
    pad_px = size * 0.022
    sc_size = int(inner_d * 0.46)
    en_size = int(inner_d * 0.38)
    diag = text_safe_r * 0.33

    for _ in range(28):
        layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        ld = ImageDraw.Draw(layer)
        font_zh = ImageFont.truetype(str(sc_path), sc_size)
        font_en = ImageFont.truetype(str(inter_path), en_size)
        zh_pos = (lens_cx - diag, lens_cy - diag * 0.92)
        en_pos = (lens_cx + diag, lens_cy + diag * 0.92)
        ld.text(zh_pos, "中", font=font_zh, fill=WHITE, anchor="mm")
        ld.text(en_pos, "En", font=font_en, fill=CYAN, anchor="mm")
        b_zh = text_bbox_at(ld, zh_pos, "中", font_zh)
        b_en = text_bbox_at(ld, en_pos, "En", font_en)
        group = merge_bbox(b_zh, b_en)
        gc_x = (group[0] + group[2]) / 2
        gc_y = (group[1] + group[3]) / 2
        shift_x = lens_cx - gc_x
        shift_y = lens_cy - gc_y
        if abs(shift_x) > 0.5 or abs(shift_y) > 0.5:
            layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
            ld = ImageDraw.Draw(layer)
            zh_pos = (zh_pos[0] + shift_x, zh_pos[1] + shift_y)
            en_pos = (en_pos[0] + shift_x, en_pos[1] + shift_y)
            ld.text(zh_pos, "中", font=font_zh, fill=WHITE, anchor="mm")
            ld.text(en_pos, "En", font=font_en, fill=CYAN, anchor="mm")
            b_zh = text_bbox_at(ld, zh_pos, "中", font_zh)
            b_en = text_bbox_at(ld, en_pos, "En", font_en)
            group = merge_bbox(b_zh, b_en)
        if bbox_inside_circle(b_zh, lens_cx, lens_cy, text_safe_r, pad_px) and bbox_inside_circle(
            b_en, lens_cx, lens_cy, text_safe_r, pad_px
        ):
            return layer, group
        sc_size = int(sc_size * 0.96)
        en_size = int(en_size * 0.96)
        diag *= 0.98
    raise RuntimeError("Could not fit 中 / En inside lens")


def draw_icon(size: int = RENDER_SIZE) -> tuple[Image.Image, IconMetrics]:
    sc_font_path = ensure_font("NotoSansSC-Bold.otf")
    inter_font_path = ensure_font("Inter-Bold.otf")

    r_outer = size * R_OUTER_FRAC
    stroke = max(8, int(size * STROKE_FRAC))
    r_inner = r_outer - stroke * 1.05
    ring_inset = stroke * 0.55
    text_safe_r = r_inner - ring_inset

    local_bb = magnifier_local_bbox(size, r_outer, stroke)
    bb_cx = (local_bb[0] + local_bb[2]) / 2
    bb_cy = (local_bb[1] + local_bb[3]) / 2
    board_cx = board_cy = size / 2
    tx = board_cx - bb_cx
    ty = board_cy - bb_cy

    cx = tx
    cy = ty
    angle = math.radians(HANDLE_ANGLE_DEG)
    ex = cx + (r_outer - stroke * 0.3) * math.cos(angle)
    ey = cy + (r_outer - stroke * 0.3) * math.sin(angle)
    hx = cx + (r_outer + size * HANDLE_EXTRA_FRAC) * math.cos(angle)
    hy = cy + (r_outer + size * HANDLE_EXTRA_FRAC) * math.sin(angle)

    mag_bb = magnifier_local_bbox(size, r_outer, stroke)
    mag_bb = (mag_bb[0] + tx, mag_bb[1] + ty, mag_bb[2] + tx, mag_bb[3] + ty)

    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    pad = int(size * 0.02)
    draw.rounded_rectangle([pad, pad, size - pad, size - pad], radius=int(size * 0.19), fill=BG)

    draw.line([(ex, ey), (hx, hy)], fill=WHITE, width=stroke, joint="curve")
    draw.ellipse([cx - r_inner, cy - r_inner, cx + r_inner, cy + r_inner], fill=LENS_FILL)

    glyph_layer, group_bb = layout_glyphs(
        sc_font_path, inter_font_path, cx, cy, text_safe_r, size
    )
    circle = circular_mask(size, (cx, cy), text_safe_r)
    paste_mask = ImageChops.multiply(circle, glyph_layer.split()[3])
    img.paste(glyph_layer, (0, 0), paste_mask)

    draw.ellipse([cx - r_outer, cy - r_outer, cx + r_outer, cy + r_outer], outline=WHITE, width=stroke)

    group_cx = (group_bb[0] + group_bb[2]) / 2
    group_cy = (group_bb[1] + group_bb[3]) / 2
    margins = {
        "left": mag_bb[0],
        "right": size - mag_bb[2],
        "top": mag_bb[1],
        "bottom": size - mag_bb[3],
    }
    metrics = IconMetrics(
        magnifier_margins=margins,
        glyph_offset_from_lens_center={"dx": group_cx - cx, "dy": group_cy - cy},
    )
    return img, metrics


def validate_icon(img: Image.Image) -> None:
    w, h = img.size
    assert w == h == RENDER_SIZE
    pixels = list(img.getdata())
    has_white_glyph = any(p[0] > 240 and p[1] > 240 and p[2] > 240 and p[3] > 0 for p in pixels)
    has_cyan_glyph = any(
        abs(p[0] - CYAN[0]) < 8 and abs(p[1] - CYAN[1]) < 8 and abs(p[2] - CYAN[2]) < 8 and p[3] > 0
        for p in pixels
    )
    assert has_white_glyph and has_cyan_glyph, "missing 中 or En glyph pixels"


def size_comparison_sheet(master: Image.Image) -> Image.Image:
    sizes = [16, 32, 64, 128]
    pad = 24
    label_h = 28
    cell = max(sizes) + pad * 2
    width = len(sizes) * cell
    height = cell + label_h
    sheet = Image.new("RGBA", (width, height), (240, 242, 245, 255))
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()
    for i, s in enumerate(sizes):
        x0 = i * cell + pad
        y0 = pad
        icon = master.resize((s, s), Image.Resampling.LANCZOS)
        sheet.paste(icon, (x0, y0), icon)
        label = f"{s}px"
        tw = draw.textlength(label, font=font)
        draw.text((x0 + (s - tw) / 2, cell + 4), label, fill=(40, 44, 52, 255), font=font)
    return sheet


def main() -> None:
    master, metrics = draw_icon(RENDER_SIZE)
    validate_icon(master)
    icon = master.resize((OUT_SIZE, OUT_SIZE), Image.Resampling.LANCZOS)

    icon_path = ROOT / "resources" / "icon.png"
    preview = Path("/opt/cursor/artifacts/lingua-lens-icon.png")
    sizes_png = Path("/opt/cursor/artifacts/lingua-lens-icon-sizes.png")
    preview.parent.mkdir(parents=True, exist_ok=True)

    icon.save(icon_path, optimize=True)
    icon.save(preview, optimize=True)
    size_comparison_sheet(icon).save(sizes_png, optimize=True)

    print("Magnifier bbox margins to board (px):", json.dumps(metrics.magnifier_margins, indent=2))
    print(
        "Glyph group offset from lens inner center (px):",
        json.dumps(metrics.glyph_offset_from_lens_center, indent=2),
    )
    print(f"Wrote {icon_path} ({icon_path.stat().st_size} bytes)")
    print(f"Wrote {preview}")
    print(f"Wrote {sizes_png}")


if __name__ == "__main__":
    main()
