# Lentes CBA — Catálogo V2.1
Subí los archivos de esta carpeta a la carpeta existente `Catalogov2` de GitHub, junto a Servicios.py.

FastAPI (ya configurado):
`app.mount("/Catalogov2", StaticFiles(directory="Catalogov2", html=True), name="Catalogov2")`

URL: https://lentescba.com.ar/Catalogov2/
Vendedor específico: https://lentescba.com.ar/Catalogov2/?vendedor=Santi

Incluye: 3 columnas PC / 2 móvil, franja de presentación compacta, anuncios alternantes, vendedor por `/api/vendedor`, categorías, búsqueda, paginación 20/40/60/100, íconos SVG, galería con miniaturas y WhatsApp a la izquierda.

IMPORTANTE: checkout de este prototipo es simplificado. NO reemplazar la web original hasta integrar el checkout completo (datos del cliente, entrega, pagos) y verificar la configuración de cada vendedor.
