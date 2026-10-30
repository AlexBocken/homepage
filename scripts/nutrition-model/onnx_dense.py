"""Prod labels' similarities under an ONNX export (mean pooling + L2, as transformers.js runs it), to check
what quantisation costs and to fit the shipped weights on what production computes.
Usage: onnx_dense.py EXPORT_DIR/model_quantized.onnx OUTDIR"""
import sys, os, numpy as np, onnxruntime as ort
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import names, load_gold
from transformers import AutoTokenizer
tok = AutoTokenizer.from_pretrained(os.path.dirname(os.path.abspath(sys.argv[1])))
s = ort.InferenceSession(sys.argv[1], providers=['CPUExecutionProvider'])
inp = [i.name for i in s.get_inputs()]
def enc(texts, B=256):
    out = []
    for b in range(0, len(texts), B):
        f = dict(tok(texts[b:b + B], padding=True, truncation=True, max_length=48, return_tensors='np')); f['token_type_ids'] = np.zeros_like(f['input_ids'])
        o = s.run(None, {k: v for k, v in f.items() if k in inp})[0].astype(np.float32)
        m = f['attention_mask'][..., None]; e = (o * m).sum(1) / m.sum(1); out.append(e / np.linalg.norm(e, axis=1, keepdims=True))
    return np.concatenate(out)
D = enc(['passage: ' + n for n in names])
Q = enc(['query: ' + g['de'] for g in load_gold()[2]])
os.makedirs(sys.argv[2], exist_ok=True); np.save(sys.argv[2] + '/dense_gold.npy', (Q @ D.T).astype(np.float16)); print('ok', D.shape)
