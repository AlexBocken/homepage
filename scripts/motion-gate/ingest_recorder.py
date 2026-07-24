"""
Turn recorder JSON (from /fitness/motion-gate, the in-app data recorder) into a
window .npz for train.py.

    venv/bin/python ingest_recorder.py clips1.json clips2.json -o windows_recorder.npz

Each recorded clip is replayed through the SAME MotionFeatureWindow used at
inference time, and overlapping windows are snapshotted every STRIDE frames so a
single clip yields many training examples. The recorder stores native
BlazePose-33 landmarks, so no topology mapping is needed here (unlike the public
MM-Fit / HAR adapters).
"""

from __future__ import annotations

import argparse
import json

import numpy as np

from features import MotionFeatureWindow, WINDOW_FRAMES, FEATURE_DIM
from model import LABELS

# Snapshot a window every STRIDE frames (overlapping augmentation). At ~30fps a
# 10s clip yields ~70 windows.
STRIDE = 4
# Skip windows whose latest frame is untracked, and clips with too little tracking.
MIN_CLIP_CONF = 0.4
# Emit a fresh group id every GROUP_WINDOWS windows *within* a clip. The recorder
# typically yields only a handful of long clips (often one per class), so grouping
# by whole clip would leave a class with a single session — impossible to hold out
# without emptying it from train. Chunking each clip into contiguous time-groups
# keeps every class present on both sides of a session-grouped split while still
# holding out contiguous spans (heavily-overlapped adjacent windows stay together).
GROUP_WINDOWS = 30


def _to_lms(compact):
    """Recorder frame `l` = [[x,y,z,vis]×33] → (33,3) [x,y,vis] for features.py."""
    if compact is None:
        return None
    return np.array([[p[0], p[1], p[3]] for p in compact], dtype=np.float64)


def windows_from_clip(clip) -> list[np.ndarray]:
    frames = clip["frames"]
    conf = sum(f["c"] for f in frames) / max(len(frames), 1)
    if conf < MIN_CLIP_CONF:
        print(f"  skip {clip['label']} clip: only {conf:.0%} tracked")
        return []
    w = MotionFeatureWindow()
    out = []
    for i, fr in enumerate(frames):
        w.push(_to_lms(fr["l"]), fr["t"])
        if fr["c"] and w.ready and i % STRIDE == 0:
            out.append(w.tensor())
    return out


def ingest(paths: list[str]) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    X, y, groups = [], [], []
    gid = 0
    for path in paths:
        with open(path) as f:
            doc = json.load(f)
        for clip in doc["clips"]:
            label = clip["label"]
            if label not in LABELS:
                print(f"  skip unknown label {label!r}")
                continue
            wins = windows_from_clip(clip)
            X.extend(wins)
            y.extend([LABELS.index(label)] * len(wins))
            # Contiguous time-groups: whole GROUP_WINDOWS-sized chunks per clip.
            for k in range(len(wins)):
                groups.append(gid + k // GROUP_WINDOWS)
            gid += (len(wins) + GROUP_WINDOWS - 1) // GROUP_WINDOWS
            print(f"  {label} ({clip.get('exercise') or '-'}): {len(wins)} windows")
        print(f"{path}: {len(doc['clips'])} clips")
    if not X:
        raise SystemExit("no windows produced — check the input clips")
    return (np.stack(X).astype(np.float32), np.array(y, np.int64),
            np.array(groups, dtype=np.int64))


def _selftest() -> int:
    """Synthesize a recorder doc (upright=idle, translating=walk) and ingest it."""
    from features import _upright_pose

    def clip(label, shift_fn, n=70):
        frames = []
        for i in range(n):
            lms = shift_fn(i)  # (33,3) x,y,vis
            frames.append({
                "t": i * 33,
                "c": 1,
                "l": [[float(p[0]), float(p[1]), 0.0, float(p[2])] for p in lms],
            })
        return {"label": label, "exercise": None, "startedAt": 0, "durationMs": n * 33, "frames": frames}

    doc = {"clips": [
        clip("idle", lambda i: _upright_pose(0.0)),
        clip("walk", lambda i: _upright_pose(0.01 * i)),
    ]}
    import tempfile, os
    p = os.path.join(tempfile.gettempdir(), "motion-gate-selftest.json")
    with open(p, "w") as f:
        json.dump(doc, f)
    X, y, groups = ingest([p])
    assert X.shape[1:] == (WINDOW_FRAMES, FEATURE_DIM), X.shape
    assert set(y.tolist()) == {LABELS.index("idle"), LABELS.index("walk")}, set(y.tolist())
    assert len(groups) == len(X) and len(set(groups.tolist())) >= 2, "grouping broken"
    print(f"selftest OK: X{X.shape} labels {np.bincount(y, minlength=len(LABELS)).tolist()} "
          f"(rep/walk/idle), {len(set(groups.tolist()))} groups")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("paths", nargs="*", help="recorder JSON files")
    ap.add_argument("-o", "--out", default="windows_recorder.npz")
    ap.add_argument("--selftest", action="store_true")
    args = ap.parse_args()
    if args.selftest:
        return _selftest()
    if not args.paths:
        ap.error("pass recorder JSON paths, or --selftest")
    X, y, groups = ingest(args.paths)
    np.savez(args.out, X=X, y=y, groups=groups)
    print(f"wrote {args.out}: X{X.shape} labels {np.bincount(y, minlength=len(LABELS)).tolist()} "
          f"(rep/walk/idle), {len(set(groups.tolist()))} groups")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
