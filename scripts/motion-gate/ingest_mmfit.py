"""
Ingest MM-Fit into motion-gate window sets (pretrain data).

MM-Fit (https://mmfit.github.io/) ships per-session 2D pose as a numpy array of
shape (2, N_frames, 19): axis0 = [x, y] in pixels; the 19 "joint" columns are a
leading frame-index column (col 0) followed by 18 COCO/OpenPose joints (col
1..18); plus a CSV of exercise sets (start_frame, end_frame, rep_count,
activity). It has NO per-joint confidence and NO walking — so:

  * rep   = frames inside a labelled exercise set
  * idle  = frames outside any set (rest between sets)
  * walk  = SYNTHESISED by applying camera-motion trajectories (pan + zoom, i.e.
            translation + scale drift) to real pose windows. That is exactly the
            app's failure mode ("walking to/from the rack" = the whole skeleton
            translating and changing size), which a treadmill HAR set wouldn't
            even reproduce.

Pose joints are mapped from MM-Fit's COCO-18 topology to the BlazePose-33 indices
features.py expects. The exact source resolution is unknown, so coords are scaled
per-session so the median torso length equals BlazePose's typical ~0.30 — landing
the `scale`/velocity features in the regime MediaPipe produces at inference. The
residual cross-domain gap (COCO vs BlazePose keypoint definitions, aspect ratio)
is what the app-recorded fine-tune (hybrid) corrects — so this is a PRETRAIN
checkpoint, not a ship-ready model.

    venv/bin/python ingest_mmfit.py --root data/mm-fit -o windows_mmfit.npz
"""

from __future__ import annotations

import argparse
import csv
import glob
import os

import numpy as np

from features import MotionFeatureWindow, WINDOW_FRAMES, FEATURE_DIM, WINDOW_MS, LM
from model import LABELS

FPS = 30.0  # MM-Fit skeleton sampling rate
STRIDE = 6  # window snapshot stride in frames (~5 windows/s)
TARGET_TORSO = 0.30  # normalize each session so median torso length → this (BlazePose regime)

# COCO-18 joint index → BlazePose-33 index. In the file these joints live at
# array column (index + 1); column 0 is the frame-number channel.
COCO18_TO_BLAZE = {
    2: LM["rightShoulder"], 3: LM["rightElbow"], 4: LM["rightWrist"],
    5: LM["leftShoulder"], 6: LM["leftElbow"], 7: LM["leftWrist"],
    8: LM["rightHip"], 9: LM["rightKnee"], 10: LM["rightAnkle"],
    11: LM["leftHip"], 12: LM["leftKnee"], 13: LM["leftAnkle"],
    16: LM["rightEar"], 17: LM["leftEar"],
}
# COCO-18 columns (index+1) of the shoulders/hips, for the torso-length calibration.
_C = lambda c: c + 1  # noqa: E731


def pose_to_blaze(pose: np.ndarray) -> np.ndarray:
    """(2, N, 19) MM-Fit pose → (N, 33, 3) BlazePose [x, y, vis], torso-normalized."""
    j = pose.shape[2]
    if j != 19:
        raise SystemExit(f"expected 19 columns (frame + 18 COCO joints), got {j}")
    n = pose.shape[1]
    xy = pose  # (2, N, 19); axis0 = [x, y]

    # Per-session isotropic scale so the median torso ≈ TARGET_TORSO.
    sh = (xy[:, :, _C(5)] + xy[:, :, _C(2)]) / 2  # shoulder mid, (2, N)
    hp = (xy[:, :, _C(11)] + xy[:, :, _C(8)]) / 2  # hip mid
    torso = np.hypot(sh[0] - hp[0], sh[1] - hp[1])  # (N,)
    med = float(np.median(torso[torso > 1e-6])) if np.any(torso > 1e-6) else 1.0
    d = med / TARGET_TORSO if med > 1e-6 else 1.0

    out = np.zeros((n, 33, 3), dtype=np.float64)
    for c, dst in COCO18_TO_BLAZE.items():
        out[:, dst, 0] = xy[0, :, _C(c)] / d
        out[:, dst, 1] = xy[1, :, _C(c)] / d
        out[:, dst, 2] = 1.0  # mapped joints present; others stay vis=0
    return out


def frame_labels(frame_ids: np.ndarray, sets: list) -> np.ndarray:
    """Per-frame class index: rep inside a labelled set, else idle."""
    rep = LABELS.index("rep")
    idle = LABELS.index("idle")
    lab = np.full(len(frame_ids), idle, dtype=np.int64)
    for start, end, _count, activity in sets:
        if activity == "none":
            continue
        lab[(frame_ids >= start) & (frame_ids <= end)] = rep
    return lab


def windows_from_session(pose: np.ndarray, sets: list) -> tuple[list, list]:
    frame_ids = pose[0, :, 0].astype(np.int64)
    lab = frame_labels(frame_ids, sets)
    blaze = pose_to_blaze(pose)

    w = MotionFeatureWindow()
    X, y = [], []
    win_frames = int(WINDOW_MS / 1000 * FPS)
    for i in range(len(frame_ids)):
        t = frame_ids[i] / FPS * 1000.0
        w.push(blaze[i], t)
        if not (w.ready and i % STRIDE == 0 and i >= win_frames):
            continue
        # Only keep windows that lie wholly inside one class (skip set boundaries).
        seg = lab[i - win_frames + 1:i + 1]
        if len(seg) and (seg == seg[0]).all():
            X.append(w.tensor())
            y.append(int(seg[0]))
    return X, y


