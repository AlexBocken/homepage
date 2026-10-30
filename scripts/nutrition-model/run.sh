#!/bin/sh
# Retrain the nutrition model end to end on a CUDA machine (~15 min on an 8 GB RTX 5060).
# Two virtualenvs, because optimum pins transformers < 5, which the training code doesn't run on:
#   .venv       torch (CUDA), sentence-transformers, scikit-learn
#   .venv-onnx  optimum[onnxruntime], onnx, torch (CPU), scikit-learn
# Set NR to a copy of src/lib/data if this folder isn't inside the repo.
set -e
cd "$(dirname "$0")"
ARGS="--epochs 8 --freeze-emb --bf16 --chunk 128"
for k in 0 1 2 3 4; do .venv/bin/python ft.py run-fold$k --fold $k/5 $ARGS; done
.venv/bin/python ft.py run $ARGS
.venv-onnx/bin/optimum-cli export onnx --model run/model --task feature-extraction --library-name transformers --opset 17 export
.venv-onnx/bin/python -c "from onnxruntime.quantization import quantize_dynamic, QuantType; quantize_dynamic('export/model.onnx', 'export/model_quantized.onnx', weight_type=QuantType.QInt8)"
.venv-onnx/bin/python onnx_dense.py export/model_quantized.onnx q8
.venv/bin/python evaluate.py run q8
.venv/bin/python final_fit.py run q8
