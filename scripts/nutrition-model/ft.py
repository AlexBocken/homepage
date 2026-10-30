"""Fine-tune multilingual-e5-small for ingredient → entry retrieval: InfoNCE over in-batch and hard
negatives (the wrong entries of each line's shortlist), cross-fitted so the reranker can be trained on
out-of-fold similarities.
Usage: ft.py OUT [--fold k/5] [--epochs 8] [--lr 3e-5] [--temp 0.05] [--nh 3] [--bs 64]
                 [--freeze-emb] [--bf16] [--chunk 128] [--base intfloat/multilingual-e5-small]
Writes OUT/dense_syn.npy + syn_idx.npy (similarities of this model's held-out lines, or all lines),
OUT/dense_gold.npy (prod labels), and OUT/model for the full run."""
import sys, os, random, json, numpy as np, torch
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
from sentence_transformers import SentenceTransformer
arg = lambda k, d: next((sys.argv[i + 1] for i, a in enumerate(sys.argv) if a == k), d)
out = sys.argv[1]; fold = arg('--fold', None); EP = int(arg('--epochs', 8)); LR = float(arg('--lr', 3e-5))
BASE = arg('--base', 'intfloat/multilingual-e5-small'); T = float(arg('--temp', 0.05)); NH = int(arg('--nh', 3)); B = int(arg('--bs', 64))
FREEZE = '--freeze-emb' in sys.argv; BF16 = '--bf16' in sys.argv; CHUNK = int(arg('--chunk', 0))
random.seed(0); torch.manual_seed(0)
doc = lambda j: 'passage: ' + names[j]
syn = load_lines()
for s in syn: s['negs'] = [c for c in s['shortlist'] if c not in s['pos'] and not close(s['pos'][0], c)]
k = int(fold.split('/')[0]) if fold else None
train = [s for i, s in enumerate(syn) if k is None or i % 5 != k]
print(len(train), 'training lines', flush=True)
m = SentenceTransformer(BASE, device='cuda'); m.max_seq_length = 48
if FREEZE:  # the 250k-token vocabulary is most of the parameters (and of AdamW's state); lines touch few rows
    m[0].auto_model.embeddings.word_embeddings.weight.requires_grad_(False)
opt = torch.optim.AdamW([p for p in m.parameters() if p.requires_grad], lr=LR, weight_decay=0.01)
steps = EP * ((len(train) + B - 1) // B)
sched = torch.optim.lr_scheduler.LambdaLR(opt, lambda s: min(1, (s + 1) / (0.1 * steps)) * max(0, 1 - s / steps))

def emb(texts):
    f = m.tokenize(texts); f = {a: b.to('cuda') for a, b in f.items() if torch.is_tensor(b)}
    with torch.autocast('cuda', dtype=torch.bfloat16, enabled=BF16):
        e = m(f)['sentence_embedding']
    return torch.nn.functional.normalize(e.float(), dim=-1)

def cached_backward(qt, dt, loss_fn):
    """GradCache: embed everything without a graph, take the loss gradient w.r.t. the embeddings, then
    re-embed chunk by chunk with a graph and backpropagate that gradient — the full-batch gradient with
    memory bounded by CHUNK. Each chunk's RNG state is replayed so dropout matches."""
    texts = qt + dt; states, embs = [], []
    with torch.no_grad():
        for c in range(0, len(texts), CHUNK):
            states.append(torch.cuda.get_rng_state()); embs.append(emb(texts[c:c + CHUNK]))
    E = torch.cat(embs).requires_grad_()
    loss = loss_fn(E[:len(qt)], E[len(qt):]); loss.backward()
    for n, c in enumerate(range(0, len(texts), CHUNK)):
        torch.cuda.set_rng_state(states[n])
        (emb(texts[c:c + CHUNK]) * E.grad[c:c + CHUNK]).sum().backward()
    return loss

m.train()
for ep in range(EP):
    random.shuffle(train); tot = 0
    for b in range(0, len(train), B):
        batch = train[b:b + B]
        dids = [random.choice(s['pos']) for s in batch] + [j for s in batch for j in random.sample(s['negs'], min(NH, len(s['negs'])))]
        # another line's positive may be this line's positive too (or the same food): don't push it away
        mask = torch.tensor([[j in s['pos'] or close(s['pos'][0], j) for j in dids] for s in batch], device='cuda')
        target = torch.arange(len(batch), device='cuda')
        mask[target, target] = False
        loss_fn = lambda q, d: torch.nn.functional.cross_entropy((q @ d.T / T).masked_fill(mask, -1e4), target)
        qt, dt = ['query: ' + s['de'] for s in batch], [doc(j) for j in dids]
        opt.zero_grad()
        if CHUNK: loss = cached_backward(qt, dt, loss_fn)
        else: loss = loss_fn(emb(qt), emb(dt)); loss.backward()
        opt.step(); sched.step(); tot += loss.item() * len(batch)
    print(f'epoch {ep + 1}: loss {tot / len(train):.3f}', flush=True)
m.eval()
with torch.no_grad():
    D = m.encode([doc(j) for j in range(len(keys))], batch_size=512, normalize_embeddings=True, convert_to_numpy=True)
    sel = [i for i in range(len(syn)) if k is None or i % 5 == k]
    Qs = m.encode(['query: ' + syn[i]['de'] for i in sel], batch_size=512, normalize_embeddings=True, convert_to_numpy=True)
    Qg = m.encode(['query: ' + g['de'] for g in load_gold()[2]], batch_size=512, normalize_embeddings=True, convert_to_numpy=True)
os.makedirs(out, exist_ok=True)
np.save(f'{out}/dense_syn.npy', (Qs @ D.T).astype(np.float16)); np.save(f'{out}/syn_idx.npy', np.array(sel))
np.save(f'{out}/dense_gold.npy', (Qg @ D.T).astype(np.float16))
if k is None: m.save(f'{out}/model')
print('done', flush=True)
