"""Shared pieces: databases, labelled data, candidate generation, features, conditional-logit fit.
The features here are mirrored by src/lib/server/nutritionReranker.ts — change both together."""
import json, re, numpy as np, torch
from sklearn.feature_extraction.text import TfidfVectorizer
torch.set_num_threads(8)
import os
HERE = os.path.dirname(os.path.abspath(__file__))
W = os.environ.get('NW', HERE + '/')                                   # scripts and run outputs
R = os.environ.get('NR', os.path.join(HERE, '../../src/lib/data/'))    # blsDb.ts, nutritionDb.ts, nutritionNamesDe.json
def ts(f):
    s = open(R + f).read(); return [e for m in re.finditer(r'Entry\[\] = (?=\[(?!\.))', s) for e in json.JSONDecoder().raw_decode(s[m.end():])[0]]
bls, usda = ts('blsDb.ts'), ts('nutritionDb.ts'); _de = json.load(open(R + 'nutritionNamesDe.json'))
keys = ['bls:' + b['blsCode'] for b in bls] + ['usda:' + str(u['fdcId']) for u in usda]
names = [b['nameDe'] for b in bls] + [_de.get(u['name'], u['name']) for u in usda]
en = [b['nameEn'] for b in bls] + [u['name'] for u in usda]
cat = [b['category'] for b in bls] + [u['category'] for u in usda]
per = [b['per100g'] for b in bls] + [u['per100g'] for u in usda]
src = np.array([0] * len(bls) + [1] * len(usda))
ki = {k: i for i, k in enumerate(keys)}
cats = sorted(set(cat)); cix = {c: i for i, c in enumerate(cats)}
du = lambda s: s.lower().replace('ä', 'a').replace('ö', 'o').replace('ü', 'u').replace('ß', 'ss')  # ß-ok
vde = TfidfVectorizer(analyzer='char_wb', ngram_range=(2, 5), sublinear_tf=True, preprocessor=du).fit(names); Nde = vde.transform(names)
ven = TfidfVectorizer(analyzer='char_wb', ngram_range=(2, 5), sublinear_tf=True, preprocessor=du).fit(en); Nen = ven.transform(en)
RAW = re.compile(r'\b(roh|raw)\b'); SPICE = re.compile(r'^(spices|gewürze),', re.I)
FN = ['dense', 'ngram', 'ngram_en', 'dense_top1', 'pos0', 'pos<15', 'nopos', 'qcover', 'ncover', 'headin', 'firsteq', 'wordeq', 'extra_words', 'len', 'raw', 'spice', 'usda'] + cats

def close(a, b):
    """Same food for nutrition purposes: kcal within 15 % (or 15 kcal), protein and fat within 25 % (or 2 g).
    Carbs only within one database — BLS counts available carbs, USDA carbs by difference (incl. fibre)."""
    pa, pb = per[a], per[b]
    tol = lambda f, rel, ab: abs(pa.get(f, 0) - pb.get(f, 0)) <= max(ab, rel * max(abs(pa.get(f, 0)), abs(pb.get(f, 0))))
    return tol('calories', .15, 15) and tol('protein', .25, 2) and tol('fat', .25, 2) and (src[a] != src[b] or tol('carbs', .25, 3))

# prod labels the eval leaves out: plainly mis-clicked (onion → onion bread, rose water → tap water, …)
BAD = {'zwiebel, mittelgross', 'rosenwasser', 'ricotta salata'}

def load_lines():
    """Agent-labelled lines with at least one pick: {'de', 'en', 'pos': [entry idx], 'shortlist': [entry idx]}.
    File order matters — fold k of the cross-fitting holds lines i % 5 == k."""
    out = []
    for r in json.load(open(HERE + '/data/labelled-lines.json')):
        pos = [ki[p] for p in r['picks'] if p in ki]
        if pos: out.append({'de': r['de'], 'en': r['en'], 'pos': pos, 'shortlist': [ki[c] for c in r['shortlist'] if c in ki], 'force': True})
    return out

