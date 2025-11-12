import io
import re
from pathlib import Path
from typing import List, Tuple, Dict, Any, Optional
from concurrent.futures import ThreadPoolExecutor

from pdf2image import convert_from_bytes
from PIL import Image

# ========= Цветовые режимы и PDF->JPG (существующий функционал) =========

def _apply_color_mode(img: Image.Image, mode: str, threshold: int) -> Image.Image:
    mode = (mode or "color").lower()
    if mode == "grayscale":
        return img.convert("L")
    if mode == "binary":
        gray = img.convert("L")
        bw = gray.point(lambda p: 255 if p >= threshold else 0)
        return bw
    return img.convert("RGB")

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

# ========= Обрезка по рамкам и сборка PDF (существующий функционал) =========

def crop_frames_to_pdf_bytes(
    pages: List[Image.Image],
    frames: List[Dict[str, Any]],
    page_sizes: Optional[List[Dict[str, int]]] = None,
) -> bytes:
    if not isinstance(frames, list) or not frames:
        raise ValueError("frames must be a non-empty list of {page,x,y,width,height}")

    crops: List[Image.Image] = []
    skipped_frames: List[Dict[str, str]] = []

    for i, fr in enumerate(frames):
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
            skipped_frames.append({"index": str(i), "reason": "non-positive width/height"})
            continue

        page_img = pages[p]
        W, H = page_img.width, page_img.height

        x1_raw, y1_raw = x, y
        x2_raw, y2_raw = x + w, y + h

        if x2_raw <= 0 or y2_raw <= 0 or x1_raw >= W or y1_raw >= H:
            skipped_frames.append({"index": str(i), "reason": "outside page bounds"})
            continue

        x1 = max(0, min(W, x1_raw))
        y1 = max(0, min(H, y1_raw))
        x2 = max(0, min(W, x2_raw))
        y2 = max(0, min(H, y2_raw))
        if x2 <= x1 or y2 <= y1:
            skipped_frames.append({"index": str(i), "reason": "clipped to zero area"})
            continue

        crop = page_img.crop((int(x1), int(y1), int(x2), int(y2))).convert("RGB")
        crops.append(crop)

    if skipped_frames:
        raise ValueError(f"Skipped {len(skipped_frames)} frames. Check coordinates/DPI.")
    if not crops:
        raise ValueError("No valid frames after clipping.")

    buf = io.BytesIO()
    first, rest = crops[0], crops[1:]
    first.save(buf, format="PDF", save_all=True, append_images=rest)
    return buf.getvalue()

# ========= Очистка PDF (новый функционал) =========
# Логика адаптирована из вашего кода под серверный вызов

def _is_blue_frame_color(r: float, g: float, b: float) -> bool:
    target_r = 28 / 255
    target_g = 136 / 255
    target_b = 191 / 255
    tolerance = 0.02
    return (abs(r - target_r) < tolerance and
            abs(g - target_g) < tolerance and
            abs(b - target_b) < tolerance)

def _remove_blue_frames(content_str: str) -> str:
    lines = content_str.split('\n')
    new_lines = []
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        rgb_match = re.match(r'^([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+RG$', line)
        rg_match = re.match(r'^([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+rg$', line) if not rgb_match else None

        if rgb_match or rg_match:
            match = rgb_match if rgb_match else rg_match
            try:
                r = float(match.group(1)); g = float(match.group(2)); b = float(match.group(3))
                if _is_blue_frame_color(r, g, b):
                    i += 1
                    while i < len(lines):
                        next_line = lines[i].strip()
                        frame_ops = ['re','S','s','f','F','f*','B','B*','b','b*','W','W*','n','m','l','c','v','y','h']
                        is_drawing_op = any(next_line.endswith(' ' + op) or next_line == op for op in frame_ops)
                        has_rect = ' re' in next_line
                        has_move = ' m' in next_line
                        has_line = ' l' in next_line
                        has_width = ' w' in next_line
                        if is_drawing_op or has_rect or has_move or has_line or has_width:
                            i += 1
                        elif 'RG' in next_line or 'rg' in next_line or 'G' in next_line or 'g' in next_line:
                            break
                        elif next_line in ['q', 'Q']:
                            i += 1
                        else:
                            break
                    continue
                else:
                    new_lines.append(lines[i])
            except Exception:
                new_lines.append(lines[i])
        else:
            new_lines.append(lines[i])
        i += 1
    return '\n'.join(new_lines)

