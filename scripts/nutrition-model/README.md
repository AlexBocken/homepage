# Nutrition model training

Trains what `src/lib/server/nutritionReranker.ts` runs: a fine-tuned
multilingual-e5-small and the reranker's weights. The architecture and the
reasons behind it are in the main README ("Machine learning").

## Data

- `data/labelled-lines.json`: 3,693 recipe-style ingredient lines written and
  labelled by LLM agents (3,605 with an entry, 88 judged not a food). Per line,
  `picks` are the right entries (all equivalent ones, BLS and USDA) and
  `shortlist` the 20 candidates the agents were shown; its wrong entries are the
  hard negatives for fine-tuning. Agents could search the full table when the
  shortlist lacked the food (~30 % of lines).
- `data/prod-labels.json`: the site's manual choices (global overwrites and
  hand-edited recipe mappings) at the time of training. They are the test set,
  and join training only for the final fit.

The entry tables come from `src/lib/data/` (`blsDb.ts`, `nutritionDb.ts`,
`nutritionNamesDe.json`).

## Run

```sh
./run.sh
```

1. `ft.py`: 5 fold models plus one on all lines. The fold models give each line
   an embedding similarity from a model that never trained on it, so the
   reranker learns how far to trust the embedding on unseen ingredients.
2. ONNX export and dynamic int8 quantisation (`export/`).
3. `onnx_dense.py`: the prod labels' similarities under the int8 model, which
   is what production computes.
4. `evaluate.py`: exact and "usable" accuracy on the prod labels.
5. `final_fit.py`: writes `src/lib/data/nutritionReranker.json` and
   `nutritionTrainingLines.json`.

Then ship it:

```sh
# model files to where scripts/download-models.ts fetches them
ssh root@bocken.org mkdir -p /var/www/static/models/nutrition-e5-small/onnx
scp export/{config.json,tokenizer.json,tokenizer_config.json} root@bocken.org:/var/www/static/models/nutrition-e5-small/
scp export/model_quantized.onnx root@bocken.org:/var/www/static/models/nutrition-e5-small/onnx/
sha256sum export/{config.json,tokenizer.json,tokenizer_config.json} export/model_quantized.onnx
# → paste the hashes into scripts/download-models.ts, then from the repo root:
pnpm exec vite-node scripts/download-models.ts
pnpm exec vite-node scripts/embed-nutrition-entries.ts
```

`lib.py`'s features are mirrored in TypeScript. A change to one needs the same
change in the other, or the weights stop meaning anything.
