# Lentes CBA — Catálogo V2 (prototipo funcional)

Este paquete NO modifica los archivos actuales.

## Instalación
Copiar `catalogo-v2/` a la raíz del repositorio NicoRayBan.

En `Servicios.py`, antes de la ruta `/{vendedor}`, agregar:

```python
app.mount("/catalogo-v2", StaticFiles(directory="catalogo-v2", html=True), name="catalogo-v2")
```

Añadir `"catalogo-v2"` a `RUTAS_RESERVADAS` por seguridad y claridad.

Luego visitar `https://lentescba.com.ar/catalogo-v2/`.

## Qué funciona
- Productos y fotos reales desde `/products` (Google Sheets).
- Categorías inferidas desde la descripción, con las reglas actuales.
- Búsqueda, navegación horizontal, panel de categorías, detalle y galería.
- Stock, carrito local y pedido por WhatsApp.
- Diseño responsive, Instagram y WhatsApp flotante.

## Importante antes de publicar
- Es una V2 independiente, no un reemplazo exacto del checkout original.
- El carrito comparte la clave `lentes_cart_v2` con la tienda anterior; probar compatibilidad.
- El teléfono de WhatsApp de esta V2 usa el número principal actual como valor inicial.
  Falta integrar la configuración dinámica de vendedor que usa el sitio original.
- Probar importes, disponibilidad, galería, enlaces, móvil y proceso de compra.
- NO sustituir la página principal ni eliminar archivos originales hasta aprobar pruebas.
