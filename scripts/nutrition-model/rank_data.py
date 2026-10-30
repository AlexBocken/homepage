"""Feature matrices for the reranker: lib.Queries features + the two label features (popularity, nearest label)."""
import numpy as np
from lib import *

def label_features(qs, cands, ref, self_idx=None):
    """[log(1 + times a reference line chose the entry), max n-gram similarity to such a line] per candidate.
    With `self_idx`, query i is reference line self_idx[i] and doesn't count for itself."""
    pop, by = {}, {}
    for t, q in enumerate(ref):
        for p in q['pos']: pop[p] = pop.get(p, 0) + 1; by.setdefault(p, []).append(t)
    sims = (vde.transform([q['de'] for q in qs]) @ vde.transform([q['de'] for q in ref]).T).toarray()
    out = []
    for i, c in enumerate(cands):
        own = self_idx[i] if self_idx is not None else None
        out.append(np.array([[np.log1p(pop.get(j, 0) - (own is not None and j in qs[i]['pos'])),
                              max((sims[i, t] for t in by.get(j, []) if t != own), default=0)] for j in c]))
    return out

def dense_rows(prefix):
    """Out-of-fold similarities of the labelled lines (fold models) and the prod labels' (full model)."""
    syn = load_lines(); gidx, gold, _ = load_gold()
    dsyn = np.zeros((len(syn), len(keys)), dtype=np.float16)
    for k in range(5):
        dsyn[np.load(f'{prefix}-fold{k}/syn_idx.npy')] = np.load(f'{prefix}-fold{k}/dense_syn.npy')
    return syn, gold, dsyn, np.load(f'{prefix}/dense_gold.npy')[gidx]

def matrices(qs, Q, ref, self_ref):
    X = [np.hstack([x, e]) for x, e in zip(Q.X, label_features(qs, Q.cands, ref, list(range(len(qs))) if self_ref else None))]
    Y = [np.array([j in q['pos'] for j in c]) for q, c in zip(qs, Q.cands)]
    return X, Y