def build_walk(sessions_blaze: list, n_target: int, seed: int = 0) -> tuple[list, list, list]:
    """Generate `n_target` walk windows by replaying real pose sequences through
    the feature extractor while translating + zooming the skeleton over time —
    the toward/away/across-camera signature. Perturbing at the LANDMARK level (not
    the derived features) keeps every downstream feature self-consistent.

    Per-frame drift is chosen so hipVx/hipVy land in a walking regime (~±1.5
    torso-widths/s) and the zoom produces a realistic scaleRate. Returns the
    source session index per window as the group id, so a session-grouped split
    keeps synthetic walk windows on the same side as their source.
    """
    rng = np.random.default_rng(seed)
    X, groups = [], []
    win_frames = int(WINDOW_MS / 1000 * FPS)
    walk = LABELS.index("walk")
    pool = [(gi, b) for gi, b in enumerate(sessions_blaze) if len(b) >= win_frames + 4]
    if not pool:
        return [], [], []
    while len(X) < n_target:
        gi, seq = pool[int(rng.integers(len(pool)))]
        start = int(rng.integers(0, len(seq) - win_frames - 1))
        chunk = seq[start:start + win_frames + 1].copy()  # (win_frames+1, 33, 3)
        dxf = rng.uniform(-0.015, 0.015)  # per-frame x drift (normalized units)
        dyf = rng.uniform(-0.006, 0.006)
        zoom = rng.uniform(-0.15, 0.15)  # total fractional scale change across the window
        for f in range(len(chunk)):
            m = chunk[f, :, 2] > 0
            if not m.any():
                continue
            frac = f / (len(chunk) - 1)
            s = 1.0 + zoom * (frac - 0.5)  # zoom about the skeleton centroid
            cx = chunk[f, m, 0].mean()
            cy = chunk[f, m, 1].mean()
            chunk[f, m, 0] = cx + (chunk[f, m, 0] - cx) * s + dxf * f
            chunk[f, m, 1] = cy + (chunk[f, m, 1] - cy) * s + dyf * f
        w = MotionFeatureWindow()
        for f in range(len(chunk)):
            w.push(chunk[f], f / FPS * 1000.0)
        t = w.tensor()
        if t is not None:
            X.append(t)
            groups.append(gi)
    return X[:n_target], [walk] * n_target, groups[:n_target]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default="data/mm-fit", help="unzipped mm-fit dir")
    ap.add_argument("-o", "--out", default="windows_mmfit.npz")
    ap.add_argument("--walk-ratio", type=float, default=1.0,
                    help="synthetic walk windows as a fraction of (rep+idle)/2")
    args = ap.parse_args()

    sessions = sorted(glob.glob(os.path.join(args.root, "*", "*_pose_2d.npy")))
    if not sessions:
        # some releases keep everything flat: <root>/w00_pose_2d.npy
        sessions = sorted(glob.glob(os.path.join(args.root, "*_pose_2d.npy")))
    if not sessions:
        raise SystemExit(f"no *_pose_2d.npy under {args.root}")

    X, y, groups, blaze_pool = [], [], [], []
    for gi, pose_path in enumerate(sessions):
        sid = os.path.basename(pose_path).split("_pose_2d")[0]
        labels_path = os.path.join(os.path.dirname(pose_path), f"{sid}_labels.csv")
        if not os.path.exists(labels_path):
            print(f"  {sid}: no labels csv, skipping")
            continue
        pose = np.load(pose_path)
        sets = []
        with open(labels_path) as f:
            for row in csv.reader(f):
                sets.append([int(row[0]), int(row[1]), int(row[2]), row[3]])
        sx, sy = windows_from_session(pose, sets)
        X.extend(sx)
        y.extend(sy)
        groups.extend([gi] * len(sx))  # session index → grouped split, no window leakage
        blaze_pool.append(pose_to_blaze(pose))
        print(f"  {sid}: {len(sx)} windows  (J={pose.shape[2]})")

    y = np.array(y, dtype=np.int64)
    n_rep = int((y == LABELS.index("rep")).sum())
    n_idle = int((y == LABELS.index("idle")).sum())
    n_walk = int(args.walk_ratio * (n_rep + n_idle) / 2)
    wx, wy, wg = build_walk(blaze_pool, n_walk)
    X.extend(wx)
    y = np.concatenate([y, np.array(wy, dtype=np.int64)])
    groups.extend(wg)

    X = np.stack(X).astype(np.float32)
    groups = np.array(groups, dtype=np.int64)
    counts = np.bincount(y, minlength=len(LABELS)).tolist()
    np.savez(args.out, X=X, y=y, groups=groups)
    print(f"wrote {args.out}: X{X.shape} labels {counts} (rep/walk/idle), {len(set(groups.tolist()))} groups")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
