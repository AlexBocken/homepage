"""Fit the shipped reranker on all labelled lines (out-of-fold similarities) and all prod labels
(similarities from the shipped ONNX model), and write src/lib/data/nutritionReranker.json and
src/lib/data/nutritionTrainingLines.json.
Usage: final_fit.py RUN_PREFIX ONNX_DENSE_DIR [--no-gold OUT.json]"""
import sys, os, json, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rank_data import *
prefix, gd = sys.argv[1], sys.argv[2]
syn, gold, dsyn, _ = dense_rows(prefix)
dgold = np.load(f'{gd}/dense_gold.npy')[load_gold()[0]]
if '--no-gold' in sys.argv: gold = []  # weights for evaluating on the prod labels
S = Queries(syn, None, None, dense=dsyn)
qs = syn + gold
if gold:
    G = Queries(gold, None, None, dense=dgold); S.cands += G.cands; S.X += G.X
X, Y = matrices(qs, S, qs, True)
allX = np.concatenate(X); mu, sd = allX.mean(0), allX.std(0) + 1e-6
w = fit(X, Y, mu, sd)
weights = {'features': FN + ['popularity', 'nearest_label'], 'mean': mu.tolist(), 'std': sd.tolist(), 'weights': w.tolist(), 'K': 30, 'K_EN': 10}
if gold:
    json.dump(weights, open(R + 'nutritionReranker.json', 'w'), indent=1)
    lines = sorted(({'de': q['de'], 'keys': [keys[p] for p in q['pos']]} for q in syn), key=lambda x: x['de'].lower())
    open(R + 'nutritionTrainingLines.json', 'w').write('[\n' + ',\n'.join(json.dumps(x, ensure_ascii=False) for x in lines) + '\n]\n')
    print(f'trained on {len(syn)} labelled + {len(gold)} prod lines; wrote nutritionReranker.json, nutritionTrainingLines.json')
else:
    json.dump(weights, open(sys.argv[sys.argv.index('--no-gold') + 1], 'w'), indent=1)
    print(f'trained on {len(syn)} labelled lines only')
