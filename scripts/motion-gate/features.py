"""
Motion-feature extraction — the Python mirror of src/lib/js/motionFeatures.ts.

The in-browser gate model must be fed the SAME features it was trained on, so
this file reproduces the TypeScript computation bit-for-bit. The parity is
checked two ways:
  * `python features.py --selftest` reproduces the exact vectors pinned by the
    TS unit test (tests/unit/fitness/motionFeatures.test.ts).
  * Any formula change must land in both files in the same commit.

Landmarks are passed as an (33, 3) float array of (x, y, visibility) in
MediaPipe's normalized image coords (z is unused by every emitted feature).
"""

from __future__ import annotations

import math
import numpy as np

# --- must match FEATURE_NAMES in motionFeatures.ts, in order (append-only) ---
FEATURE_NAMES = [
    "kneeAngle",
    "elbowAngle",
    "hipAngle",
    "shoulderElev",
    "spineAngle",
    "hipVx",
    "hipVy",
    "scale",
    "scaleRate",
    "kneeAsym",
    "ankleAsym",
    "wristHeight",
    "wristSpread",
    "motionEnergy",
    "trackQuality",
]
FEATURE_DIM = len(FEATURE_NAMES)
FIDX = {n: i for i, n in enumerate(FEATURE_NAMES)}

WINDOW_FRAMES = 32
WINDOW_MS = 2000

MIN_VISIBILITY = 0.5
EPS = 1e-6

# MediaPipe BlazePose landmark indices (mirror of LM in poseCoach.ts).
LM = dict(
    leftEar=7, rightEar=8,
    leftShoulder=11, rightShoulder=12,
    leftElbow=13, rightElbow=14,
    leftWrist=15, rightWrist=16,
    leftHip=23, rightHip=24,
    leftKnee=25, rightKnee=26,
    leftAnkle=27, rightAnkle=28,
)

JOINT_TRIPLETS = {
    "knee": ([LM["leftHip"], LM["leftKnee"], LM["leftAnkle"]],
             [LM["rightHip"], LM["rightKnee"], LM["rightAnkle"]]),
    "elbow": ([LM["leftShoulder"], LM["leftElbow"], LM["leftWrist"]],
              [LM["rightShoulder"], LM["rightElbow"], LM["rightWrist"]]),
    "hip": ([LM["leftShoulder"], LM["leftHip"], LM["leftKnee"]],
            [LM["rightShoulder"], LM["rightHip"], LM["rightKnee"]]),
    "shoulder": ([LM["leftHip"], LM["leftShoulder"], LM["leftElbow"]],
                 [LM["rightHip"], LM["rightShoulder"], LM["rightElbow"]]),
}
SPINE_TRIPLETS = ([LM["leftEar"], LM["leftShoulder"], LM["leftHip"]],
                  [LM["rightEar"], LM["rightShoulder"], LM["rightHip"]])

CORE_LANDMARKS = [LM["leftShoulder"], LM["rightShoulder"], LM["leftHip"],
                  LM["rightHip"], LM["leftKnee"], LM["rightKnee"]]


def _vis(lms, i):
    return float(lms[i, 2])


def _y(lms, i):
    return float(lms[i, 1]) if _vis(lms, i) >= MIN_VISIBILITY else math.nan


def _angle_deg(a, b, c):
    abx, aby = a[0] - b[0], a[1] - b[1]
    cbx, cby = c[0] - b[0], c[1] - b[1]
    mag_ab = math.hypot(abx, aby)
    mag_cb = math.hypot(cbx, cby)
    if mag_ab < EPS or mag_cb < EPS:
        return math.nan
    cos = max(-1.0, min(1.0, (abx * cbx + aby * cby) / (mag_ab * mag_cb)))
    return math.degrees(math.acos(cos))


def _triplet_visible(lms, tri):
    return all(_vis(lms, i) >= MIN_VISIBILITY for i in tri)


def _triplet_angle(lms, tri):
    if not _triplet_visible(lms, tri):
        return math.nan
    a, b, c = (lms[tri[0], :2], lms[tri[1], :2], lms[tri[2], :2])
    return _angle_deg(a, b, c)


def _measure_angle(lms, pair):
    left, right = pair
    lok, rok = _triplet_visible(lms, left), _triplet_visible(lms, right)
    la = _triplet_angle(lms, left) if lok else math.nan
    ra = _triplet_angle(lms, right) if rok else math.nan
    if lok and rok:
        return (la + ra) / 2
    if lok:
        return la
    if rok:
        return ra
    return math.nan


def _joint_angle(lms, joint):
    return _measure_angle(lms, JOINT_TRIPLETS[joint])


def _spine_angle(lms):
    return _measure_angle(lms, SPINE_TRIPLETS)


