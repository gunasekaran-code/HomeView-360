"""Build every web panorama asset from the stitched Insta360 360° JPG exports.

Usage (from the repo root):
    python3 -m venv .venv-pano && .venv-pano/bin/pip install -r scripts/panorama/requirements.txt
    .venv-pano/bin/python scripts/panorama/build_panoramas.py

For each scene this writes to public/panoramas/:
    <id>.jpg          native-resolution equirectangular (desktop / tablets)
    <id>-4k.jpg       4096x2048 equirectangular (phones / low-memory GPUs)
    <id>-preview.jpg  1024x512 low-res equirectangular (instant placeholder)
    <id>-thumb.jpg    640x400 rectilinear thumbnail of the scene's start view
"""
import json, math, os
import numpy as np
import cv2

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))

# `yaw` rotates each export so its centre matches the orientation the hotspot
# and initialView angles in src/config/tour.ts were measured on (Insta360
# exports face the opposite lens). Thumbnail yaw/pitch match `initialView`.
SCENES = [
    {"id": "living-room", "file": "IMG_5702.JPG.jpeg", "yaw": 178.95, "thumb": (0, -8)},
    {"id": "kitchen", "file": "IMG_5703.JPG.jpeg", "yaw": 178.77, "thumb": (0, -8)},
    {"id": "bedroom", "file": "IMG_5705.JPG.jpeg", "yaw": 178.77, "thumb": (10, -8)},
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


def main():
    src_dir = os.path.join(ROOT, 'assets', 'jpg assets')
    out_dir = os.path.join(ROOT, 'public', 'panoramas')
    os.makedirs(out_dir, exist_ok=True)
    jpg = lambda q: [cv2.IMWRITE_JPEG_QUALITY, q, cv2.IMWRITE_JPEG_PROGRESSIVE, 1]
    for s in SCENES:
        equi = cv2.imread(os.path.join(src_dir, s['file']))
        H, W = equi.shape[:2]
        assert W == 2 * H, f"{s['file']} is not a 2:1 equirectangular image"
        print('processing', s['file'], f'{W}x{H}')
        # Yaw is a pure horizontal wrap of an equirectangular image: no resampling.
        equi = np.roll(equi, round(s['yaw'] / 360 * W), axis=1)
        cv2.imwrite(os.path.join(out_dir, f"{s['id']}.jpg"), equi, jpg(95))
        cv2.imwrite(os.path.join(out_dir, f"{s['id']}-4k.jpg"),
                    cv2.resize(equi, (4096, 2048), interpolation=cv2.INTER_AREA), jpg(88))
        cv2.imwrite(os.path.join(out_dir, f"{s['id']}-preview.jpg"),
                    cv2.resize(equi, (1024, 512), interpolation=cv2.INTER_AREA), jpg(70))
        yaw, pitch = s['thumb']
        cv2.imwrite(os.path.join(out_dir, f"{s['id']}-thumb.jpg"),
                    perspective(equi, yaw, pitch, 100, 640, 400), jpg(82))
    print(json.dumps({"scenes": [s['id'] for s in SCENES]}))


if __name__ == '__main__':
    main()
