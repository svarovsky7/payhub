import io
from pathlib import Path
from typing import List, Tuple, Dict, Any, Optional
from concurrent.futures import ThreadPoolExecutor

from pdf2image import convert_from_bytes
from PIL import Image


# ---------- Вспомогательные функции для цветовых режимов ----------
def _apply_color_mode(img: Image.Image, mode: str, threshold: int) -> Image.Image:
    mode = (mode or "color").lower()
    if mode == "grayscale":
        return img.convert("L")  # 8-bit grayscale
    if mode == "binary":
        # JPEG не поддерживает режим "1", поэтому оставляем "L" после пороговой обработки
        gray = img.convert("L")
        bw = gray.point(lambda p: 255 if p >= threshold else 0)
        return bw
    # color (по умолчанию)
    return img.convert("RGB")


# ---------- PDF -> JPG (список страниц) ----------
def pdf_bytes_to_jpegs(
    data: bytes,
    dpi: int = 200,
    jpeg_quality: int = 85,
    mode: str = "color",
    threshold: int = 180,
) -> List[Tuple[str, bytes]]:
    images = convert_from_bytes(data, dpi=dpi, fmt="jpeg", thread_count=2)
    out: List[Tuple[str, bytes]] = []
    for i, img in enumerate(images, start=1):
        img = img.convert("RGB")
        img = _apply_color_mode(img, mode, threshold)
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=jpeg_quality, optimize=True)
        out.append((f"{i}.jpg", buf.getvalue()))
    return out


def pack_to_zip(named_files: List[Tuple[str, bytes]]) -> bytes:
    import zipfile

    mem = io.BytesIO()
    with zipfile.ZipFile(mem, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
        for rel_path, data in named_files:
            zf.writestr(rel_path, data)
    return mem.getvalue()


def convert_many_pdfs(
    inputs: List[Tuple[str, bytes]],
    dpi: int,
    jpeg_quality: int,
    separate_archives: bool,
    max_workers: int | None = None,
    mode: str = "color",
    threshold: int = 180,
) -> List[Tuple[str, bytes]]:
    def convert_one(name_bytes: Tuple[str, bytes]) -> Tuple[str, List[Tuple[str, bytes]]]:
        name, data = name_bytes
        pages = pdf_bytes_to_jpegs(
            data, dpi=dpi, jpeg_quality=jpeg_quality, mode=mode, threshold=threshold
        )
        stem = Path(name).stem
        named = [(f"{stem}/{fname}", content) for fname, content in pages]
        return stem, named

    results: List[Tuple[str, List[Tuple[str, bytes]]]] = []
    with ThreadPoolExecutor(max_workers=max_workers) as pool:
        for res in pool.map(convert_one, inputs):
            results.append(res)

    if separate_archives:
        out: List[Tuple[str, bytes]] = []
        for stem, named in results:
            zip_bytes = pack_to_zip(named)
            out.append((f"{stem}.zip", zip_bytes))
        return out
    else:
        merged: List[Tuple[str, bytes]] = []
        for _, named in results:
            merged.extend(named)
        return [("converted.zip", pack_to_zip(merged))]


# ---------- Обрезка по рамкам и сборка в единый PDF ----------
def crop_frames_to_pdf_bytes(
    pages: List[Image.Image],
    frames: List[Dict[str, Any]],
    page_sizes: Optional[List[Dict[str, int]]] = None,
) -> bytes:
    """
    frames: список рамок в порядке сборки выходного PDF.
    Формат каждой рамки:
      {
        "page": <int, 0-based>,
        "x": <int>, "y": <int>, "width": <int>, "height": <int>,
        "client_page_width": <int, optional>,
        "client_page_height": <int, optional>
      }
    Координаты пиксельные, отсчёт от левого верхнего угла страницы.
    Если переданы client_page_width/height, координаты масштабируются.
    Выход: единый PDF (bytes), каждая обрезка — отдельная страница PDF (в порядке frames).
    """
    if not isinstance(frames, list) or not frames:
        raise ValueError("frames must be a non-empty list of {page,x,y,width,height}")

    crops: List[Image.Image] = []
    skipped_frames: List[Dict[str, str]] = []

    for i, fr in enumerate(frames):
        # валидация полей рамки
        try:
            p = int(fr["page"])
            x = int(fr["x"])
            y = int(fr["y"])
            w = int(fr["width"])
            h = int(fr["height"])
        except Exception as e:
            raise ValueError(f"Frame #{i}: invalid fields, expected integers page,x,y,width,height") from e

        if not (0 <= p < len(pages)):
            raise ValueError(f"Frame #{i}: page index {p} out of range (0..{len(pages)-1})")

        if w <= 0 or h <= 0:
            skipped_frames.append({
                "index": str(i),
                "page": str(p),
                "coords": f"({x},{y}) {w}×{h}",
                "page_size": f"{pages[p].width}×{pages[p].height}",
                "reason": "non-positive width/height",
            })
            continue

        page_img = pages[p]
        W, H = page_img.width, page_img.height
        
        # Координаты используются напрямую, так как обрезаем те же изображения, что видел клиент
        print(f"[Frame #{i}] Page={p}, Size={W}×{H}, Coords: ({x},{y}) {w}×{h}")

        # исходные границы рамки
        x1_raw, y1_raw = x, y
        x2_raw, y2_raw = x + w, y + h

        # полностью вне страницы?
        if x2_raw <= 0 or y2_raw <= 0 or x1_raw >= W or y1_raw >= H:
            reason = []
            if x2_raw <= 0:
                reason.append("frame entirely left of page")
            if x1_raw >= W:
                reason.append("frame entirely right of page")
            if y2_raw <= 0:
                reason.append("frame entirely above page")
            if y1_raw >= H:
                reason.append("frame entirely below page")
            skipped_frames.append({
                "index": str(i),
                "page": str(p),
                "coords": f"({x},{y}) {w}×{h}",
                "page_size": f"{W}×{H}",
                "reason": ", ".join(reason) or "outside page bounds",
            })
            continue

        # клиппинг рамки в границах страницы
        x1 = max(0, min(W, x1_raw))
        y1 = max(0, min(H, y1_raw))
        x2 = max(0, min(W, x2_raw))
        y2 = max(0, min(H, y2_raw))

        # проверка на вырожденность после клиппинга
        if x2 <= x1 or y2 <= y1:
            skipped_frames.append({
                "index": str(i),
                "page": str(p),
                "coords": f"({x},{y}) {w}×{h}",
                "page_size": f"{W}×{H}",
                "reason": "clipped to zero area",
            })
            continue

        crop = page_img.crop((int(x1), int(y1), int(x2), int(y2))).convert("RGB")
        crops.append(crop)

    # Если есть пропущенные рамки — сообщаем об этом как об ошибке (критично)
    if skipped_frames:
        details = "; ".join(
            f"Frame #{s['index']} page={s['page']} coords={s['coords']} "
            f"(page {s['page_size']}; {s['reason']})"
            for s in skipped_frames
        )
        raise ValueError(
            f"Skipped {len(skipped_frames)} frames out of {len(frames)} due to invalid/out-of-bounds coordinates. "
            f"Details: {details}. Hint: ensure client DPI and page coordinates match the server rasterization DPI."
        )

    if not crops:
        raise ValueError("No valid frames after clipping.")

    # Сборка единого PDF (каждый обрезок — отдельная страница)
    buf = io.BytesIO()
    first, rest = crops[0], crops[1:]
    first.save(buf, format="PDF", save_all=True, append_images=rest)
    return buf.getvalue()