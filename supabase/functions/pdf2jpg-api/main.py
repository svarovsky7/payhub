from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request
from fastapi.responses import StreamingResponse, RedirectResponse, JSONResponse
from typing import List
import io, json, base64

from .utils import (
    convert_many_pdfs,
    crop_frames_to_pdf_bytes,
    clean_pdf_bytes,
)

app = FastAPI(title="PDF→JPG & PDF Tools API (Docker)", version="0.4.0")

try:
    from fastapi.middleware.cors import CORSMiddleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
except Exception:
    pass

@app.get("/")
def root():
    return RedirectResponse(url="/docs", status_code=302)

@app.get("/health")
def health_get():
    return {"status": "ok"}

@app.head("/health")
def health_head():
    return

# ---------- Конвертация PDF -> JPG (ZIP) ----------
@app.post("/convert")
async def convert(
    files: List[UploadFile] = File(..., description="Один или несколько PDF"),
    dpi: int = Form(200),
    jpeg_quality: int = Form(85),
    separate_archives: bool = Form(False),
    mode: str = Form("color", description="color | grayscale | binary"),
    threshold: int = Form(180, description="Порог для binary: 0..255"),
):
    if not files:
        raise HTTPException(400, "No files uploaded")
    if not (72 <= dpi <= 600):
        raise HTTPException(400, "dpi must be in [72, 600]")
    if not (50 <= jpeg_quality <= 95):
        raise HTTPException(400, "jpeg_quality must be in [50, 95]")
    mode = (mode or "color").lower()
    if mode not in {"color", "grayscale", "binary"}:
        raise HTTPException(400, "mode must be one of: color, grayscale, binary")
    if not (0 <= threshold <= 255):
        raise HTTPException(400, "threshold must be in [0, 255]")

    items: list[tuple[str, bytes]] = []
    for f in files:
        name = f.filename or "input.pdf"
        if not name.lower().endswith(".pdf"):
            raise HTTPException(400, f"Only PDF allowed: {name}")
        data = await f.read()
        if not data:
            raise HTTPException(400, f"Empty file: {name}")
        items.append((name, data))

    archives = convert_many_pdfs(
        items, dpi=dpi, jpeg_quality=jpeg_quality,
        separate_archives=separate_archives, max_workers=None,
        mode=mode, threshold=threshold,
    )

    if len(archives) == 1:
        name, zip_bytes = archives[0]
        return StreamingResponse(
            io.BytesIO(zip_bytes),
            media_type="application/zip",
            headers={"Content-Disposition": f'attachment; filename="{name}"'},
        )

    import zipfile
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as z:
        for name, data in archives:
            z.writestr(name, data)
    return StreamingResponse(
        io.BytesIO(buf.getvalue()),
        media_type="application/zip",
        headers={"Content-Disposition": 'attachment; filename="archives.zip"'},
    )

# ---------- Резка по рамкам -> единый PDF ----------
@app.post("/crop-to-pdf")
async def crop_to_pdf(
    page_images: List[UploadFile] = File(..., description="JPG изображения страниц"),
    frames: str = Form(..., description="JSON-список рамок [{page,x,y,width,height}, ...]"),
):
    if not page_images:
        raise HTTPException(400, "No page images uploaded")
    try:
        frames_list = json.loads(frames)
        if not isinstance(frames_list, list) or not frames_list:
            raise ValueError
    except Exception:
        raise HTTPException(400, "frames must be a non-empty JSON array")

    try:
        from PIL import Image as PILImage
        pages = []
        for img_file in page_images:
            img_data = await img_file.read()
            if not img_data:
                raise ValueError(f"Empty image: {img_file.filename}")
            img = PILImage.open(io.BytesIO(img_data))
            pages.append(img.convert("RGB"))
        pdf_bytes = crop_frames_to_pdf_bytes(pages, frames_list, None)
    except ValueError as ve:
        raise HTTPException(400, str(ve))
    except Exception as e:
        raise HTTPException(500, f"Processing error: {e}")

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="crops.pdf"'},
    )

# ---------- НОВОЕ: Очистка PDF от QR, синих рамок и /Stamp ----------
# Вариант 1: multipart (файл) -> application/pdf
@app.post("/clean-pdf")
async def clean_pdf_endpoint(file: UploadFile = File(..., description="Исходный PDF для очистки")):
    name = file.filename or "input.pdf"
    if not name.lower().endswith(".pdf"):
        raise HTTPException(400, f"Only PDF allowed: {name}")
    data = await file.read()
    if not data:
        raise HTTPException(400, "Empty file")
    try:
        cleaned = clean_pdf_bytes(data)
    except Exception as e:
        raise HTTPException(500, f"Processing error: {e}")

    return StreamingResponse(
        io.BytesIO(cleaned),
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="cleaned.pdf"'},
    )

# Вариант 2: JSON { pdf_base64 } -> JSON { pdf_base64 }
@app.post("/clean-pdf-base64")
async def clean_pdf_base64(request: Request):
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(400, "Invalid JSON")
    pdf_b64 = body.get("pdf_base64")
    if not pdf_b64:
        raise HTTPException(400, "Missing pdf_base64")

    try:
        raw = base64.b64decode(pdf_b64)
        cleaned = clean_pdf_bytes(raw)
        cleaned_b64 = base64.b64encode(cleaned).decode("utf-8")
        return JSONResponse({"success": True, "pdf_base64": cleaned_b64})
    except Exception as e:
        raise HTTPException(500, f"Processing error: {e}")