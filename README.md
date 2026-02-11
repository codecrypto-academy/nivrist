# nivrist
###### Codecrypto Academy Student Repo

---

## Proyectos

| # | Proyecto | Carpeta | Descripcion |
|---|----------|---------|-------------|
| 1 | Oraculo CodeCrypto | `1-Oraculo/` | Oraculo on-chain que consulta la NASA NEO API para obtener el conteo de meteoritos cercanos a la Tierra en una fecha seleccionada y lo escribe en el smart contract. |

---

### 1 - Oraculo

**Smart Contract:** `OraculoCodeCrypto` (Solidity)

**Stack:** HTML, Vanilla JS, Web3.js v1.10.0, Ganache, NASA NEO API

**Flujo del oraculo (event-driven):**
1. El usuario selecciona una fecha y hace click en "Actualizar"
2. `actualizarOraculo()` llama `update()` en el contrato → emite evento `__callbackNewData`
3. Un listener independiente (`escucharEventos`) detecta el evento via polling (solo eventos nuevos, ignora historicos)
4. El listener ejecuta `updateData()` → consulta la NASA NEO API con la fecha seleccionada
5. Obtiene `element_count` (meteoritos cercanos a la Tierra) y escribe el valor en el contrato con `setNnumeroMeteoritos()`
6. Solo se gasta gas cuando el usuario hace una peticion (bajo demanda)

**Archivos:**
- `OraculoCodeCrypto.json` — ABI del contrato
- `index.html` — Interfaz del dashboard (calendario para seleccionar fecha)
- `app.js` — Logica de conexion, listener de eventos, consulta NASA API y signing de transacciones

**Como ejecutar:**
```bash
cd "1-Oraculo" && python3 -m http.server 8080
```
Abrir `http://localhost:8080` en el navegador (requiere Ganache corriendo en `http://127.0.0.1:7545`).