def _raise_spread(lms):
    ls, rs = lms[LM["leftShoulder"]], lms[LM["rightShoulder"]]
    width = abs(ls[0] - rs[0])
    if width < 0.08:
        return math.nan
    center = (ls[0] + rs[0]) / 2
    spreads = []
    for sh, wr in ((LM["leftShoulder"], LM["leftWrist"]),
                   (LM["rightShoulder"], LM["rightWrist"])):
        if _vis(lms, sh) < MIN_VISIBILITY or _vis(lms, wr) < MIN_VISIBILITY:
            continue
        spreads.append((abs(lms[wr, 0] - center) - abs(lms[sh, 0] - center)) / width)
    if not spreads:
        return math.nan
    return sum(spreads) / len(spreads)


def _mean_finite(*vals):
    ok = [v for v in vals if math.isfinite(v)]
    return sum(ok) / len(ok) if ok else math.nan


def _set(vec, name, v):
    vec[FIDX[name]] = v if math.isfinite(v) else 0.0


def static_features(lms):
    """Velocity-free features for one frame. Returns (vec, scale, hip, angles).

    `lms` is an (33, 3) array or None. Untracked signals collapse to 0 in `vec`;
    `scale`/`hip` are returned NaN/None so the windower can fill velocity terms.
    """
    vec = np.zeros(FEATURE_DIM, dtype=np.float32)
    if lms is None:
        return vec, math.nan, None, dict(knee=math.nan, elbow=math.nan, hip=math.nan)

    lms = np.asarray(lms, dtype=np.float64)
    hip_mid = (lms[LM["leftHip"], :2] + lms[LM["rightHip"], :2]) / 2
    sh_mid = (lms[LM["leftShoulder"], :2] + lms[LM["rightShoulder"], :2]) / 2
    torso = math.hypot(sh_mid[0] - hip_mid[0], sh_mid[1] - hip_mid[1])
    scale = torso if (math.isfinite(torso) and torso > EPS) else math.nan
    s = scale if math.isfinite(scale) else 1.0

    knee = _joint_angle(lms, "knee")
    elbow = _joint_angle(lms, "elbow")
    hip = _joint_angle(lms, "hip")
    shoulder = _joint_angle(lms, "shoulder")
    spine = _spine_angle(lms)

    _set(vec, "kneeAngle", knee / 180)
    _set(vec, "elbowAngle", elbow / 180)
    _set(vec, "hipAngle", hip / 180)
    _set(vec, "shoulderElev", shoulder / 180)
    _set(vec, "spineAngle", spine / 180)
    _set(vec, "scale", scale)

    knee_l = _triplet_angle(lms, [LM["leftHip"], LM["leftKnee"], LM["leftAnkle"]])
    knee_r = _triplet_angle(lms, [LM["rightHip"], LM["rightKnee"], LM["rightAnkle"]])
    if math.isfinite(knee_l) and math.isfinite(knee_r):
        _set(vec, "kneeAsym", (knee_l - knee_r) / 180)

    ankle_ly, ankle_ry = _y(lms, LM["leftAnkle"]), _y(lms, LM["rightAnkle"])
    if math.isfinite(ankle_ly) and math.isfinite(ankle_ry):
        _set(vec, "ankleAsym", (ankle_ly - ankle_ry) / s)

    wrist_y = _mean_finite(_y(lms, LM["leftWrist"]), _y(lms, LM["rightWrist"]))
    if math.isfinite(wrist_y):
        _set(vec, "wristHeight", (hip_mid[1] - wrist_y) / s)

    _set(vec, "wristSpread", _raise_spread(lms))
    _set(vec, "trackQuality", _mean_finite(*[_vis(lms, i) for i in CORE_LANDMARKS]))

    return (vec, scale, (float(hip_mid[0]), float(hip_mid[1])),
            dict(knee=knee, elbow=elbow, hip=hip))


def _abs_delta(a, b):
    return abs(a - b) if (math.isfinite(a) and math.isfinite(b)) else math.nan