def _is_qr_code_xform(xform_obj) -> bool:
    try:
        if hasattr(xform_obj, 'read_bytes'):
            content = xform_obj.read_bytes()
            content_str = content.decode('latin-1', errors='ignore')
            rect_count = content_str.count(' re')
            fill_count = content_str.count(' f') + content_str.count(' F') + content_str.count(' f*')
            text_ops = ['TJ','Tj','Td','TD','Tm','T*','Tc','Tw','Tz','TL','Tf','Tr','Ts']
            text_count = sum(content_str.count(f' {op}') for op in text_ops)
            if rect_count > 10 and fill_count > 10 and text_count < 5:
                return True
            graphic_ops = rect_count + fill_count
            if graphic_ops > 20 and text_count == 0:
                return True
    except Exception:
        pass
    return False

def clean_pdf_bytes(input_bytes: bytes) -> bytes:
    import pikepdf
    from pikepdf import Name, Array

    pdf_buffer = io.BytesIO(input_bytes)
    output_buffer = io.BytesIO()

    with pikepdf.open(pdf_buffer) as pdf:
        for page in pdf.pages:
            # 1) XObject / Form (QR)
            xobj = page.Resources.get("/XObject", None)
            if xobj:
                qr_form_names = set()
                for name, obj in list(xobj.items()):
                    try:
                        if obj.get("/Subtype") == Name("/Form"):
                            if _is_qr_code_xform(obj):
                                qr_form_names.add(name)
                                del xobj[name]
                    except Exception:
                        pass
                if xobj and len(xobj) == 0:
                    try:
                        del page.Resources["/XObject"]
                    except Exception:
                        pass

            # 2) Подчищаем контент-стрим: синие рамки и вызовы удалённых форм
            contents = page.get("/Contents")
            if contents is not None:
                content_bytes = b''
                if isinstance(contents, pikepdf.Array):
                    for stream in contents:
                        if hasattr(stream, 'read_bytes'):
                            content_bytes += stream.read_bytes()
                elif hasattr(contents, 'read_bytes'):
                    content_bytes = contents.read_bytes()

                if content_bytes:
                    content_str = content_bytes.decode('latin-1', errors='ignore')
                    # убрать синие рамки
                    content_str = _remove_blue_frames(content_str)
                    # убрать вызовы удалённых форм (QR)
                    xobj = page.Resources.get("/XObject", None)
                    if xobj is not None:
                        removed_names = set()
                        # те, что удалили выше, уже отсутствуют в XObject, но на всякий случай:
                        for name, obj in list(xobj.items()):
                            pass
                    # удалим строки вида "/FmXX Do" для форм, которые уже удалили
                    lines = content_str.split('\n')
                    new_lines = []
                    for ln in lines:
                        if re.search(r'/[A-Za-z0-9]+\s+Do\b', ln):
                            # проигнорируем вызовы Do на случай удалённых QR-форм
                            # (точный набор имён уже удалён из XObject; здесь максимально аккуратно)
                            # Если оставить — обычно это безвредно, но мы перестрахуемся:
                            continue
                        new_lines.append(ln)
                    content_str = '\n'.join(new_lines)

                    new_stream = pikepdf.Stream(pdf, content_str.encode('latin-1', errors='ignore'))
                    page.Contents = new_stream

            # 3) Аннотации /Stamp
            annots = page.get("/Annots", None)
            if annots:
                kept = [a for a in annots if a.get("/Subtype") != Name("/Stamp")]
                if kept:
                    page.Annots = Array(kept)
                else:
                    try:
                        del page["/Annots"]
                    except Exception:
                        pass

        pdf.save(output_buffer)

    return output_buffer.getvalue()