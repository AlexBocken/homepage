# cospend-ocr

Server-side receipt OCR for the cospend add-payment flow. Runs the **PP-OCR
models on ONNXRuntime** (via RapidOCR, CPU) behind a small FastAPI service bound
to localhost; the SvelteKit app proxies to it through `/api/cospend/ocr`.

## Why a separate service

OCR is a Python/native stack — it doesn't belong in the Node bundle. Keeping it
as its own localhost service means the website talks to it server-to-server, the
receipt photo never leaves your machine, and the engine can be upgraded without
touching the app.

## Why RapidOCR (not PaddleOCR directly)

RapidOCR runs the *same PP-OCR detection + recognition models*, but on
ONNXRuntime instead of the PaddlePaddle framework — so it `pip install`s cleanly
on modern Python (paddlepaddle has no wheels for Python 3.13). Same accuracy,
same per-line boxes.

## Install on the server

**Use Python 3.12** — the OCR wheels don't support 3.13 yet, so a 3.13 system
interpreter (e.g. Arch) will fail with "Could not find a version that satisfies".

```sh
sudo mkdir -p /opt/cospend-ocr
sudo cp app.py requirements.txt /opt/cospend-ocr/
cd /opt/cospend-ocr

# with uv (fetches 3.12 automatically if missing):
uv venv --python 3.12 venv
uv pip install --python venv/bin/python -r requirements.txt

# …or plain venv if you have python3.12 installed:
#   python3.12 -m venv venv
#   ./venv/bin/pip install -r requirements.txt
```

Smoke test:

```sh
./venv/bin/uvicorn app:app --host 127.0.0.1 --port 8089
curl -F image=@some-receipt.jpg http://127.0.0.1:8089/ocr
```

## Run as a service

```sh
sudo cp cospend-ocr.service /etc/systemd/system/
# edit User= and paths in the unit if needed
sudo systemctl daemon-reload
sudo systemctl enable --now cospend-ocr
```

## Wire up the website

The website reads the service URL from `OCR_SERVICE_URL` in its `.env`, **inlined
at build time** (like the rest of the config), so set it before building:

```
OCR_SERVICE_URL=http://127.0.0.1:8089/ocr
```

This must match the service's bind address. The systemd unit sets that via
`OCR_HOST` / `OCR_PORT` — change those together with `OCR_SERVICE_URL` if you
move the port. For a manual/dev run, pass them on the command line:

```sh
./venv/bin/uvicorn app:app --host 127.0.0.1 --port 8089
```

## Notes

- **First request is slow** (model load); subsequent ones are ~1–3 s per receipt.
- Models ship inside the `rapidocr-onnxruntime` wheel — no network needed at runtime.
- German umlauts in item names may misread with the default model; receipt
  totals/prices (digits) are unaffected. A Latin/German recognition model can be
  swapped in via RapidOCR's config if needed.
- CPU-only by default. To use the Intel Arc GPU later, install
  `onnxruntime-openvino` and point RapidOCR at the OpenVINO execution provider —
  same models, same response shape, no app changes.
