REVELACION V2 - PRUEBA PARALELA
================================

Subir esta carpeta como: revelacion-v2

Ruta de prueba esperada:
https://lentesnico.com.ar/revelacion-v2/

IMPORTANTE EN FASTAPI
Agregar/montar la carpeta V2, por ejemplo:

app.mount(
    "/revelacion-v2",
    StaticFiles(directory="revelacion-v2", html=True),
    name="revelacion-v2"
)

Esta V2:
- Conserva el mismo dispositivo_id/localStorage de la versión actual.
- Precarga nombre y predicción de quien ya votó desde ese navegador.
- Agrega nombre sugerido para el bebé (opcional).
- Usa registrar_voto_v2.
- Muestra todos los nombres agrupados y ordenados alfabéticamente mediante ranking_nombres.
- No toca ni borra votos existentes.
- Mantiene resultado_votacion para el gráfico Niña/Niño.

Para pasar a producción:
1. Probar V2.
2. Conservar una copia de la carpeta revelacion actual.
3. Reemplazar el contenido de revelacion por el de esta V2.
4. Mantener la ruta pública /revelacion.