class MotionFeatureWindow:
    """Rolling window mirroring the TS class: push frames, resample to a fixed
    WINDOW_FRAMES x FEATURE_DIM tensor. Used to preprocess training clips the
    same way inference builds its input."""

    def __init__(self):
        self.history = []  # list of (t, vec, scale, hip, angles)

    def reset(self):
        self.history = []

    def push(self, lms, now):
        vec, scale, hip, angles = static_features(lms)
        if self.history:
            pt, _, pscale, phip, pangles = self.history[-1]
            dt = (now - pt) / 1000
            if dt > EPS:
                sc = scale if math.isfinite(scale) else (pscale if math.isfinite(pscale) else 1.0)
                if hip is not None and phip is not None:
                    _set(vec, "hipVx", (hip[0] - phip[0]) / sc / dt)
                    _set(vec, "hipVy", (hip[1] - phip[1]) / sc / dt)
                if math.isfinite(scale) and math.isfinite(pscale):
                    _set(vec, "scaleRate", (scale - pscale) / dt)
                d_ang = _mean_finite(
                    _abs_delta(angles["knee"], pangles["knee"]),
                    _abs_delta(angles["elbow"], pangles["elbow"]),
                    _abs_delta(angles["hip"], pangles["hip"]),
                )
                if math.isfinite(d_ang):
                    _set(vec, "motionEnergy", d_ang / dt / 180)
        self.history.append((now, vec, scale, hip, angles))
        cutoff = now - WINDOW_MS * 1.5
        while len(self.history) > 2 and self.history[0][0] < cutoff:
            self.history.pop(0)

    @property
    def ready(self):
        if len(self.history) < 2:
            return False
        return (self.history[-1][0] - self.history[0][0]) >= WINDOW_MS * 0.5

    def _sample_at(self, t):
        h = self.history
        if t <= h[0][0]:
            return h[0][1]
        if t >= h[-1][0]:
            return h[-1][1]
        hi = 1
        while hi < len(h) and h[hi][0] < t:
            hi += 1
        a, b = h[hi - 1], h[hi]
        span = b[0] - a[0]
        w = (t - a[0]) / span if span > EPS else 0.0
        return a[1] + (b[1] - a[1]) * w

    def tensor(self):
        if not self.ready:
            return None
        end = self.history[-1][0]
        start = end - WINDOW_MS
        rows = []
        for i in range(WINDOW_FRAMES):
            t = start + WINDOW_MS * i / (WINDOW_FRAMES - 1)
            rows.append(self._sample_at(t))
        return np.stack(rows).astype(np.float32)


def _upright_pose(shift_x=0.0):
    lms = np.zeros((33, 3), dtype=np.float64)
    pts = {
        LM["leftEar"]: (0.45, 0.2), LM["rightEar"]: (0.55, 0.2),
        LM["leftShoulder"]: (0.45, 0.3), LM["rightShoulder"]: (0.55, 0.3),
        LM["leftElbow"]: (0.45, 0.45), LM["rightElbow"]: (0.55, 0.45),
        LM["leftWrist"]: (0.45, 0.6), LM["rightWrist"]: (0.55, 0.6),
        LM["leftHip"]: (0.45, 0.6), LM["rightHip"]: (0.55, 0.6),
        LM["leftKnee"]: (0.45, 0.8), LM["rightKnee"]: (0.55, 0.8),
        LM["leftAnkle"]: (0.45, 1.0), LM["rightAnkle"]: (0.55, 1.0),
    }
    for i, (x, y) in pts.items():
        lms[i] = (x + shift_x, y, 1.0)
    return lms


def _selftest():
    """Reproduce the values pinned by the TS unit test; exit nonzero on drift."""
    vec, scale, _, _ = static_features(_upright_pose())
    checks = {
        "kneeAngle": 1.0, "elbowAngle": 1.0, "hipAngle": 1.0, "spineAngle": 1.0,
        "shoulderElev": 0.0, "scale": 0.3, "kneeAsym": 0.0, "ankleAsym": 0.0,
        "wristHeight": 0.0, "wristSpread": 0.0, "trackQuality": 1.0,
        "hipVx": 0.0, "hipVy": 0.0, "scaleRate": 0.0, "motionEnergy": 0.0,
    }
    ok = True
    for name, exp in checks.items():
        got = float(vec[FIDX[name]])
        if abs(got - exp) > 1e-5:
            print(f"  MISMATCH {name}: got {got:.6f} expected {exp}")
            ok = False

    # Velocity parity: +0.05 x-shift every 0.1 s → hipVx = (0.05/0.3)/0.1 = 1.6667
    w = MotionFeatureWindow()
    for i in range(12):
        w.push(_upright_pose(0.05 * i), i * 100)
    t = w.tensor()
    last = t[-1]
    if abs(float(last[FIDX["hipVx"]]) - 1.6667) > 1e-3:
        print(f"  MISMATCH hipVx: got {float(last[FIDX['hipVx']]):.4f} expected 1.6667")
        ok = False
    if t.shape != (WINDOW_FRAMES, FEATURE_DIM):
        print(f"  MISMATCH tensor shape: {t.shape}")
        ok = False

    print("parity OK" if ok else "PARITY FAILED")
    return 0 if ok else 1


if __name__ == "__main__":
    import sys
    if "--selftest" in sys.argv:
        sys.exit(_selftest())
    print(f"FEATURE_DIM={FEATURE_DIM}  WINDOW={WINDOW_FRAMES}x{FEATURE_DIM} over {WINDOW_MS}ms")
