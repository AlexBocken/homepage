"""Cospend receipt OCR microservice.

Runs the PP-OCR detection + recognition models via RapidOCR (ONNXRuntime, CPU) —
same models as PaddleOCR, but a clean pip install with no PaddlePaddle framework,
which matters on bleeding-edge Python (Arch ships 3.13, paddlepaddle does not).

Bind it to localhost and let the SvelteKit server proxy to it via
/api/cospend/ocr — it is not meant to be exposed publicly.

Response shape (engine-agnostic so the backend can be swapped later):
    { "lines": [ { "text": str, "box": [x0,y0,x1,y1], "confidence": float } ],
      "width": int, "height": int }
"""

import io

import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from PIL import Image
from rapidocr_onnxruntime import RapidOCR

# Default models read Latin letters + digits well (which is what receipt totals
# and prices are). A German/Latin recognition model can be swapped in later for
# better accented-word accuracy.
engine = RapidOCR()

app = FastAPI(title="cospend-ocr")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/ocr")
async def run_ocr(image: UploadFile = File(...)):
    raw = await image.read()
    try:
        rgb = np.array(Image.open(io.BytesIO(raw)).convert("RGB"))
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"bad image: {exc}")

    height, width = rgb.shape[:2]
    bgr = rgb[:, :, ::-1]  # RapidOCR/cv2 expect BGR
    result, _ = engine(bgr)

    lines = []
    for box, text, score in result or []:
        xs = [float(p[0]) for p in box]
        ys = [float(p[1]) for p in box]
        lines.append(
            {
                "text": text,
                "box": [min(xs), min(ys), max(xs), max(ys)],
                "confidence": float(score),
            }
        )

    return {"lines": lines, "width": width, "height": height}
