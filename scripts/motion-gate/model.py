"""
The motion-gate classifier: a tiny temporal 1D-CNN over a window of pose
features, deciding {rep, walk, idle}. Small on purpose (~a few k params) so it
runs every frame in onnxruntime-web on a phone.

Input:  (batch, WINDOW_FRAMES, FEATURE_DIM)  raw features (see features.py)
Output: (batch, 3)                           class logits, order = LABELS

Feature normalization (per-feature mean/std) is baked into the graph as fixed
buffers, so the browser side feeds raw features straight from
MotionFeatureWindow.tensor() with no separate scaling step.
"""

from __future__ import annotations

import torch
import torch.nn as nn

from features import FEATURE_DIM, WINDOW_FRAMES

# Class order is the contract shared with motionGate.ts — index == output column.
LABELS = ["rep", "walk", "idle"]
NUM_CLASSES = len(LABELS)


class MotionGateNet(nn.Module):
    def __init__(self, feature_dim: int = FEATURE_DIM, num_classes: int = NUM_CLASSES,
                 hidden: int = 32):
        super().__init__()
        # Fixed (non-learned) normalization, filled from the training set before
        # fitting and exported as constants.
        self.register_buffer("feat_mean", torch.zeros(feature_dim))
        self.register_buffer("feat_std", torch.ones(feature_dim))

        self.net = nn.Sequential(
            nn.Conv1d(feature_dim, hidden, kernel_size=5, padding=2),
            nn.BatchNorm1d(hidden),
            nn.ReLU(),
            nn.Conv1d(hidden, hidden, kernel_size=5, padding=2),
            nn.BatchNorm1d(hidden),
            nn.ReLU(),
            nn.AdaptiveAvgPool1d(1),
        )
        self.head = nn.Linear(hidden, num_classes)

    def set_norm(self, mean: torch.Tensor, std: torch.Tensor) -> None:
        self.feat_mean.copy_(mean)
        # Guard against zero-variance features (e.g. a constant channel).
        self.feat_std.copy_(torch.clamp(std, min=1e-4))

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: (N, T, F) → normalize on F → (N, F, T) for temporal convolution.
        x = (x - self.feat_mean) / self.feat_std
        x = x.transpose(1, 2)
        x = self.net(x).squeeze(-1)  # (N, hidden)
        return self.head(x)  # (N, num_classes) logits


def param_count(model: nn.Module) -> int:
    return sum(p.numel() for p in model.parameters())


if __name__ == "__main__":
    m = MotionGateNet()
    x = torch.zeros(2, WINDOW_FRAMES, FEATURE_DIM)
    print("output", tuple(m(x).shape), "| params", param_count(m))