def load_gold():
    """Prod labels (global overwrites + hand-edited recipe mappings), as an index list into the file plus rows."""
    allg = json.load(open(HERE + '/data/prod-labels.json'))
    idx = [i for i, g in enumerate(allg) if g['key'] in ki and '<a' not in g['de'] and g['de'] not in BAD]
    return idx, [dict(allg[i], pos=[ki[allg[i]['key']]]) for i in idx], allg

def words(s): return [w for w in re.split(r'[^a-z0-9]+', du(s)) if len(w) >= 3]
stem = lambda w: w[:max(4, len(w) - 2)]

class Queries:
    """Candidates and features for a list of {'de','en'} queries; D = doc embeddings, Q = query embeddings."""
    def __init__(self, qs, D, Q, K=30, dense=None):
        self.qs = qs
        self.dense = (Q @ D.T) if dense is None else dense.astype(np.float32)
        self.ng = (vde.transform([q['de'] for q in qs]) @ Nde.T).toarray()
        self.nge = (ven.transform([q.get('en') or '' for q in qs]) @ Nen.T).toarray()
        self.cands, self.X = [], []
        for i, q in enumerate(qs):
            c = set(np.argsort(-self.dense[i])[:K]) | set(np.argsort(-self.ng[i])[:K])
            if q.get('en'): c |= set(np.argsort(-self.nge[i])[:10])
            c |= set(q.get('pos', [])) if q.get('force') else set()  # training: the labelled entry must be a candidate
            c = sorted(c); self.cands.append(c)
            self.X.append(np.array([self.feats(i, j) for j in c]))
    def feats(self, qi, c):
        q = du(self.qs[qi]['de']); n = du(names[c]); qw = words(q); nw = words(n)
        head = n.split(',')[0].split(' ')[0]
        pos = min([n.find(stem(w)) for w in qw if n.find(stem(w)) >= 0] or [99])
        f = [self.dense[qi, c], self.ng[qi, c], self.nge[qi, c], float(np.argmax(self.dense[qi]) == c),
             float(pos == 0), float(0 < pos < 15), float(pos == 99),
             sum(any(stem(w) in x for x in nw) for w in qw) / max(1, len(qw)),
             sum(stem(x) in q for x in nw) / max(1, len(nw)),
             float(bool(head) and stem(head) in q),
             float(any(x == w or (len(w) > 4 and stem(x) == stem(w)) for w in qw[:1] for x in nw[:1])),   # first words equal (word-level, not prefix)
             float(any(x == w or (len(w) > 4 and stem(x) == stem(w)) for w in qw for x in nw)),           # some whole word shared
             sum(1 for x in nw if not any(stem(x) in w or stem(w) in x for w in qw)) / max(1, len(nw)),  # extra words in the entry name
             len(n) / 40, float(bool(RAW.search(n))), float(bool(SPICE.search(en[c]))), float(src[c])]
        oh = np.zeros(len(cats)); oh[cix[cat[c]]] = 1
        return np.concatenate([f, oh])

def fit(Xs, Ys, mu, sd, l2=1.0, weights=None):
    """Softmax over each query's candidates; a query's positives share the probability mass."""
    w = torch.zeros(Xs[0].shape[1], dtype=torch.float64, requires_grad=True)
    data = [(torch.tensor((x - mu) / sd), torch.tensor(y), 1.0 if weights is None else weights[i]) for i, (x, y) in enumerate(zip(Xs, Ys)) if y.any()]
    tot = sum(wt for _, _, wt in data)
    opt = torch.optim.LBFGS([w], max_iter=300, line_search_fn='strong_wolfe')
    def closure():
        opt.zero_grad()
        loss = sum(wt * -(torch.logsumexp((x @ w)[y], 0) - torch.logsumexp(x @ w, 0)) for x, y, wt in data) / tot + l2 * (w @ w) / tot
        loss.backward(); return loss
    opt.step(closure); return w.detach().numpy()
