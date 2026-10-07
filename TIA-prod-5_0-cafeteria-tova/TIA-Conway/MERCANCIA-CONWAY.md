# Módulo "Mercancía Conway" — contrato con n8n

El botón **Mercancía Conway** solo aparece en cajas cuya `config.json` tiene
`cadena: "conway"` (o `mercancia.activo: true`).

## Flujo en la caja
1. La cajera abre el módulo → muestra **"Marque la mercancía"**.
2. Escanea el código de barra del artículo con el lector físico.
3. El TIA llama a `mercancia.webhook_consulta` y muestra: **departamento,
   precio, descripción y código genérico**, con dos botones:
   - **Venta**: inyecta el **código genérico** al POS (KeyboardEvent Numpad*)
     y llama a `mercancia.webhook_venta` para guardar la venta.
   - **Consulta**: borra lo consultado y vuelve a quedar listo para escanear.

## 1) webhook_consulta  (buscar artículo)
El TIA envía (POST JSON):
```json
{ "codigo": "7501234567890", "cadena": "conway", "terminal": "conway-001",
  "caja": "S106", "base": "B11" }
```
n8n debe responder con el artículo. Se aceptan varios nombres de campo
(el TIA los normaliza):
```json
{
  "departamento": "CABALLEROS",
  "precio": "19.99",
  "descripcion": "CAMISA MANGA LARGA AZUL",
  "codigo_generico": "0000000012345"
}
```
- Alias aceptados: `departamento|depto|department`, `precio|price|monto`,
  `descripcion|desc|nombre|description`,
  `codigo_generico|codigoGenerico|generico|upc_generico|codigo`.
- Si no existe, responder `{ "noEncontrado": true }` (o `encontrado:false`).
- También se acepta arreglo `[ { ... } ]` o `{ "data": { ... } }`.

## 2) webhook_venta  (guardar venta)
Al presionar **Venta**, el TIA envía (POST JSON):
```json
{
  "departamento": "CABALLEROS",
  "precio": "19.99",
  "descripcion": "CAMISA MANGA LARGA AZUL",
  "codigo_generico": "0000000012345",
  "id_recibo": "REC-000123",
  "codigo_escaneado": "7501234567890",
  "cadena": "conway", "terminal": "conway-001",
  "caja": "S106", "base": "B11",
  "ts": "2026-09-06T19:30:00.000Z"
}
```
Guardar en la tabla los 5 campos pedidos: departamento, precio, descripción,
código_generico e id_recibo (los demás son de contexto/auditoría).

## id_recibo (se toma del DOM del POS)
Orden de búsqueda:
1. `config.json → mercancia.recibo_selector`: selector CSS del elemento del
   POS que muestra el número de recibo (se lee `.value` o el texto).
2. `config.json → mercancia.recibo_regex`: regex sobre el texto de la página;
   el **grupo 1** es el número.
3. Si ambos están vacíos: heurística por etiquetas
   (Recibo / Documento / Transacción / Factura).

**Para afinarlo:** en una caja real, con una venta abierta, abrir la consola
del TIA (F12) y ejecutar `__tiaMercRecibo()`. Devuelve lo que detecta y lo
imprime en consola. Con eso se fija `recibo_selector` o `recibo_regex` exacto.

## Webhooks
Por defecto (en el código) apuntan a:
- `https://n8ndev.grupotova.com/webhook/mercancia-consulta-Conway`
- `https://n8ndev.grupotova.com/webhook/mercancia-venta-Conway`

Se pueden cambiar sin tocar el código en `config.json → mercancia`.
