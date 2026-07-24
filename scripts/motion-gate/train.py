"""
Train the motion-gate classifier and export it to ONNX for onnxruntime-web.

    # end-to-end self-check on synthetic data (no dataset needed):
    venv/bin/python train.py --smoke

    # real training once you have window sets from the ingest adapters:
    venv/bin/python train.py --data windows_recorder.npz windows_mmfit.npz \
        --out ../../static/fitness/motion-gate.onnx

A window set is a .npz with:
    X : float32 [N, WINDOW_FRAMES, FEATURE_DIM]   (features.py output)
    y : int64   [N]                               (index into model.LABELS)

Exports:
    static/fitness/motion-gate.onnx   the graph (normalization baked in)
    static/fitness/motion-gate.json   sidecar: labels, feature spec, val accuracy
"""

from __future__ import annotations

import argparse
import json
import os

import numpy as np
import torch
import torch.nn as nn

from features import FEATURE_DIM, FEATURE_NAMES, WINDOW_FRAMES, FIDX
from model import LABELS, NUM_CLASSES, MotionGateNet, param_count

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_ONNX = os.path.normpath(os.path.join(HERE, "..", "..", "static", "fitness", "motion-gate.onnx"))


def load_windows(paths: list[str]) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Load + concatenate window sets. Returns (X, y, groups); groups are made
    unique per source file (offset) so a grouped split never leaks across files
    or sessions. Files without stored groups get one group per file."""
    xs, ys, gs = [], [], []
    offset = 0
    for p in paths:
        d = np.load(p)
        X, y = d["X"].astype(np.float32), d["y"].astype(np.int64)
        assert X.ndim == 3 and X.shape[1:] == (WINDOW_FRAMES, FEATURE_DIM), \
            f"{p}: X shape {X.shape} != (*, {WINDOW_FRAMES}, {FEATURE_DIM})"
        assert len(X) == len(y), f"{p}: X/y length mismatch"
        g = d["groups"].astype(np.int64) if "groups" in d else np.zeros(len(X), np.int64)
        xs.append(X)
        ys.append(y)
        gs.append(g + offset)
        offset += int(g.max()) + 1 if len(g) else 1
    return np.concatenate(xs), np.concatenate(ys), np.concatenate(gs)


def make_synthetic(n_per: int = 400, seed: int = 0) -> tuple[np.ndarray, np.ndarray]:
    """Three separable motion signatures, to prove the pipeline trains + exports.

    rep  = in-phase knee oscillation, still centroid
    walk = large hip translation + anti-phase legs + scale drift
    idle = near-static, low energy
    """
    rng = np.random.default_rng(seed)
    T, F = WINDOW_FRAMES, FEATURE_DIM
    t = np.linspace(0, 1, T)
    X, y = [], []

    def blank():
        v = np.zeros((T, F), np.float32)
        v[:, FIDX["kneeAngle"]] = 1.0
        v[:, FIDX["elbowAngle"]] = 1.0
        v[:, FIDX["hipAngle"]] = 1.0
        v[:, FIDX["spineAngle"]] = 1.0
        v[:, FIDX["scale"]] = 0.3
        v[:, FIDX["trackQuality"]] = 1.0
        return v

    for _ in range(n_per):
        # rep
        v = blank()
        f = rng.uniform(1.0, 2.0)
        osc = 0.25 * np.sin(2 * np.pi * f * t)
        v[:, FIDX["kneeAngle"]] = 0.9 + osc
        v[:, FIDX["hipAngle"]] = 0.9 + 0.15 * osc
        v[:, FIDX["motionEnergy"]] = np.abs(np.gradient(osc)) * 8
        X.append(v + rng.normal(0, 0.01, (T, F)).astype(np.float32)); y.append(0)

        # walk
        v = blank()
        f = rng.uniform(1.5, 2.5)
        v[:, FIDX["hipVx"]] = rng.choice([-1, 1]) * rng.uniform(1.0, 2.0) + 0.1 * np.sin(2 * np.pi * f * t)
        v[:, FIDX["scaleRate"]] = rng.choice([-1, 1]) * rng.uniform(0.05, 0.15)
        v[:, FIDX["kneeAsym"]] = 0.3 * np.sin(2 * np.pi * f * t)  # anti-phase legs
        v[:, FIDX["ankleAsym"]] = 0.4 * np.sin(2 * np.pi * f * t + 0.5)
        v[:, FIDX["motionEnergy"]] = rng.uniform(0.2, 0.4)
        v[:, FIDX["scale"]] = 0.3 + np.cumsum(np.full(T, v[0, FIDX["scaleRate"]] / T))
        X.append(v + rng.normal(0, 0.01, (T, F)).astype(np.float32)); y.append(1)

        # idle
        v = blank()
        v[:, FIDX["motionEnergy"]] = rng.uniform(0, 0.03)
        X.append(v + rng.normal(0, 0.02, (T, F)).astype(np.float32)); y.append(2)

    return np.stack(X).astype(np.float32), np.array(y, np.int64)


def train(X: np.ndarray, y: np.ndarray, groups: np.ndarray | None = None,
          epochs: int = 40, seed: int = 0) -> tuple[MotionGateNet, float]:
    from sklearn.model_selection import train_test_split, GroupShuffleSplit
    from sklearn.metrics import confusion_matrix

    torch.manual_seed(seed)
    if groups is not None and len(set(groups.tolist())) > 1:
        # Split by session so overlapping windows never straddle train/val — the
        # honest generalization estimate for heavily-overlapped windows.
        tr, va = next(GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=seed).split(X, y, groups))
        Xtr, Xva, ytr, yva = X[tr], X[va], y[tr], y[va]
        print(f"grouped split: {len(set(groups[tr].tolist()))} train / {len(set(groups[va].tolist()))} val sessions")
    else:
        Xtr, Xva, ytr, yva = train_test_split(X, y, test_size=0.2, random_state=seed, stratify=y)

    model = MotionGateNet()
    mean = torch.tensor(Xtr.reshape(-1, FEATURE_DIM).mean(0))
    std = torch.tensor(Xtr.reshape(-1, FEATURE_DIM).std(0))
    model.set_norm(mean, std)

    # Class weights counter any label imbalance in the collected data.
    counts = np.bincount(ytr, minlength=NUM_CLASSES).astype(np.float32)
    weights = torch.tensor(counts.sum() / (NUM_CLASSES * np.clip(counts, 1, None)))
    loss_fn = nn.CrossEntropyLoss(weight=weights)
    opt = torch.optim.Adam(model.parameters(), lr=1e-3, weight_decay=1e-4)

    Xtr_t, ytr_t = torch.tensor(Xtr), torch.tensor(ytr)
    Xva_t, yva_t = torch.tensor(Xva), torch.tensor(yva)
    n, bs = len(Xtr_t), 64

    for ep in range(epochs):
        model.train()
        perm = torch.randperm(n)
        for i in range(0, n, bs):
            idx = perm[i:i + bs]
            opt.zero_grad()
            loss = loss_fn(model(Xtr_t[idx]), ytr_t[idx])
            loss.backward()
            opt.step()

    model.eval()
    with torch.no_grad():
        pred = model(Xva_t).argmax(1)
    acc = (pred == yva_t).float().mean().item()
    cm = confusion_matrix(yva_t.numpy(), pred.numpy(), labels=list(range(NUM_CLASSES)))
    print(f"val accuracy {acc:.3f}  | params {param_count(model)}")
    print("confusion (rows=true, cols=pred; order rep/walk/idle):")
    print(cm)
    return model, acc


def export_onnx(model: MotionGateNet, onnx_path: str, val_acc: float) -> None:
    os.makedirs(os.path.dirname(onnx_path), exist_ok=True)
    model.eval()
    dummy = torch.zeros(1, WINDOW_FRAMES, FEATURE_DIM)
    torch.onnx.export(
        model, dummy, onnx_path,
        input_names=["features"], output_names=["logits"],
        dynamic_axes={"features": {0: "batch"}, "logits": {0: "batch"}},
        opset_version=18,
    )
    # The exporter may externalize weights to a sibling .onnx.data file; re-save
    # everything inline so the shipped model is a single file onnxruntime-web can
    # fetch on its own.
    import onnx
    onnx.save_model(onnx.load(onnx_path), onnx_path, save_as_external_data=False)
    for stray in (onnx_path + ".data", os.path.splitext(onnx_path)[0] + ".onnx.data"):
        if os.path.exists(stray):
            os.remove(stray)
    print(f"exported {onnx_path}")

    # Round-trip: onnxruntime output must match torch (a cross-check on the trained
    # weights; the app itself ships the JSON + hand-rolled forward, not this ONNX).
    import onnxruntime as ort
    sess = ort.InferenceSession(onnx_path, providers=["CPUExecutionProvider"])
    probe = np.random.default_rng(1).normal(0, 1, (8, WINDOW_FRAMES, FEATURE_DIM)).astype(np.float32)
    ort_out = sess.run(None, {"features": probe})[0]
    with torch.no_grad():
        torch_out = model(torch.tensor(probe)).numpy()
    max_diff = float(np.abs(ort_out - torch_out).max())
    agree = (ort_out.argmax(1) == torch_out.argmax(1)).all()
    print(f"onnxruntime parity: max|Δlogit|={max_diff:.2e}  argmax_agree={bool(agree)}")
    assert agree and max_diff < 1e-3, "ONNX export diverges from the trained torch model"


def _list(t: torch.Tensor) -> list:
    return t.detach().cpu().numpy().astype(float).tolist()


def export_weights(model: MotionGateNet, json_path: str, val_acc: float,
                   samples: list | None = None) -> None:
    """Write the shipped model as plain JSON: arch + weights + baked normalization,
    so motionGate.ts can run the forward pass with no ONNX runtime. Optionally
    embeds (input, logits) parity samples for the TS unit test to check against."""
    model.eval()
    net = model.net
    conv1, bn1, conv2, bn2 = net[0], net[1], net[3], net[4]

    def bn(m):
        return {"gamma": _list(m.weight), "beta": _list(m.bias),
                "mean": _list(m.running_mean), "var": _list(m.running_var), "eps": m.eps}

    doc = {
        "version": 1,
        "labels": LABELS,
        "featureNames": list(FEATURE_NAMES),
        "arch": {"featureDim": FEATURE_DIM, "windowFrames": WINDOW_FRAMES,
                 "hidden": conv1.out_channels, "kernel": conv1.kernel_size[0],
                 "numClasses": NUM_CLASSES},
        "valAccuracy": round(val_acc, 4),
        "featMean": _list(model.feat_mean),
        "featStd": _list(model.feat_std),
        "conv1": {"w": _list(conv1.weight), "b": _list(conv1.bias)},
        "bn1": bn(bn1),
        "conv2": {"w": _list(conv2.weight), "b": _list(conv2.bias)},
        "bn2": bn(bn2),
        "fc": {"w": _list(model.head.weight), "b": _list(model.head.bias)},
    }
    if samples is not None:
        doc["samples"] = samples
    os.makedirs(os.path.dirname(json_path) or ".", exist_ok=True)
    with open(json_path, "w") as f:
        json.dump(doc, f)
    print(f"exported {json_path}  (val acc {val_acc:.3f})")


def write_fixture(path: str, seed: int = 7) -> None:
    """A deterministic seeded model + sample I/O, committed as the TS parity test
    fixture (locks motionGate.ts forward() against this PyTorch computation)."""
    torch.manual_seed(seed)
    model = MotionGateNet()
    # Random but non-trivial norm + BN running stats so every path is exercised.
    model.set_norm(torch.randn(FEATURE_DIM) * 0.2 + 0.5, torch.rand(FEATURE_DIM) * 0.5 + 0.5)
    for bnm in (model.net[1], model.net[4]):
        bnm.running_mean.copy_(torch.randn_like(bnm.running_mean) * 0.3)
        bnm.running_var.copy_(torch.rand_like(bnm.running_var) * 0.5 + 0.5)
        bnm.weight.data.copy_(torch.randn_like(bnm.weight) * 0.3 + 1.0)
        bnm.bias.data.copy_(torch.randn_like(bnm.bias) * 0.2)
    model.eval()
    g = torch.Generator().manual_seed(seed + 1)
    samples = []
    for _ in range(3):
        x = torch.randn(1, WINDOW_FRAMES, FEATURE_DIM, generator=g)
        with torch.no_grad():
            logits = model(x)[0]
        samples.append({"x": _list(x[0]), "logits": _list(logits)})
    export_weights(model, path, val_acc=0.0, samples=samples)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", nargs="*", default=[], help="window .npz files to train on")
    ap.add_argument("--out", default=DEFAULT_ONNX)
    ap.add_argument("--epochs", type=int, default=40)
    ap.add_argument("--smoke", action="store_true", help="train+export on synthetic data")
    ap.add_argument("--fixture", help="write the TS parity fixture JSON to PATH and exit")
    args = ap.parse_args()

    if args.fixture:
        write_fixture(args.fixture)
        return 0

    groups = None
    if args.smoke:
        X, y = make_synthetic()
        print(f"[smoke] synthetic windows: {X.shape}")
    elif args.data:
        X, y, groups = load_windows(args.data)
        print(f"windows: {X.shape}  label counts: {np.bincount(y, minlength=NUM_CLASSES).tolist()} (rep/walk/idle)")
    else:
        ap.error("pass --data <npz...>, --smoke, or --fixture <path>")

    model, acc = train(X, y, groups, epochs=args.epochs)
    onnx_out = os.path.join(HERE, "smoke-motion-gate.onnx") if args.smoke else args.out
    json_out = os.path.splitext(onnx_out)[0] + ".json"  # the file the app ships/loads
    export_onnx(model, onnx_out, acc)
    export_weights(model, json_out, acc)
    if args.smoke:
        assert acc > 0.9, f"smoke accuracy too low: {acc}"
        print("[smoke] OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
