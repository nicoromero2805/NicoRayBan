from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import requests
from io import BytesIO
import re
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from images_map import IMAGES  # <-- tu mapa manual de imágenes

app = FastAPI(title="Servicios Lentes")
# ✅ Variables modificables (precios)
Precio_lentes = 125000
precio_polarizado = 135000
app.mount("/static", StaticFiles(directory="."), name="static")
@app.get("/")
def home():
    return FileResponse("index.html")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# Google Sheet
# =========================
SHEET_ID = "1bIckZE8fh4HN48JrvSyVx1Egs9qJloek"
GID = "492873585"
CSV_URL = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=csv&gid={GID}"


# =========================
# Helpers
# =========================
def _norm(s: str) -> str:
    s = str(s).strip().lower()
    s = s.replace(" ", "").replace("_", "").replace("-", "")
    s = (s.replace("á", "a").replace("é", "e").replace("í", "i")
           .replace("ó", "o").replace("ú", "u").replace("ü", "u")
           .replace("ñ", "n"))
    return s


def _find_header_row(raw: pd.DataFrame) -> int | None:
    for i in range(min(len(raw), 80)):
        row = raw.iloc[i].fillna("").astype(str).map(_norm).tolist()
        has_sku = any(cell == "sku" or cell.endswith("sku") for cell in row)
        has_stock = any(cell == "stock" or cell.endswith("stock") for cell in row)
        if has_sku and has_stock:
            return i
    return None


def _pick_col(df: pd.DataFrame, *candidates: str) -> str | None:
    colmap = {_norm(c): c for c in df.columns}
    for cand in candidates:
        key = _norm(cand)
        if key in colmap:
            return colmap[key]
    return None


def drive_view_to_direct(url: str, size: str = "w1200") -> str:
    """
    Convierte cualquier link de Drive a una URL 'thumbnail' que se muestra bien en <img>.
    Soporta:
    - https://drive.google.com/file/d/FILE_ID/view?...
    - https://drive.google.com/uc?id=FILE_ID
    """
    if not url:
        return url

    # Caso 1: /file/d/<id>/
    m = re.search(r"/d/([^/]+)/", url)
    if m:
        file_id = m.group(1)
        return f"https://drive.google.com/thumbnail?id={file_id}&sz={size}"

    # Caso 2: uc?id=<id>
    m2 = re.search(r"[?&]id=([^&]+)", url)
    if m2:
        file_id = m2.group(1)
        return f"https://drive.google.com/thumbnail?id={file_id}&sz={size}"

    # Si no matchea, lo devolvemos tal cual
    return url


# =========================
# Carga del CSV
# =========================
def _load_df():
    r = requests.get(CSV_URL, timeout=25)
    if r.status_code != 200:
        raise HTTPException(status_code=502, detail=f"No pude descargar CSV (HTTP {r.status_code})")

    bio = BytesIO(r.content)

    raw = pd.read_csv(bio, header=None)
    header_row = _find_header_row(raw)
    if header_row is None:
        preview = raw.head(10).fillna("").astype(str).values.tolist()
        raise HTTPException(status_code=500, detail={
            "error": "No encontré fila de encabezados (sku/stock)",
            "preview": preview
        })

    bio.seek(0)
    df = pd.read_csv(bio, header=header_row)
    df.columns = [str(c).strip() for c in df.columns]

    sku_col = _pick_col(df, "Sku", "SKU", "sku")
    stock_col = _pick_col(df, "Stock", "STOCK", "stock")
    desc_col = _pick_col(df, "Descripción_modelo", "Descripcion_modelo", "Descripción", "Descripcion", "Modelo")

    if not sku_col or not stock_col:
        raise HTTPException(status_code=500, detail={
            "error": "No pude identificar columnas SKU/Stock",
            "columns": list(df.columns)
        })

    if not desc_col:
        df["__desc__"] = ""
        desc_col = "__desc__"

    df[sku_col] = df[sku_col].astype(str).str.strip()
    df[desc_col] = df[desc_col].astype(str).str.strip()
    df[stock_col] = pd.to_numeric(df[stock_col], errors="coerce").fillna(0).astype(int)

    df = df[df[sku_col].astype(str).str.len() > 0]

    out = pd.DataFrame({
        "sku": df[sku_col],
        "description": df[desc_col],
        "stock": df[stock_col],
    })

    out = out.groupby(["sku", "description"], as_index=False)["stock"].max()

    return out, header_row, list(df.columns)


# =========================
# Endpoints
# =========================

@app.get("/products")
def products():
    out, header_row, columns = _load_df()
    items = out.to_dict(orient="records")

    # Agregar imágenes desde images_map.py
    for it in items:
        raw_imgs = IMAGES.get(it["sku"], [])
        imgs = [drive_view_to_direct(u) for u in raw_imgs]
        it["foto_url"] = imgs[0] if imgs else None
        it["gallery"] = imgs

        desc = (it.get("description") or "").lower()
        it["price"] = precio_polarizado if "polarizado" in desc else Precio_lentes

    return {
        "count": len(items),
        "header_row": header_row,
        "columns": columns,
        "items": items
    }

@app.get("/stock/{sku}")
def stock_by_sku(sku: str):
    out, _, _ = _load_df()
    row = out[out["sku"] == sku]
    if row.empty:
        return {"sku": sku, "found": False, "stock": 0}
    it = row.iloc[0].to_dict()
    return {
        "sku": it["sku"],
        "description": it["description"],
        "stock": int(it["stock"]),
        "found": True
    }


@app.get("/debug")
def debug():
    out, header_row, columns = _load_df()
    items = out.head(5).to_dict(orient="records")
    return {
        "header_row_detected": header_row,
        "columns_detected": columns,
        "sample_items": items
    }
