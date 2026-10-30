"""Score a fine-tuned model's reranker on the prod labels: trained on the labelled lines only, and with the
prod labels added in 5 folds grouped by entry (an entry is never in training when it is scored).
'usable' = the chosen entry or one with practically the same kcal/protein/fat (see lib.close).
Usage: evaluate.py RUN_PREFIX [GOLD_DENSE_DIR]   (RUN_PREFIX as passed to ft.py, folds at RUN_PREFIX-foldK)"""
import sys, os, json, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rank_data import *
from sklearn.model_selection import GroupKFold
prefix = sys.argv[1]
syn, gold, dsyn, dgold = dense_rows(prefix)
if len(sys.argv) > 2: dgold = np.load(f'{sys.argv[2]}/dense_gold.npy')[load_gold()[0]]  # e.g. an ONNX export's similarities
S, G = Queries(syn, None, None, dense=dsyn), Queries(gold, None, None, dense=dgold)

class Sub:
    def __init__(self, Q, idx): self.cands = [Q.cands[i] for i in idx]; self.X = [Q.X[i] for i in idx]

def run(train_q, train_Q, test_q, test_Q):
    Xtr, Ytr = matrices(train_q, train_Q, train_q, True)
    Xte = [np.hstack([x, e]) for x, e in zip(test_Q.X, label_features(test_q, test_Q.cands, train_q))]
    allX = np.concatenate(Xtr); mu, sd = allX.mean(0), allX.std(0) + 1e-6
    w = fit(Xtr, Ytr, mu, sd)
    return [test_Q.cands[i][int(np.argmax(((x - mu) / sd) @ w))] for i, x in enumerate(Xte)]

def report(label, preds):
    ex = np.mean([p in g['pos'] for p, g in zip(preds, gold)])
    ok = np.mean([p in g['pos'] or close(g['pos'][0], p) for p, g in zip(preds, gold)])
    print(f'{label:34} exact {100 * ex:.1f}%  usable {100 * ok:.1f}%', flush=True)

preds = run(syn, S, gold, G)
report('labelled lines only:', preds)
json.dump([{'de': g['de'], 'gold': keys[g['pos'][0]], 'pred': keys[p]} for g, p in zip(gold, preds)], open(f'{prefix}-preds.json', 'w'), ensure_ascii=False)
both = [None] * len(gold)
for tr, te in GroupKFold(5).split(gold, groups=[g['key'] for g in gold]):
    T = Sub(S, range(len(syn))); T.cands += [G.cands[i] for i in tr]; T.X += [G.X[i] for i in tr]
    for i, p in zip(te, run(syn + [gold[i] for i in tr], T, [gold[i] for i in te], Sub(G, te))): both[i] = p
report('+ prod labels (5-fold, by entry):', both)
