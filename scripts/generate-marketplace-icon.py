#!/usr/bin/env python3
"""Generate LinguaLens marketplace icon (256x256) and size comparison sheet."""

from __future__ import annotations

import math
import os
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
BG = (30, 58, 95, 255)  # #1e3a5f
WHITE = (232, 244, 252, 255)
CYAN = (126, 200, 227, 255)
SIZE = 256


def rounded_rect(draw: ImageDraw.ImageDraw, box: tuple, radius: int, fill) -> None:
    draw.rounded_rectangle(box, radius=radius, fill=fill)


def stroke_polyline(draw: ImageDraw.ImageDraw, points: list[tuple[float, float]], width: float, fill) -> None:
    """Thick polyline via rounded caps (PIL line width is int; use polygon for crisp joins)."""
    w = width / 2
    for i in range(len(points) - 1):
        x0, y0 = points[i]
        x1, y1 = points[i + 1]
        dx, dy = x1 - x0, y1 - y0
        length = math.hypot(dx, dy) or 1.0
        nx, ny = -dy / length * w, dx / length * w
        quad = [
            (x0 + nx, y0 + ny),
            (x0 - nx, y0 - ny),
            (x1 - nx, y1 - ny),
            (x1 + nx, y1 + ny),
        ]
        draw.polygon(quad, fill=fill)
    for x, y in points:
        draw.ellipse([x - w, y - w, x + w, y + w], fill=fill)


def draw_wen_glyph(draw: ImageDraw.ImageDraw, cx: float, cy: float, scale: float, fill) -> None:
    """Stylized 文 as vector strokes (no external font). Coords in ~[-1,1] box."""
    s = scale
    strokes = [
        # top horizontal
        [(-0.42, -0.55), (0.42, -0.55)],
        # middle horizontal
        [(-0.55, -0.12), (0.55, -0.12)],
        # left leg
        [(0.0, -0.02), (-0.48, 0.58)],
        # right leg
        [(0.0, -0.02), (0.48, 0.58)],
    ]
    width = 0.18 * s
    for seg in strokes:
        pts = [(cx + x * s, cy + y * s) for x, y in seg]
        stroke_polyline(draw, pts, width, fill)


def draw_a_glyph(
    draw: ImageDraw.ImageDraw, cx: float, cy: float, scale: float, fill, hole_fill
) -> None:
    """Bold sans A as filled vector paths."""
    s = scale
    # Outer A: apex, bottom-left, bottom-right
    apex = (cx, cy - 0.52 * s)
    bl = (cx - 0.46 * s, cy + 0.48 * s)
    br = (cx + 0.46 * s, cy + 0.48 * s)
    draw.polygon([apex, bl, br], fill=fill)
    # Inner cutout (counter)
    bar_y = cy + 0.08 * s
    inner_w = 0.22 * s
    inner_h = 0.55 * s
    cut_top = (cx, cy - 0.18 * s)
    cut_bl = (cx - inner_w, bar_y + inner_h * 0.35)
    cut_br = (cx + inner_w, bar_y + inner_h * 0.35)
    draw.polygon([cut_top, cut_bl, cut_br], fill=hole_fill)
    # Crossbar
    bar_h = 0.12 * s
    draw.rounded_rectangle(
        [cx - 0.34 * s, bar_y - bar_h / 2, cx + 0.34 * s, bar_y + bar_h / 2],
        radius=int(0.04 * s),
        fill=fill,
    )


def draw_lens_icon(size: int = SIZE) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    pad = max(2, int(size * 4 / 256))
    r_bg = int(size * 52 / 256)
    rounded_rect(draw, (pad, pad, size - pad - 1, size - pad - 1), r_bg, BG)

    cx, cy = int(size * 112 / 256), int(size * 108 / 256)
    r = int(size * 70 / 256)
    stroke = max(2, int(size * 13 / 256))
    mid = (58, 96, 140, 220)

    draw.ellipse([cx - r + stroke, cy - r + stroke, cx + r - stroke, cy + r - stroke], fill=mid)
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=WHITE, width=stroke)

    glyph_scale = size * 0.118
    # 文 upper-left inside lens; A lower-right (staggered bilingual cue)
    draw_wen_glyph(draw, cx - size * 0.155, cy - size * 0.12, glyph_scale, WHITE)
    draw_a_glyph(draw, cx + size * 0.13, cy + size * 0.15, glyph_scale * 1.02, CYAN, mid)

    angle = math.radians(140)
    ex = cx + (r - 4) * math.cos(angle)
    ey = cy + (r - 4) * math.sin(angle)
    hx = cx + (r + int(size * 48 / 256)) * math.cos(angle)
    hy = cy + (r + int(size * 48 / 256)) * math.sin(angle)
    draw.line([(ex, ey), (hx, hy)], fill=WHITE, width=stroke, joint="curve")

    return img


def size_comparison_sheet(master: Image.Image) -> Image.Image:
    sizes = [16, 32, 64, 128]
    pad = 24
    label_h = 28
    cell = max(sizes) + pad * 2
    width = len(sizes) * cell
    height = cell + label_h
    sheet = Image.new("RGBA", (width, height), (240, 242, 245, 255))
    draw = ImageDraw.Draw(sheet)
    try:
        from PIL import ImageFont

        font = ImageFont.load_default()
    except Exception:
        font = None
    for i, s in enumerate(sizes):
        x0 = i * cell + pad
        y0 = pad
        icon = master.resize((s, s), Image.Resampling.LANCZOS)
        sheet.paste(icon, (x0, y0), icon)
        label = f"{s}px"
        tw = draw.textlength(label, font=font) if font else len(label) * 6
        draw.text((x0 + (s - tw) / 2, cell + 4), label, fill=(40, 44, 52, 255), font=font)
    return sheet


def main() -> None:
    icon = draw_lens_icon(SIZE)
    icon_path = ROOT / "resources" / "icon.png"
    preview = Path("/opt/cursor/artifacts/lingua-lens-icon.png")
    sizes_png = Path("/opt/cursor/artifacts/lingua-lens-icon-sizes.png")
    preview.parent.mkdir(parents=True, exist_ok=True)
    icon.save(icon_path, optimize=True)
    icon.save(preview, optimize=True)
    size_comparison_sheet(icon).save(sizes_png, optimize=True)
    print(f"Wrote {icon_path} ({icon_path.stat().st_size} bytes)")
    print(f"Wrote {preview}")
    print(f"Wrote {sizes_png}")


if __name__ == "__main__":
    main()
