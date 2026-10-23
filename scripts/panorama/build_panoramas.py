"""Build every web panorama asset from the raw Insta360 .insp captures.

Usage (from the repo root):
    python3 -m venv .venv-pano && .venv-pano/bin/pip install -r scripts/panorama/requirements.txt
    .venv-pano/bin/python scripts/panorama/build_panoramas.py

For each scene this writes to public/panoramas/:
    <id>-8k.jpg       8192x4096 equirectangular (high-DPI desktops)
    <id>.jpg          6144x3072 equirectangular (desktop / tablets)
    <id>-4k.jpg       4096x2048 equirectangular (phones / low-memory GPUs)
    <id>-preview.jpg  1024x512 low-res equirectangular (instant placeholder)
    <id>-thumb.jpg    640x400 rectilinear thumbnail of the scene's start view
"""
import json, math, os, sys
import numpy as np
import cv2

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, HERE)
import insp_stitch  # noqa: E402

# Shared lens alignment, fitted jointly across all three captures with
# `insp_stitch.py optimise` on top of the factory calibration in each file.
PARAMS = {"rel": [-0.125, -0.1875, 0.0], "rel0": [0, 0, 0], "D": 2.0, "tz": -0.02, "fs": 1.0}

# Thumbnail yaw/pitch in degrees, matched to `initialView` in src/config/tour.ts
SCENES = [
    {"id": "living-room", "file": "IMG_20261021_201713_00_278.insp", "thumb": (0, -8)},
    {"id": "kitchen", "file": "IMG_20261021_201940_00_279.insp", "thumb": (0, -8)},
    {"id": "bedroom", "file": "IMG_20261021_202026_00_280.insp", "thumb": (10, -8)},
]


def perspective(equi, yaw, pitch, hfov, w, h):
    H, W = equi.shape[:2]
    f = (w / 2) / math.tan(math.radians(hfov) / 2)
    xs, ys = np.meshgrid(np.arange(w) - w / 2 + 0.5, np.arange(h) - h / 2 + 0.5)
    d = np.stack([xs, -ys, np.full_like(xs, f)], -1)
    d /= np.linalg.norm(d, axis=-1, keepdims=True)
    p, y = math.radians(pitch), math.radians(yaw)
    Rx = np.array([[1, 0, 0], [0, math.cos(p), math.sin(p)], [0, -math.sin(p), math.cos(p)]])
    Ry = np.array([[math.cos(y), 0, math.sin(y)], [0, 1, 0], [-math.sin(y), 0, math.cos(y)]])
    d = d @ Rx.T @ Ry.T
    lon = np.arctan2(d[..., 0], d[..., 2])
    lat = np.arcsin(np.clip(d[..., 1], -1, 1))
    mx = ((lon + np.pi) / (2 * np.pi) * W - 0.5).astype(np.float32)
    my = ((np.pi / 2 - lat) / np.pi * H - 0.5).astype(np.float32)
    return cv2.remap(equi, mx, my, cv2.INTER_CUBIC, borderMode=cv2.BORDER_WRAP)


def enhance(img):
    """Gentle real-estate finish on the actual capture (no content changes):
    clarity (large-radius local contrast), edge sharpening that skips flat or
    noisy areas, and +8% vibrance. Every filter runs on wrap-padded data and is
    position-independent, so the ±180° edge of the panorama stays seamless."""
    p = 256
    x = insp_stitch.wrap_pad(img, p).astype(np.float32) / 255.0
    lab = cv2.cvtColor(x, cv2.COLOR_BGR2LAB)  # L in 0..100
    L = lab[..., 0]
    L = L + 0.18 * (L - cv2.GaussianBlur(L, (0, 0), 40))  # clarity
    d = L - cv2.GaussianBlur(L, (0, 0), 1.2)
    d[np.abs(d) < 0.8] = 0  # threshold keeps sensor noise from being amplified
    lab[..., 0] = np.clip(L + 0.7 * d, 0, 100)
    lab[..., 1:] *= 1.08  # vibrance
    out = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR) * 255.0
    return np.clip(insp_stitch.unpad(out, p), 0, 255).astype(np.uint8)


def main():
    src_dir = os.path.join(ROOT, 'assets')
    out_dir = os.path.join(ROOT, 'public', 'panoramas')
    os.makedirs(out_dir, exist_ok=True)
    jpg = lambda q: [cv2.IMWRITE_JPEG_QUALITY, q, cv2.IMWRITE_JPEG_PROGRESSIVE, 1]
    for s in SCENES:
        src = os.path.join(src_dir, s['file'])
        print('stitching', s['file'], '-> 8K master')
        # Stitch straight from the lens images at 8K (Lanczos), then downscale.
        master = enhance(insp_stitch.render(src, 8192, PARAMS, insp_stitch.read_calib(src)))
        cv2.imwrite(os.path.join(out_dir, f"{s['id']}-8k.jpg"), master, jpg(90))
        equi = cv2.resize(master, (6144, 3072), interpolation=cv2.INTER_AREA)
        cv2.imwrite(os.path.join(out_dir, f"{s['id']}.jpg"), equi, jpg(90))
        cv2.imwrite(os.path.join(out_dir, f"{s['id']}-4k.jpg"),
                    cv2.resize(master, (4096, 2048), interpolation=cv2.INTER_AREA), jpg(88))
        cv2.imwrite(os.path.join(out_dir, f"{s['id']}-preview.jpg"),
                    cv2.resize(equi, (1024, 512), interpolation=cv2.INTER_AREA), jpg(70))
        yaw, pitch = s['thumb']
        cv2.imwrite(os.path.join(out_dir, f"{s['id']}-thumb.jpg"),
                    perspective(equi, yaw, pitch, 100, 640, 400), jpg(82))
    print(json.dumps({"params": PARAMS, "scenes": [s['id'] for s in SCENES]}))


if __name__ == '__main__':
    main()
