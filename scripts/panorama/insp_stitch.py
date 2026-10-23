"""Stitch Insta360 X5 .insp dual-fisheye images into equirectangular panoramas.

Lens model: unified omnidirectional (Mei) camera with xi and radial polynomial,
parameters parsed from the .insp trailer (record 0x101). Calibration values are
defined for a 5376px-per-lens sensor stored rotated 90 degrees, so centres are
swapped (x <- cy, y <- cx) and scaled to the stored resolution.
"""
import re, struct, sys, json, math
import numpy as np
import cv2


def read_calib(path):
    d = open(path, 'rb').read()
    total, = struct.unpack('<I', d[-40:-36])
    trailer = d[-total:]
    strs = [s.decode() for s in re.findall(rb'2_2\.000000_[0-9_.\-]+', trailer)]
    # first 5-coefficient variant: per lens 20 fields
    s = [x for x in strs if '_0.18353134' in x or len(x.split('_')) in (45, 46)]
    s = strs[0] if not s else s[0]
    f = s.split('_')[1:]
    lenses = []
    for i in range(2):
        g = [float(v) for v in f[i * 19:(i + 1) * 19]]
        xi, fx, fy, cx, cy, ry, rp, rr, tx, ty, tz, k1, k2, k3, p1, p2, W, H, _ = g[:19]
        lenses.append(dict(xi=xi, f=(fx + fy) / 2, cx=cx - i * 5376, cy=cy, rot=(ry, rp, rr),
                           t=(tx, ty, tz), k=(k1, k2, k3)))
    return lenses


def radius_px(theta, L, scale):
    xi = L['xi']
    k1, k2, k3 = L['k']
    xs = np.sin(theta) / (np.cos(theta) + xi)
    r2 = xs * xs
    rd = xs * (1 + k1 * r2 + k2 * r2 * r2 + k3 * r2 * r2 * r2)
    return L['f'] * rd * scale


def rot_matrix(yaw, pitch, roll):
    y, p, r = np.radians([yaw, pitch, roll])
    Ry = np.array([[math.cos(y), 0, math.sin(y)], [0, 1, 0], [-math.sin(y), 0, math.cos(y)]])
    Rx = np.array([[1, 0, 0], [0, math.cos(p), -math.sin(p)], [0, math.sin(p), math.cos(p)]])
    Rz = np.array([[math.cos(r), -math.sin(r), 0], [math.sin(r), math.cos(r), 0], [0, 0, 1]])
    return Rz @ Rx @ Ry


def build_maps(lenses, S, W, Hh, params):
    """Return per-lens (mapx, mapy, theta) for an equirect of size W x Hh."""
    lon = (np.arange(W) + 0.5) / W * 2 * np.pi - np.pi
    lat = np.pi / 2 - (np.arange(Hh) + 0.5) / Hh * np.pi
    lon, lat = np.meshgrid(lon, lat)
    d = np.stack([np.cos(lat) * np.sin(lon), np.sin(lat), np.cos(lat) * np.cos(lon)], -1)
    scale = S / 5376.0
    out = []
    for i, L in enumerate(lenses):
        v = d.copy()
        if i == 1:
            v = v * np.array([-1, 1, -1])  # back lens: rotate 180 deg about vertical
            R = rot_matrix(*params['rel'])
            v = v @ R.T
            # parallax: lens offset along optical axis, scene assumed at distance D
            v = v * params['D'] - np.array([0, 0, params['tz']])
            v /= np.linalg.norm(v, axis=-1, keepdims=True)
        else:
            R = rot_matrix(*params['rel0'])
            v = v @ R.T
        x, y, z = v[..., 0], v[..., 1], v[..., 2]
        theta = np.arccos(np.clip(z, -1, 1))
        phi = np.arctan2(y, x)
        r = radius_px(theta, L, scale) * params['fs']
        cx = L['cy'] * scale + i * S  # swapped axes (sensor stored rotated 90deg)
        cy = L['cx'] * scale
        mx = (cx + r * np.cos(phi)).astype(np.float32)
        my = (cy - r * np.sin(phi)).astype(np.float32)
        out.append((mx, my, theta))
    return out


def seam_cost(img, lenses, params, W=1024):
    Hh = W // 2
    S = img.shape[0]
    maps = build_maps(lenses, S, W, Hh, params)
    a = cv2.remap(img, maps[0][0], maps[0][1], cv2.INTER_LINEAR).astype(np.float32)
    b = cv2.remap(img, maps[1][0], maps[1][1], cv2.INTER_LINEAR).astype(np.float32)
    t = maps[0][2]
    band = (np.abs(t - np.pi / 2) < np.radians(4)) & (np.abs(np.pi / 2 - np.abs(np.linspace(np.pi/2, -np.pi/2, Hh)))[:, None] > np.radians(8))
    ga = cv2.Laplacian(cv2.GaussianBlur(a.mean(-1), (3, 3), 0), cv2.CV_32F)
    gb = cv2.Laplacian(cv2.GaussianBlur(b.mean(-1), (3, 3), 0), cv2.CV_32F)
    return float(np.abs(ga - gb)[band].mean() + 0.2 * np.abs(a - b)[band].mean())


