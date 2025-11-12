from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse, RedirectResponse
from typing import List
import io
import json

from .utils import (
    convert_many_pdfs,
    crop_frames_to_pdf_bytes,
)

app = FastAPI(title="PDF→JPG API (Docker)", version="0.3.0")

# CORS (если потребуется вызывать из браузера)
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
    # Удобный редирект на интерактивную документацию
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
        items,
        dpi=dpi,
        jpeg_quality=jpeg_quality,
        separate_archives=separate_archives,
        max_workers=None,
        mode=mode,
        threshold=threshold,
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


# ---------- Новый эндпоинт: режем по рамкам и собираем в единый PDF ----------
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
        raise HTTPException(
            400,
            "frames must be a non-empty JSON array: [{page,x,y,width,height}, ...]",
        )

    try:
        # Загружаем изображения страниц
        from PIL import Image as PILImage
        pages = []
        for img_file in page_images:
            img_data = await img_file.read()
            if not img_data:
                raise ValueError(f"Empty image: {img_file.filename}")
            img = PILImage.open(io.BytesIO(img_data))
            pages.append(img.convert("RGB"))
        
        print(f"[crop-to-pdf] Loaded {len(pages)} page images")
        for i, page in enumerate(pages):
            print(f"  Page {i}: {page.width}×{page.height}")
        
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