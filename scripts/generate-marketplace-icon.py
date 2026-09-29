#!/usr/bin/env python3
"""
Generate LinguaLens marketplace icon (256×256) and a 16/32/64/128 comparison sheet.

Fonts (downloaded on demand, not committed — SIL Open Font License 1.1):
  - Noto Sans SC Bold: https://github.com/googlefonts/noto-cjk (via @fontsource mirror)
  - Inter Bold: https://github.com/rsms/inter (via @fontsource mirror)
"""

from __future__ import annotations

import math
import sys
import urllib.request
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
LENS_FILL = (18, 42, 72, 255)  # darker glass for contrast
WHITE = (255, 255, 255, 255)
CYAN = (126, 200, 227, 255)
RENDER_SIZE = 1024
OUT_SIZE = 256


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


def text_bbox_center(draw: ImageDraw.ImageDraw, xy: tuple[float, float], text: str, font: ImageFont.FreeTypeFont):
    bbox = draw.textbbox(xy, text, font=font, anchor="mm")
    cx = (bbox[0] + bbox[2]) / 2
    cy = (bbox[1] + bbox[3]) / 2
    return bbox, (cx, cy)


def fits_in_circle(
    bbox: tuple[float, float, float, float], center: tuple[float, float], radius: float, pad: float
) -> bool:
    cx, cy = center
    corners = [(bbox[0], bbox[1]), (bbox[2], bbox[1]), (bbox[0], bbox[3]), (bbox[2], bbox[3])]
    for x, y in corners:
        if math.hypot(x - cx, y - cy) > radius - pad:
            return False
    return True


def draw_icon(size: int = RENDER_SIZE) -> Image.Image:
    sc_font_path = ensure_font("NotoSansSC-Bold.otf")
    inter_font_path = ensure_font("Inter-Bold.otf")

    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    pad = int(size * 0.02)
    draw.rounded_rectangle([pad, pad, size - pad, size - pad], radius=int(size * 0.19), fill=BG)

    cx = size * 0.48
    cy = size * 0.44
    r_outer = size * 0.36
    stroke = max(8, int(size * 0.038))
    r_inner = r_outer - stroke * 1.05
    ring_inset = stroke * 0.55
    text_safe_r = r_inner - ring_inset

    # Handle (shorter, behind lens)
    angle = math.radians(138)
    ex = cx + (r_outer - stroke * 0.3) * math.cos(angle)
    ey = cy + (r_outer - stroke * 0.3) * math.sin(angle)
    hx = cx + (r_outer + size * 0.11) * math.cos(angle)
    hy = cy + (r_outer + size * 0.11) * math.sin(angle)
    draw.line([(ex, ey), (hx, hy)], fill=WHITE, width=stroke, joint="curve")

    draw.ellipse(
        [cx - r_inner, cy - r_inner, cx + r_inner, cy + r_inner],
        fill=LENS_FILL,
    )

    inner_d = 2 * text_safe_r
    target_glyph_h = inner_d * 0.46
    font_size = int(target_glyph_h)
    font_wen = ImageFont.truetype(str(sc_font_path), font_size)
    font_a = ImageFont.truetype(str(inter_font_path), int(font_size * 1.05))

    # Shrink until both glyphs fit with margin inside the glass
    pad_px = size * 0.018
    for _ in range(24):
        layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        ld = ImageDraw.Draw(layer)
        wen_pos = (cx - text_safe_r * 0.38, cy - text_safe_r * 0.34)
        a_pos = (cx + text_safe_r * 0.36, cy + text_safe_r * 0.36)
        ld.text(wen_pos, "文", font=font_wen, fill=WHITE, anchor="mm")
        ld.text(a_pos, "A", font=font_a, fill=CYAN, anchor="mm")
        b0, _ = text_bbox_center(ld, wen_pos, "文", font_wen)
        b1, _ = text_bbox_center(ld, a_pos, "A", font_a)
        if fits_in_circle(b0, (cx, cy), text_safe_r, pad_px) and fits_in_circle(
            b1, (cx, cy), text_safe_r, pad_px
        ):
            circle = circular_mask(size, (cx, cy), text_safe_r)
            text_alpha = layer.split()[3]
            paste_mask = ImageChops.multiply(circle, text_alpha)
            img.paste(layer, (0, 0), paste_mask)
            break
        font_size = int(font_size * 0.94)
        font_wen = ImageFont.truetype(str(sc_font_path), font_size)
        font_a = ImageFont.truetype(str(inter_font_path), int(font_size * 1.05))
    else:
        raise RuntimeError("Could not fit glyphs inside lens; adjust layout constants")

    draw = ImageDraw.Draw(img)
    draw.ellipse(
        [cx - r_outer, cy - r_outer, cx + r_outer, cy + r_outer],
        outline=WHITE,
        width=stroke,
    )

    return img


def validate_icon(img: Image.Image) -> None:
    """Basic sanity checks on the 1024px master before downscale."""
    w, h = img.size
    assert w == h == RENDER_SIZE
    cx, cy = int(w * 0.48), int(h * 0.44)
    glass = img.getpixel((cx, cy))
    assert glass[:3] == LENS_FILL[:3], f"unexpected lens fill at center: {glass}"
    # Must contain both glyph colors inside the icon
    pixels = img.getdata()
    has_white_glyph = any(p[0] > 240 and p[1] > 240 and p[2] > 240 and p[3] > 0 for p in pixels)
    has_cyan_glyph = any(
        abs(p[0] - CYAN[0]) < 8 and abs(p[1] - CYAN[1]) < 8 and abs(p[2] - CYAN[2]) < 8 and p[3] > 0
        for p in pixels
    )
    assert has_white_glyph and has_cyan_glyph, "missing 文 or A glyph pixels"


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
    master = draw_icon(RENDER_SIZE)
    validate_icon(master)
    icon = master.resize((OUT_SIZE, OUT_SIZE), Image.Resampling.LANCZOS)

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