def optimise(img, lenses):
    p = dict(rel=[0.0, 0.0, 0.0], rel0=[0.0, 0.0, 0.0], D=2.0, tz=0.0, fs=1.0)
    best = seam_cost(img, lenses, p)
    print(' start cost', round(best, 3))
    steps = {'rel0': 0.0, 'rel': 1.0, 'tz': 0.02, 'fs': 0.01}
    for it in range(5):
        for key, st in steps.items():
            if st == 0: continue
            idxs = range(3) if isinstance(p[key], list) else [None]
            for j in idxs:
                for sgn in (+1, -1):
                    while True:
                        q = json.loads(json.dumps(p))
                        if j is None: q[key] += sgn * st
                        else: q[key][j] += sgn * st
                        c = seam_cost(img, lenses, q)
                        if c < best - 1e-4:
                            best, p = c, q
                        else:
                            break
        steps = {k: v / 2 for k, v in steps.items()}
        print(' iter', it, round(best, 3), p)
    return p


WRAP = 512  # columns of horizontal wrap padding for any neighbourhood filter


def wrap_pad(x, p=WRAP):
    """Pad an equirectangular image left/right with its own opposite edge, so
    filters see the 360° image as continuous (no seam at the ±180° edge)."""
    return np.concatenate([x[:, -p:], x, x[:, :p]], axis=1)


def unpad(x, p=WRAP):
    return x[:, p:-p]


def _dp_seam(cost, start_row=None):
    """Min-cost path across columns (one row per column, steps of ±1 row)."""
    R, N = cost.shape
    inf = np.float32(1e12)
    acc = np.full((R, N), inf, np.float32)
    back = np.zeros((R, N), np.int8)
    acc[:, 0] = cost[:, 0] if start_row is None else inf
    if start_row is not None:
        acc[start_row, 0] = cost[start_row, 0]
    for j in range(1, N):
        prev = acc[:, j - 1]
        up = np.concatenate([[inf], prev[:-1]])
        down = np.concatenate([prev[1:], [inf]])
        stack = np.stack([up, prev, down])
        k = stack.argmin(0)
        acc[:, j] = cost[:, j] + stack[k, np.arange(R)]
        back[:, j] = k - 1
    return acc, back


def _backtrack(back, end_row):
    R, N = back.shape
    path = np.empty(N, np.int32)
    path[-1] = end_row
    for j in range(N - 1, 0, -1):
        path[j - 1] = path[j] + back[path[j], j]
    return path


def seam_weights(a, b, theta, W, Hh, band_deg=7.0, feather_deg=0.35):
    """Optimal seam between the two lenses.

    The lens overlap is a band around the great circle 90° from the front lens
    axis. Sample both lenses into a strip (azimuth around the front axis ×
    angle from it), find the closed path where they agree best (so moving
    objects such as a ceiling fan come from one lens instead of ghosting), and
    return the front-lens weight for every output pixel.
    """
    N = W
    R = max(16, int(round(2 * band_deg / 360 * W)))
    phi = (np.arange(N) + 0.5) / N * 2 * np.pi
    th = np.radians(90 - band_deg) + (np.arange(R) + 0.5) / R * np.radians(2 * band_deg)
    PHI, TH = np.meshgrid(phi, th)
    x, y, z = np.sin(TH) * np.cos(PHI), np.sin(TH) * np.sin(PHI), np.cos(TH)
    lon, lat = np.arctan2(x, z), np.arcsin(np.clip(y, -1, 1))
    mx = ((lon + np.pi) / (2 * np.pi) * W - 0.5).astype(np.float32)
    my = ((np.pi / 2 - lat) / np.pi * Hh - 0.5).astype(np.float32)
    sa = cv2.remap(a, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_WRAP)
    sb = cv2.remap(b, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_WRAP)
    diff = cv2.GaussianBlur(np.abs(sa - sb).sum(-1), (0, 0), 1.5)
    edges = sum(np.abs(cv2.Sobel(cv2.cvtColor(s_, cv2.COLOR_BGR2GRAY), cv2.CV_32F, dx, dy))
                for s_ in (sa, sb) for dx, dy in ((1, 0), (0, 1)))
    centre = ((th - np.radians(90)) / np.radians(band_deg))[:, None] ** 2
    cost = (diff + 0.15 * edges + 25.0 * centre).astype(np.float32)
    # 1st pass finds a good row; 2nd pass starts and ends there → closed loop.
    acc, _ = _dp_seam(cost)
    loop_row = int(acc[:, -1].argmin())
    acc, back = _dp_seam(cost, start_row=loop_row)
    seam_th = th[_backtrack(back, loop_row)]  # (N,) seam angle for each azimuth

    # front-lens weight per output pixel
    lonO = (np.arange(W) + 0.5) / W * 2 * np.pi - np.pi
    latO = np.pi / 2 - (np.arange(Hh) + 0.5) / Hh * np.pi
    lonO, latO = np.meshgrid(lonO, latO)
    dx, dy = np.cos(latO) * np.sin(lonO), np.sin(latO)
    phiO = np.mod(np.arctan2(dy, dx), 2 * np.pi)
    idx = np.minimum((phiO / (2 * np.pi) * N).astype(np.int32), N - 1)
    return np.clip((seam_th[idx] - theta) / np.radians(feather_deg) + 0.5, 0, 1).astype(np.float32)


