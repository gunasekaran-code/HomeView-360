"""Generate the original, royalty-free background loop used by the tour.

    python3 scripts/music/generate_ambient.py   (needs numpy + ffmpeg)

A tanpura-style drone (Sa-Pa-Sa'-Sa) with sparse Karplus-Strong plucks in
raga Mohanam (S R2 G3 P D2) over a soft pad. Every note tail and the reverb
are wrapped circularly, so the loop point is seamless.
Output: public/audio/music/ambient-loop.mp3
"""
import os, subprocess, tempfile, wave
import numpy as np

SR = 44100
BEATS = 64
BPM = 60
LOOP = int(SR * BEATS * 60 / BPM)  # 64 s
SA = 146.83  # D3
rng = np.random.default_rng(360)
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))


def ks_pluck(freq, dur, decay=0.996, bright=0.5):
    """Karplus-Strong string, vectorised one period at a time."""
    n = int(SR * dur)
    p = max(2, int(round(SR / freq)))
    buf = rng.uniform(-1, 1, p)
    # soften the excitation for a mellow tone
    for _ in range(int(3 * (1 - bright)) + 1):
        buf = 0.5 * (buf + np.roll(buf, 1))
    out = np.empty(n)
    pos = 0
    while pos < n:
        k = min(p, n - pos)
        out[pos:pos + k] = buf[:k]
        buf = decay * 0.5 * (buf + np.roll(buf, -1))
        pos += k
    return out


def add(track, sig, start):
    """Mix `sig` into the circular `track` starting at sample `start`."""
    idx = (start + np.arange(len(sig))) % LOOP
    np.add.at(track, idx, sig)


def tanpura(freq, dur):
    t = np.arange(int(SR * dur)) / SR
    env = np.exp(-t / 3.2) * (1 - np.exp(-t * 60))
    sig = np.zeros_like(t)
    for h in range(1, 14):
        # jawari: rich, slowly beating upper partials
        amp = (1 / h) * (1 + 0.6 * np.sin(2 * np.pi * (0.35 + 0.07 * h) * t + h))
        sig += amp * np.sin(2 * np.pi * freq * h * t * (1 + 0.0004 * h))
    return sig * env


def pad(chord_freqs, dur):
    t = np.arange(int(SR * dur)) / SR
    env = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 2
    sig = np.zeros_like(t)
    for f in chord_freqs:
        for det in (-0.12, 0.0, 0.12):
            sig += np.sin(2 * np.pi * (f + det) * t) + 0.25 * np.sin(2 * np.pi * 2 * (f + det) * t)
    return sig * env / (len(chord_freqs) * 3)


def reverb(x, seconds=3.5, mix=0.35):
    n = int(SR * seconds)
    ir = rng.standard_normal(n) * np.exp(-np.arange(n) / (SR * seconds / 6.5))
    ir = np.convolve(ir, np.ones(8) / 8, 'same')  # darker tail
    IR = np.fft.rfft(np.pad(ir, (0, LOOP - n)))
    wet = np.fft.irfft(np.fft.rfft(x) * IR, LOOP)  # circular → seamless loop
    wet *= np.abs(x).max() / (np.abs(wet).max() + 1e-9)
    return (1 - mix) * x + mix * wet


def main():
    beat = SR * 60 // BPM
    L = np.zeros(LOOP); R = np.zeros(LOOP)

    # tanpura cycle: Pa, Sa', Sa', Sa — one string every beat
    for b in range(BEATS):
        f = [SA * 0.75, SA, SA, SA / 2][b % 4]
        s = tanpura(f, 4.5) * 0.08
        add(L, s, b * beat + int(rng.integers(0, 400)))
        add(R, s, b * beat + int(rng.integers(0, 400)))

    # pad: gentle movement between Sa and Pa colours, 16 beats each
    ratios = {'S': 1, 'R': 9 / 8, 'G': 5 / 4, 'P': 3 / 2, 'D': 5 / 3}
    chords = [['S', 'G', 'P'], ['R', 'P', 'D'], ['S', 'G', 'D'], ['R', 'G', 'P']]
    for i, ch in enumerate(chords):
        p = pad([SA * ratios[n] for n in ch], 20) * 0.05
        add(L, p, i * 16 * beat - 2 * beat)
        add(R, p, i * 16 * beat - 2 * beat + 300)

    # sparse plucked melody in Mohanam
    scale = [SA * ratios[n] * o for o in (2, 4) for n in 'SRGPD']
    deg = 2
    for b in range(0, BEATS, 1):
        if rng.random() < 0.45:
            deg = int(np.clip(deg + rng.choice([-2, -1, 1, 2]), 0, len(scale) - 1))
            note = ks_pluck(scale[deg], 3.5, decay=0.9975, bright=0.3) * 0.16
            off = b * beat + (beat // 2 if rng.random() < 0.3 else 0)
            pan = rng.uniform(0.3, 0.7)
            add(L, note * (1 - pan), off); add(R, note * pan, off)

    L, R = reverb(L), reverb(R)
    st = np.stack([L, R], 1)
    st /= np.abs(st).max() / 0.7
    pcm = (st * 32767).astype('<i2')

    out_dir = os.path.join(ROOT, 'public', 'audio', 'music')
    os.makedirs(out_dir, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        wav = os.path.join(tmp, 'loop.wav')
        with wave.open(wav, 'wb') as w:
            w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-b:a', '128k',
                        os.path.join(out_dir, 'ambient-loop.mp3')], check=True)
    print('wrote', os.path.join(out_dir, 'ambient-loop.mp3'), f'{LOOP / SR:.1f}s')


if __name__ == '__main__':
    main()