def render(path, W, params, lenses, interp=cv2.INTER_LANCZOS4):
    """Stitch one capture into a W x W/2 equirectangular image (uint8 BGR)."""
    img = cv2.imread(path)
    S = img.shape[0]
    Hh = W // 2
    maps = build_maps(lenses, S, W, Hh, params)
    a = cv2.remap(img, maps[0][0], maps[0][1], interp, borderMode=cv2.BORDER_REPLICATE).astype(np.float32)
    b = cv2.remap(img, maps[1][0], maps[1][1], interp, borderMode=cv2.BORDER_REPLICATE).astype(np.float32)
    t = maps[0][2]
    del maps
    # exposure compensation in overlap band
    band = np.abs(t - np.pi / 2) < np.radians(5)
    gain = (a[band].mean(0) + 1) / (b[band].mean(0) + 1)
    g = np.sqrt(gain)
    a /= g; b *= g
    w = seam_weights(a, b, t, W, Hh)
    del t
    # multi-band blend along the seam, wrap-padded so ±180° stays continuous
    out = unpad(multiband(wrap_pad(a), wrap_pad(b), wrap_pad(w), levels=4))
    del a, b
    out = nadir_cap(np.clip(out, 0, 255).astype(np.float32))
    return np.clip(out, 0, 255).astype(np.uint8)


def stitch(path, out_path, W, params, lenses):
    cv2.imwrite(out_path, render(path, W, params, lenses), [cv2.IMWRITE_JPEG_QUALITY, 88, cv2.IMWRITE_JPEG_PROGRESSIVE, 1])


def nadir_cap(img, lat0=-71.0, feather=5.0):
    """Hide tripod + lens rim at the nadir: fill below lat0 with floor colour
    sampled from the ring at lat0, smoothed towards the pole."""
    Hh, W = img.shape[:2]
    row0 = int((90 - lat0) / 180 * Hh)
    ring = img[row0 - 6:row0].mean(0)  # (W,3)
    ring = unpad(cv2.GaussianBlur(wrap_pad(ring[None], W // 4), (0, 0), sigmaX=W / 60), W // 4)[0]
    mean = ring.mean(0)
    rows = np.arange(Hh)
    lat = 90 - (rows + 0.5) / Hh * 180
    out = img.copy()
    for r in range(row0 - int(feather / 180 * Hh), Hh):
        t = np.clip((lat0 - lat[r]) / (90 + lat0), 0, 1)  # 0 at ring, 1 at pole
        fill = ring * (1 - t) + mean * t
        a = np.clip((lat0 + feather - lat[r]) / feather, 0, 1)
        out[r] = img[r] * (1 - a) + fill * a
    return out


def multiband(a, b, w, levels=5):
    ga, gb, gw = [a], [b], [w]
    for _ in range(levels):
        ga.append(cv2.pyrDown(ga[-1])); gb.append(cv2.pyrDown(gb[-1])); gw.append(cv2.pyrDown(gw[-1]))
    def lap(g):
        l = []
        for i in range(levels):
            up = cv2.pyrUp(g[i + 1], dstsize=(g[i].shape[1], g[i].shape[0]))
            l.append(g[i] - up)
        l.append(g[-1]); return l
    la, lb = lap(ga), lap(gb)
    res = None
    for i in range(levels, -1, -1):
        ww = gw[i][..., None]
        blended = la[i] * ww + lb[i] * (1 - ww)
        if res is None: res = blended
        else: res = cv2.pyrUp(res, dstsize=(blended.shape[1], blended.shape[0])) + blended
    return res


if __name__ == '__main__':
    mode = sys.argv[1]
    if mode == 'optimise':
        path = sys.argv[2]
        lenses = read_calib(path)
        print(json.dumps(lenses, indent=1))
        img = cv2.imread(path)
        p = optimise(img, lenses)
        print('PARAMS', json.dumps(p))
    elif mode == 'stitch':
        path, out, W, pj = sys.argv[2], sys.argv[3], int(sys.argv[4]), sys.argv[5]
        lenses = read_calib(path)
        stitch(path, out, W, json.loads(pj), lenses)
