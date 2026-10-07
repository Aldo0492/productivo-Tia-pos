// ============================================================
// TIA POS - Extension unificada (Grupo Tova)
// ============================================================
// Este archivo reune, en un solo lugar, dos modulos que corren
// en el mundo normal de la pagina (world: ISOLATED):
//
//   1) ASISTENTE IA FLOTANTE  -> se activa en cualquier URL
//      (el boton "TIA POS" sale en la primera pantalla / cajero)
//   2) PUBLICIDAD DINAMICA    -> se activa solo en la pantalla
//      del cliente: http://localhost:8000/sidecarscreen/*
//
// El control tactil (touch-control.js) va en archivo aparte porque
// Chrome exige inyectarlo en world:MAIN y en document_start para
// poder interceptar el WebSocket del POS; no se puede fusionar aqui
// sin perder esa capacidad.
//
// Cada modulo se auto-enruta segun la URL en la que corre, de modo
// que este mismo archivo puede cargarse globalmente sin conflictos.
// ============================================================

(function () {
  'use strict';
  // ============================================================
  // ENRUTAMIENTO
  // Setup dual en todas las cajas:
  //   Pantalla 1 = cajera = monitor PRINCIPAL  -> aqui va el ASISTENTE
  //   Pantalla 2 = cliente = monitor SECUNDARIO -> aqui va la PUBLICIDAD
  //
  // El ASISTENTE se carga en TODAS las URLs (igual que en productivo),
  // incluida la del sidecar. El boton TIA POS se MUESTRA u OCULTA
  // dinamicamente segun si la ventana esta en el monitor principal
  // (ver verificarPantalla mas abajo). Asi:
  //   - Pantalla del cliente (monitor 2): boton oculto, solo se ve el video.
  //   - Pantalla de la cajera (monitor 1): boton visible, aunque se haya
  //     tildado el sidecar ahi -> permite cerrar el navegador y recuperarse.
  // La PUBLICIDAD si va atada a la URL /sidecarscreen/ (mas abajo).
  // ============================================================

  // ==========================================================
  // MODULO 1: ASISTENTE IA FLOTANTE (se carga en todas las URLs)
  // ==========================================================
  {
    (function () {
const WEBHOOK_VALIDAR_SUPERVISOR = "https://tia.grupotova.com/webhook/validar-supervisor-stevens";
const WEBHOOK_ARQUEO_CONSULTA = "https://tia.grupotova.com/webhook/arqueo-consulta-Stevens";
// Lista de auditores autorizados (ID del carnet → nombre)
const AUDITORES_AUTORIZADOS = [
  { id: "000320", nombre: "SILVIA ELENA CABALLERO SANCHEZ" },
  { id: "000620", nombre: "FATIMA LISBETH CASTILLO GIONO" },
  { id: "000849", nombre: "ISMELDA MEDINA DE LEON" },
  { id: "001126", nombre: "YARIELA CORTES MARTINEZ" },
  { id: "001623", nombre: "JATZIBETH SHOLAYN GARCIA CASTRO" },
  { id: "050694", nombre: "ALDO GUERRERO" },
  { id: "050065", nombre: "ANDREA ESTEFANIA FIGUEREDO BELLORIN" },
  { id: "057629", nombre: "CECILIA YOHANA SERRANO PEREZ" },
  { id: "051173", nombre: "MELISSA RUIZ GARCIA" },
  { id: "057333", nombre: "YITZENITH DEL CARMEN LEZCANO URIRIOLA" }
  // ← Agrega o quita auditores aquí. El ID debe coincidir con los primeros 6 dígitos del carnet.
];

const WEBHOOK_ARQUEO_GUARDAR = "https://tia.grupotova.com/webhook/arqueo-guardar-Stevens";
const WEBHOOK_VALIDAR_SOBRE = "https://tia.grupotova.com/webhook/validar-sobre-Stevens";
const WEBHOOK_FONDOS_CONSULTA = "https://tia.grupotova.com/webhook/fondos-consulta-Stevens";
const WEBHOOK_FONDOS = "https://tia.grupotova.com/webhook/fondos-limpios-Stevens";
const WEBHOOK_TICKET      = "https://tia.grupotova.com/webhook/servicedesk";
const WEBHOOK_PROCESOS    = "https://tia.grupotova.com/webhook/chatbot/procedimientospos-Stevens";
const WEBHOOK_ERRORES     = "https://tia.grupotova.com/webhook/Soporte-stevens";
const WEBHOOK_SERVICEDESK = "https://tia.grupotova.com/webhook/servicedesk"; // Cambia por tu URL

if (!document.getElementById("ia-pos-floating-btn")) {

// ── Botón flotante ─────────────────────────────────────────────
const button = document.createElement("div");
button.id = "ia-pos-floating-btn";
button.innerHTML = `<span>TIA POS</span>`;
document.body.appendChild(button);

// ── Panel principal ────────────────────────────────────────────
const panel = document.createElement("div");
panel.id = "ia-pos-panel";

panel.innerHTML = `
<div class="ia-header">
  <div class="ia-brand">
    <img src="${chrome.runtime.getURL("TIA.png")}" class="ia-logo" onerror="this.style.display='none'">
    <span class="ia-brand-name">TIA POS</span>
  </div>
  <div class="ia-header-actions">
    <button id="ia-back" class="ia-hidden" title="Volver">←</button>
    <button id="ia-close" title="Cerrar">✕</button>
  </div>
</div>

<!-- ===== VISTA: MENÚ PRINCIPAL ===== -->
<div id="ia-view-main" class="ia-view">
  <p class="ia-subtitle">¿En qué te puedo ayudar hoy?</p>
  <div class="ia-main-grid">
    <button class="ia-main-card" data-view="procesos">
      <span class="ia-card-icon">⚙️</span>
      <span class="ia-card-label">Procesos</span>
      <span class="ia-card-desc">Consultas sobre operaciones del POS</span>
    </button>
    <button class="ia-main-card" data-view="errores">
      <span class="ia-card-icon">🔧</span>
      <span class="ia-card-label">Errores de Caja</span>
      <span class="ia-card-desc">Captura y diagnóstico de errores</span>
    </button>
    <button class="ia-main-card" data-view="soluciones">
      <span class="ia-card-icon">🛠️</span>
      <span class="ia-card-label">Soluciones</span>
      <span class="ia-card-desc">Refrescar o cerrar el navegador</span>
    </button>
    <button class="ia-main-card" data-view="fondos">
      <span class="ia-card-icon">💰</span>
      <span class="ia-card-label">Fondos</span>
      <span class="ia-card-desc">Registro de recepción y entrega</span>
    </button>
    <button class="ia-main-card" data-view="arqueo">
      <span class="ia-card-icon">🔍</span>
      <span class="ia-card-label">Auditoria</span>
      <span class="ia-card-desc"></span>
    </button>
    <button class="ia-main-card" data-view="beyou">
      <span class="ia-card-icon"><img id="ia-beyou-logo-card" src="${chrome.runtime.getURL("be_you.png")}" style="width:44px;height:44px;border-radius:10px;object-fit:contain;display:block;" onerror="this.style.display='none'"></span>
      <span class="ia-card-label" id="ia-beyou-label-card">BE YOU</span>
      <span class="ia-card-desc">Consultar cliente</span>
    </button>
  </div>
</div>

<!-- ===== VISTA: ARQUEO SORPRESIVO ===== -->
<div id="ia-view-arqueo" class="ia-view ia-hidden">

  <!-- PASO 1: Datos del arqueo -->
  <div id="ia-arqueo-paso-datos" class="ia-arqueo-paso">
    <p class="ia-subtitle">Datos del arqueo</p>
    <div class="ia-arqueo-campo">
      <label>Fecha</label>
      <input type="date" id="ia-arqueo-fecha" class="ia-arqueo-input">
    </div>
    <div class="ia-arqueo-campo">
      <label>N° de Caja</label>
      <input type="text" id="ia-arqueo-caja" class="ia-arqueo-input" placeholder="Ej: N002">
    </div>

    <div class="ia-arqueo-campo">
      <label>ID Auditor</label>
      <input type="text" id="ia-arqueo-auditor" class="ia-arqueo-input" placeholder="Escanea carnet o escribe ID">
    </div>
    <div class="ia-arqueo-paso-footer">
      <button id="ia-arqueo-consultar" class="ia-fondos-btn-primary">Consultar ventas →</button>
    </div>
    <div id="ia-arqueo-error" class="ia-arqueo-error ia-hidden"></div>
  </div>

  <!-- PASO 2: Conteo físico -->
  <div id="ia-arqueo-paso-conteo" class="ia-arqueo-paso ia-hidden">
    <div id="ia-arqueo-ventas-resumen" class="ia-arqueo-ventas-resumen"></div>

    <div id="ia-arqueo-vista-lista">
      <div class="ia-fondos-list">
        <div class="ia-fondos-group-label">Billetes</div>
        <div class="ia-fondos-item" data-adenom="100" data-atype="bill" data-alabel="Billetes de $100"><span class="ia-fondos-denom">Billetes de $100</span><div class="ia-fondos-item-right"><span class="ia-arqueo-val-display">—</span><span class="ia-arqueo-monto-display"></span></div></div>
        <div class="ia-fondos-item" data-adenom="50"  data-atype="bill" data-alabel="Billetes de $50"><span class="ia-fondos-denom">Billetes de $50</span><div class="ia-fondos-item-right"><span class="ia-arqueo-val-display">—</span><span class="ia-arqueo-monto-display"></span></div></div>
        <div class="ia-fondos-item" data-adenom="20"  data-atype="bill" data-alabel="Billetes de $20"><span class="ia-fondos-denom">Billetes de $20</span><div class="ia-fondos-item-right"><span class="ia-arqueo-val-display">—</span><span class="ia-arqueo-monto-display"></span></div></div>
        <div class="ia-fondos-item" data-adenom="10"  data-atype="bill" data-alabel="Billetes de $10"><span class="ia-fondos-denom">Billetes de $10</span><div class="ia-fondos-item-right"><span class="ia-arqueo-val-display">—</span><span class="ia-arqueo-monto-display"></span></div></div>
        <div class="ia-fondos-item" data-adenom="5"   data-atype="bill" data-alabel="Billetes de $5"><span class="ia-fondos-denom">Billetes de $5</span><div class="ia-fondos-item-right"><span class="ia-arqueo-val-display">—</span><span class="ia-arqueo-monto-display"></span></div></div>
        <div class="ia-fondos-item" data-adenom="1"   data-atype="bill" data-alabel="Billetes de $1"><span class="ia-fondos-denom">Billetes de $1</span><div class="ia-fondos-item-right"><span class="ia-arqueo-val-display">—</span><span class="ia-arqueo-monto-display"></span></div></div>
        <div class="ia-fondos-group-label">Monedas</div>
        <div class="ia-fondos-item" data-adenom="1"    data-atype="coin" data-alabel="Monedas de $1.00"><span class="ia-fondos-denom">Monedas de $1.00</span><div class="ia-fondos-item-right"><span class="ia-arqueo-val-display">—</span><span class="ia-arqueo-monto-display"></span></div></div>
        <div class="ia-fondos-item" data-adenom="0.50" data-atype="coin" data-alabel="Monedas de $0.50"><span class="ia-fondos-denom">Monedas de $0.50</span><div class="ia-fondos-item-right"><span class="ia-arqueo-val-display">—</span><span class="ia-arqueo-monto-display"></span></div></div>
        <div class="ia-fondos-item" data-adenom="0.25" data-atype="coin" data-alabel="Monedas de $0.25"><span class="ia-fondos-denom">Monedas de $0.25</span><div class="ia-fondos-item-right"><span class="ia-arqueo-val-display">—</span><span class="ia-arqueo-monto-display"></span></div></div>
        <div class="ia-fondos-item" data-adenom="0.10" data-atype="coin" data-alabel="Monedas de $0.10"><span class="ia-fondos-denom">Monedas de $0.10</span><div class="ia-fondos-item-right"><span class="ia-arqueo-val-display">—</span><span class="ia-arqueo-monto-display"></span></div></div>
        <div class="ia-fondos-item" data-adenom="0.05" data-atype="coin" data-alabel="Monedas de $0.05"><span class="ia-fondos-denom">Monedas de $0.05</span><div class="ia-fondos-item-right"><span class="ia-arqueo-val-display">—</span><span class="ia-arqueo-monto-display"></span></div></div>
        <div class="ia-fondos-item" data-adenom="0.01" data-atype="coin" data-alabel="Monedas de $0.01"><span class="ia-fondos-denom">Monedas de $0.01</span><div class="ia-fondos-item-right"><span class="ia-arqueo-val-display">—</span><span class="ia-arqueo-monto-display"></span></div></div>
        <div class="ia-fondos-totales">
          <div class="ia-fondos-total-row"><span>Efectivo contado</span><span id="ia-arqueo-total-contado">$0.00</span></div>
          <div class="ia-fondos-total-row"><span>Efectivo esperado</span><span id="ia-arqueo-total-esperado">$0.00</span></div>
          <div class="ia-fondos-total-row ia-fondos-total-grand"><span id="ia-arqueo-dif-label">DIFERENCIA</span><span id="ia-arqueo-diferencia">$0.00</span></div>
        </div>
      </div>
      <div class="ia-fondos-paso-footer ia-fondos-paso-footer--duo">
        <button id="ia-arqueo-volver-datos" class="ia-fondos-btn-secondary">← Volver</button>
        <button id="ia-arqueo-finalizar" class="ia-fondos-btn-primary">Guardar arqueo</button>
      </div>
    </div>

    <div id="ia-arqueo-vista-teclado" class="ia-hidden">
      <div class="ia-fondos-kbd-header">
        <div class="ia-fondos-kbd-top-row">
          <div id="ia-arqueo-kbd-label" class="ia-fondos-kbd-label"></div>
          <div id="ia-arqueo-kbd-running" class="ia-fondos-kbd-running-total">Contado: $0.00</div>
        </div>
        <div class="ia-fondos-kbd-display">
          <div id="ia-arqueo-kbd-qty" class="ia-fondos-kbd-qty">0</div>
          <div id="ia-arqueo-kbd-monto" class="ia-fondos-kbd-monto">= $0.00</div>
        </div>
      </div>
      <div class="ia-fondos-kbd-grid">
        <button class="ia-fnp-btn" data-an="1">1</button><button class="ia-fnp-btn" data-an="2">2</button><button class="ia-fnp-btn" data-an="3">3</button>
        <button class="ia-fnp-btn" data-an="4">4</button><button class="ia-fnp-btn" data-an="5">5</button><button class="ia-fnp-btn" data-an="6">6</button>
        <button class="ia-fnp-btn" data-an="7">7</button><button class="ia-fnp-btn" data-an="8">8</button><button class="ia-fnp-btn" data-an="9">9</button>
        <button class="ia-fnp-btn ia-fnp-del" data-an="del">⌫</button>
        <button class="ia-fnp-btn" data-an="0">0</button>
        <button class="ia-fnp-btn ia-fnp-ok" data-an="ok">✓</button>
      </div>
      <div class="ia-fondos-kbd-footer"><button id="ia-arqueo-kbd-volver">← Volver</button></div>
    </div>
  </div>

  <!-- ÉXITO -->
  <div id="ia-arqueo-exito" class="ia-arqueo-paso ia-hidden">
    <div id="ia-arqueo-exito-content"></div>
  </div>

</div>


<!-- ===== VISTA: PROCESOS ===== -->
<div id="ia-view-procesos" class="ia-view ia-hidden">
  <p class="ia-subtitle">Selecciona una categoría</p>
  <div class="ia-procesos-grid">
    <button class="ia-proceso-btn" data-proceso="abono">💳 Abono</button>
    <button class="ia-proceso-btn" data-proceso="club">🎖️ Club</button>
    <button class="ia-proceso-btn" data-proceso="descuento">🏷️ Descuento</button>
    <button class="ia-proceso-btn" data-proceso="metodos_pago">💰 Métodos de Pago</button>
    <button class="ia-proceso-btn" data-proceso="tarjeta_regalo">🎁 Tarjeta de Regalo</button>
    <button class="ia-proceso-btn" data-proceso="arqueo">🗂️ Arqueo</button>
    <button class="ia-proceso-btn" data-proceso="funciones_caja">🖥️ Funciones de Caja</button>
    <button class="ia-proceso-btn" data-proceso="facturacion">🧾 Facturación</button>
  </div>
</div>

<!-- ===== VISTA: PREGUNTAS DE PROCESO ===== -->
<div id="ia-view-preguntas" class="ia-view ia-hidden">
  <p class="ia-subtitle" id="ia-proceso-titulo"></p>
  <div id="ia-preguntas-lista" class="ia-preguntas-lista"></div>
</div>

<!-- ===== VISTA: ERRORES DE CAJA ===== -->
<div id="ia-view-errores" class="ia-view ia-hidden">
  <p class="ia-subtitle">Captura la pantalla con el error</p>
  <button id="ia-capturar">📸 Capturar Pantalla</button>
  <img id="ia-preview"/>
  <div id="ia-loading" class="ia-hidden">
    <div class="ia-spinner"></div>
    <span>Analizando...</span>
  </div>
  <div id="ia-respuesta"></div>
  <button id="ia-crear-ticket" class="ia-hidden">🎫 Crear Ticket</button>

<!-- Modal: Tipo de Error para Ticket -->
<div id="ia-ticket-tipo-overlay" class="ia-ticket-tipo-overlay ia-hidden">
  <div class="ia-ticket-tipo-modal">
    <div class="ia-ticket-tipo-header">Selecciona el tipo de error</div>
    <div class="ia-ticket-tipo-opciones">
      <button class="ia-ticket-tipo-btn" data-asunto="Error en Forma de Pago">💳 Error en Forma de Pago</button>
      <button class="ia-ticket-tipo-btn" data-asunto="Error con Club">🎖️ Error con Club</button>
      <button class="ia-ticket-tipo-btn" data-asunto="Error con Abono">💰 Error con Abono</button>
      <button class="ia-ticket-tipo-btn" data-asunto="Error al Abrir Cajon">💵 Error al Abrir Cajon</button>
      <button class="ia-ticket-tipo-btn" data-asunto="Error con el Cliente">👤 Error con el Cliente</button>
      <button class="ia-ticket-tipo-btn" data-asunto="Duplicidad con UPC">🔁 Duplicidad con UPC</button>
    </div>
    <button id="ia-ticket-tipo-cerrar" class="ia-ticket-tipo-cerrar-btn">✕ Cancelar</button>
  </div>
</div>
</div>

<!-- ===== VISTA: SERVICE DESK ===== -->
<div id="ia-view-servicedesk" class="ia-view ia-hidden">
  <div id="ia-sd-info" class="ia-sd-info ia-hidden">
    <div class="ia-sd-caja-row">
      <span class="ia-sd-caja-label">Caja detectada:</span>
      <span id="ia-sd-caja-valor" class="ia-sd-caja-valor">—</span>
    </div>
  </div>
  <p class="ia-subtitle" style="margin-top:4px">Selecciona la subcategoría</p>
  <div class="ia-sd-subcat-grid">
    <button class="ia-sd-subcat-btn" data-subcat="Abonos">💳 Abonos</button>
    <button class="ia-sd-subcat-btn" data-subcat="Métodos de Pago">💰 Métodos de Pago</button>
    <button class="ia-sd-subcat-btn" data-subcat="Promociones">🏷️ Promociones</button>
  </div>
  <button id="ia-sd-capturar" class="ia-hidden">📸 Capturar Pantalla</button>
  <img id="ia-sd-preview"/>
  <div class="ia-sd-desc-wrap">
    <div id="ia-sd-descripcion-display" class="ia-sd-desc-display" id="ia-sd-desc-placeholder">Describe el problema (toca para escribir)...</div>
    <input type="hidden" id="ia-sd-descripcion" value=""/>
  </div>
  <div id="ia-sd-keyboard" class="ia-sd-keyboard ia-hidden">
    <div class="ia-kbd-display">
      <span id="ia-kbd-text"></span><span class="ia-kbd-cursor">|</span>
    </div>
    <div class="ia-kbd-rows">
      <div class="ia-kbd-row">
        <button class="ia-kbd-key" data-char="q">Q</button><button class="ia-kbd-key" data-char="w">W</button><button class="ia-kbd-key" data-char="e">E</button><button class="ia-kbd-key" data-char="r">R</button><button class="ia-kbd-key" data-char="t">T</button><button class="ia-kbd-key" data-char="y">Y</button><button class="ia-kbd-key" data-char="u">U</button><button class="ia-kbd-key" data-char="i">I</button><button class="ia-kbd-key" data-char="o">O</button><button class="ia-kbd-key" data-char="p">P</button>
      </div>
      <div class="ia-kbd-row">
        <button class="ia-kbd-key" data-char="a">A</button><button class="ia-kbd-key" data-char="s">S</button><button class="ia-kbd-key" data-char="d">D</button><button class="ia-kbd-key" data-char="f">F</button><button class="ia-kbd-key" data-char="g">G</button><button class="ia-kbd-key" data-char="h">H</button><button class="ia-kbd-key" data-char="j">J</button><button class="ia-kbd-key" data-char="k">K</button><button class="ia-kbd-key" data-char="l">L</button><button class="ia-kbd-key ia-kbd-key--special" data-action="backspace">⌫</button>
      </div>
      <div class="ia-kbd-row">
        <button class="ia-kbd-key" data-char="z">Z</button><button class="ia-kbd-key" data-char="x">X</button><button class="ia-kbd-key" data-char="c">C</button><button class="ia-kbd-key" data-char="v">V</button><button class="ia-kbd-key" data-char="b">B</button><button class="ia-kbd-key" data-char="n">N</button><button class="ia-kbd-key" data-char="m">M</button><button class="ia-kbd-key" data-char=",">,</button><button class="ia-kbd-key" data-char=".">.</button><button class="ia-kbd-key ia-kbd-key--special" data-action="shift">⇧</button>
      </div>
      <div class="ia-kbd-row">
        <button class="ia-kbd-key ia-kbd-key--num" data-char="1">1</button><button class="ia-kbd-key ia-kbd-key--num" data-char="2">2</button><button class="ia-kbd-key ia-kbd-key--num" data-char="3">3</button><button class="ia-kbd-key ia-kbd-key--num" data-char="4">4</button><button class="ia-kbd-key ia-kbd-key--num" data-char="5">5</button><button class="ia-kbd-key ia-kbd-key--num" data-char="6">6</button><button class="ia-kbd-key ia-kbd-key--num" data-char="7">7</button><button class="ia-kbd-key ia-kbd-key--num" data-char="8">8</button><button class="ia-kbd-key ia-kbd-key--num" data-char="9">9</button><button class="ia-kbd-key ia-kbd-key--num" data-char="0">0</button>
      </div>
      <div class="ia-kbd-row">
        <button class="ia-kbd-key ia-kbd-key--space" data-char=" ">ESPACIO</button>
        <button class="ia-kbd-key ia-kbd-key--special" data-action="clear">🗑</button>
        <button class="ia-kbd-key ia-kbd-key--done" data-action="done">✓ Listo</button>
      </div>
    </div>
  </div>
  <button id="ia-sd-enviar" class="ia-hidden">🎫 Enviar a Service Desk</button>
  <div id="ia-sd-loading" class="ia-hidden">
    <div class="ia-spinner"></div>
    <span>Creando ticket...</span>
  </div>
  <div id="ia-sd-respuesta"></div>
</div>

<!-- ===== VISTA: RESPUESTA DE PROCESO ===== -->
<div id="ia-view-respuesta-proceso" class="ia-view ia-hidden">
  <div id="ia-loading-proceso" class="ia-hidden">
    <div class="ia-spinner"></div>
    <span>Consultando...</span>
  </div>
  <div id="ia-respuesta-proceso"></div>
</div>




<!-- ===== VISTA: FONDOS LIMPIOS ===== -->
<div id="ia-view-fondos" class="ia-view ia-hidden">
  <p class="ia-subtitle">Selecciona una opción</p>
  <div class="ia-fondos-menu">
    <button class="ia-fondos-menu-btn ia-fondos-menu-btn--in" id="ia-btn-recepcion">
      <span class="ia-fondos-menu-icon">📥</span>
      <span class="ia-fondos-menu-label">Recepción de Fondos Limpios</span>
      <span class="ia-fondos-menu-desc">Registrar fondos recibidos</span>
    </button>
    <button class="ia-fondos-menu-btn ia-fondos-menu-btn--out" id="ia-btn-entrega">
      <span class="ia-fondos-menu-icon">📤</span>
      <span class="ia-fondos-menu-label">Entrega de Fondos Limpios</span>
      <span class="ia-fondos-menu-desc">Registrar fondos entregados</span>
    </button>
  </div>
</div>

<!-- ===== VISTA: SOLUCIONES ===== -->
<div id="ia-view-soluciones" class="ia-view ia-hidden">
  <p class="ia-subtitle">Selecciona una opción</p>
  <div class="ia-fondos-menu">
    <button class="ia-fondos-menu-btn ia-fondos-menu-btn--in" id="ia-btn-refrescar">
      <span class="ia-fondos-menu-icon">🔄</span>
      <span class="ia-fondos-menu-label">Refrescar pantallas</span>
      <span class="ia-fondos-menu-desc">Recarga la pantalla de la cajera y la del cliente</span>
    </button>
    <button class="ia-fondos-menu-btn ia-fondos-menu-btn--out" id="ia-btn-cerrar-navegador">
      <span class="ia-fondos-menu-icon">⛔</span>
      <span class="ia-fondos-menu-label">Cerrar navegador</span>
      <span class="ia-fondos-menu-desc">Cierra todas las ventanas de Chrome</span>
    </button>
  </div>
</div>

<!-- ===== VISTA: BE YOU (lealtad) ===== -->
<div id="ia-view-beyou" class="ia-view ia-hidden">
  <div style="display:flex; align-items:center; gap:10px; padding:0 4px 10px;">
    <img id="ia-beyou-logo-vista" src="${chrome.runtime.getURL("be_you.png")}" style="width:58px;height:58px;border-radius:13px;object-fit:contain;flex-shrink:0;" onerror="this.style.display='none'">
    <div>
      <div style="font-weight:700; font-size:15px; color:#1a2744;">Consulta de cliente</div>
      <div style="font-size:12px; color:#6b7280;">Cédula, pasaporte, correo o teléfono</div>
    </div>
  </div>

  <div style="padding:0 4px;">
    <label class="ia-arqueo-label" for="ia-beyou-input">Dato del cliente</label>
    <input id="ia-beyou-input" class="ia-by-campo" type="text" readonly
           placeholder="Toca aquí para escribir">
  </div>

  <!-- Teclado en pantalla: se abre al tocar el campo -->
  <div id="ia-beyou-teclado" class="ia-by-keyboard ia-hidden">
    <div class="ia-by-kbd-row">
      <button class="ia-by-kbd-key" data-char="q">Q</button><button class="ia-by-kbd-key" data-char="w">W</button><button class="ia-by-kbd-key" data-char="e">E</button><button class="ia-by-kbd-key" data-char="r">R</button><button class="ia-by-kbd-key" data-char="t">T</button><button class="ia-by-kbd-key" data-char="y">Y</button><button class="ia-by-kbd-key" data-char="u">U</button><button class="ia-by-kbd-key" data-char="i">I</button><button class="ia-by-kbd-key" data-char="o">O</button><button class="ia-by-kbd-key" data-char="p">P</button>
    </div>
    <div class="ia-by-kbd-row">
      <button class="ia-by-kbd-key" data-char="a">A</button><button class="ia-by-kbd-key" data-char="s">S</button><button class="ia-by-kbd-key" data-char="d">D</button><button class="ia-by-kbd-key" data-char="f">F</button><button class="ia-by-kbd-key" data-char="g">G</button><button class="ia-by-kbd-key" data-char="h">H</button><button class="ia-by-kbd-key" data-char="j">J</button><button class="ia-by-kbd-key" data-char="k">K</button><button class="ia-by-kbd-key" data-char="l">L</button><button class="ia-by-kbd-key ia-by-kbd-key--aux" data-accion="borrar">⌫</button>
    </div>
    <div class="ia-by-kbd-row">
      <button class="ia-by-kbd-key" data-char="z">Z</button><button class="ia-by-kbd-key" data-char="x">X</button><button class="ia-by-kbd-key" data-char="c">C</button><button class="ia-by-kbd-key" data-char="v">V</button><button class="ia-by-kbd-key" data-char="b">B</button><button class="ia-by-kbd-key" data-char="n">N</button><button class="ia-by-kbd-key" data-char="m">M</button><button class="ia-by-kbd-key" data-char="@">@</button><button class="ia-by-kbd-key" data-char=".">.</button><button class="ia-by-kbd-key" data-char="-">-</button>
    </div>
    <div class="ia-by-kbd-row">
      <button class="ia-by-kbd-key" data-char="1">1</button><button class="ia-by-kbd-key" data-char="2">2</button><button class="ia-by-kbd-key" data-char="3">3</button><button class="ia-by-kbd-key" data-char="4">4</button><button class="ia-by-kbd-key" data-char="5">5</button><button class="ia-by-kbd-key" data-char="6">6</button><button class="ia-by-kbd-key" data-char="7">7</button><button class="ia-by-kbd-key" data-char="8">8</button><button class="ia-by-kbd-key" data-char="9">9</button><button class="ia-by-kbd-key" data-char="0">0</button>
    </div>
    <div class="ia-by-kbd-row">
      <button class="ia-by-kbd-key ia-by-kbd-key--aux" data-accion="mayus">⇧</button>
      <button class="ia-by-kbd-key" data-char="_">_</button>
      <button class="ia-by-kbd-key ia-by-kbd-key--aux" data-accion="limpiar">🗑</button>
      <button class="ia-by-kbd-key ia-by-kbd-key--ok" data-accion="listo">✓ Consultar</button>
    </div>
  </div>

  <div style="padding:10px 4px 0;">
    <button id="ia-beyou-buscar" class="ia-fondos-btn-primary" style="width:100%;">
      Consultar cliente →
    </button>
  </div>

  <div id="ia-beyou-estado" style="padding:12px 8px; font-size:13px; color:#6b7280;"></div>
  <div id="ia-beyou-resultado" style="padding:0 4px;"></div>
</div>

<!-- ===== MODAL: FONDOS LIMPIOS ===== -->
<div id="ia-fondos-overlay" class="ia-fondos-overlay ia-hidden">
  <div class="ia-fondos-modal">
    <div class="ia-fondos-header">
      <button id="ia-fondos-cerrar" class="ia-fondos-cerrar">✕</button>
      <div class="ia-fondos-title"><span id="ia-fondos-title-txt">Recepción de Fondos</span></div>
      <div id="ia-fondos-steps" class="ia-fondos-steps"></div>
    </div>

    <!-- PASO: ESCANEO SOBRE -->
    <div id="ia-fondos-paso-sobre" class="ia-fondos-paso">
      <div class="ia-fondos-scan-box">
        <div class="ia-fondos-scan-icon">📷</div>
        <div class="ia-fondos-scan-title">Escanea el código del sobre</div>
        <div class="ia-fondos-scan-sub">Apunta el lector al código QR del sobre</div>
        <input id="ia-fondos-scan-sobre" class="ia-fondos-scan-input" type="text" placeholder="Esperando escaneo..." autocomplete="off">
      </div>
      <div id="ia-fondos-sobre-info" class="ia-fondos-info-card ia-hidden"></div>
      <div class="ia-fondos-paso-footer ia-fondos-paso-footer--duo">
        <button id="ia-fondos-sobre-reescanear" class="ia-fondos-btn-secondary ia-hidden">🔄 Escanear de nuevo</button>
        <button id="ia-fondos-sobre-continuar" class="ia-fondos-btn-primary" disabled>Continuar →</button>
      </div>
    </div>

    <!-- PASO: DENOMINACIONES -->
    <div id="ia-fondos-paso-denom" class="ia-fondos-paso ia-hidden">
      <div id="ia-fondos-vista-lista">
        <div class="ia-fondos-list">
          <div class="ia-fondos-group-label">Monedas</div>
          <div class="ia-fondos-item" data-denom="0.01" data-type="coin" data-label="Monedas de $0.01"><span class="ia-fondos-denom">Monedas de $0.01</span><div class="ia-fondos-item-right"><span class="ia-fondos-val-display">—</span><span class="ia-fondos-monto-display"></span></div></div>
          <div class="ia-fondos-item" data-denom="0.05" data-type="coin" data-label="Monedas de $0.05"><span class="ia-fondos-denom">Monedas de $0.05</span><div class="ia-fondos-item-right"><span class="ia-fondos-val-display">—</span><span class="ia-fondos-monto-display"></span></div></div>
          <div class="ia-fondos-item" data-denom="0.10" data-type="coin" data-label="Monedas de $0.10"><span class="ia-fondos-denom">Monedas de $0.10</span><div class="ia-fondos-item-right"><span class="ia-fondos-val-display">—</span><span class="ia-fondos-monto-display"></span></div></div>
          <div class="ia-fondos-item" data-denom="0.25" data-type="coin" data-label="Monedas de $0.25"><span class="ia-fondos-denom">Monedas de $0.25</span><div class="ia-fondos-item-right"><span class="ia-fondos-val-display">—</span><span class="ia-fondos-monto-display"></span></div></div>
          <div class="ia-fondos-item" data-denom="0.50" data-type="coin" data-label="Monedas de $0.50"><span class="ia-fondos-denom">Monedas de $0.50</span><div class="ia-fondos-item-right"><span class="ia-fondos-val-display">—</span><span class="ia-fondos-monto-display"></span></div></div>
          <div class="ia-fondos-item" data-denom="1"    data-type="coin" data-label="Monedas de $1.00"><span class="ia-fondos-denom">Monedas de $1.00</span><div class="ia-fondos-item-right"><span class="ia-fondos-val-display">—</span><span class="ia-fondos-monto-display"></span></div></div>
          <div class="ia-fondos-group-label">Billetes</div>
          <div class="ia-fondos-item" data-denom="1"   data-type="bill" data-label="Billetes de $1"><span class="ia-fondos-denom">Billetes de $1</span><div class="ia-fondos-item-right"><span class="ia-fondos-val-display">—</span><span class="ia-fondos-monto-display"></span></div></div>
          <div class="ia-fondos-item" data-denom="5"   data-type="bill" data-label="Billetes de $5"><span class="ia-fondos-denom">Billetes de $5</span><div class="ia-fondos-item-right"><span class="ia-fondos-val-display">—</span><span class="ia-fondos-monto-display"></span></div></div>
          <div class="ia-fondos-item" data-denom="10"  data-type="bill" data-label="Billetes de $10"><span class="ia-fondos-denom">Billetes de $10</span><div class="ia-fondos-item-right"><span class="ia-fondos-val-display">—</span><span class="ia-fondos-monto-display"></span></div></div>
          <div class="ia-fondos-item" data-denom="20"  data-type="bill" data-label="Billetes de $20"><span class="ia-fondos-denom">Billetes de $20</span><div class="ia-fondos-item-right"><span class="ia-fondos-val-display">—</span><span class="ia-fondos-monto-display"></span></div></div>

          <div class="ia-fondos-totales">
            <div class="ia-fondos-total-row"><span>Total Billetes</span><span id="ia-fondos-total-bills">$0.00</span></div>
            <div class="ia-fondos-total-row"><span>Total Monedas</span><span id="ia-fondos-total-coins">$0.00</span></div>
            <div class="ia-fondos-total-row ia-fondos-total-grand"><span>TOTAL</span><span id="ia-fondos-total-grand">$0.00</span></div>
          </div>
          <div id="ia-fondos-limite-alerta" class="ia-fondos-limite-alerta ia-hidden">⚠️ El monto no puede exceder $100.00</div>
        </div>
        <div class="ia-fondos-paso-footer">
          <button id="ia-fondos-denom-completado" class="ia-fondos-btn-primary">Completado →</button>
        </div>
      </div>
      <div id="ia-fondos-vista-teclado" class="ia-hidden">
        <div class="ia-fondos-kbd-header">
          <div class="ia-fondos-kbd-top-row">
            <div id="ia-fondos-kbd-label" class="ia-fondos-kbd-label"></div>
            <div id="ia-fondos-kbd-running-total" class="ia-fondos-kbd-running-total">Total: $0.00</div>
          </div>
          <div class="ia-fondos-kbd-display">
            <div id="ia-fondos-kbd-qty" class="ia-fondos-kbd-qty">0</div>
            <div id="ia-fondos-kbd-monto" class="ia-fondos-kbd-monto">= $0.00</div>
          </div>
        </div>
        <div class="ia-fondos-kbd-grid">
          <button class="ia-fnp-btn" data-n="1">1</button><button class="ia-fnp-btn" data-n="2">2</button><button class="ia-fnp-btn" data-n="3">3</button>
          <button class="ia-fnp-btn" data-n="4">4</button><button class="ia-fnp-btn" data-n="5">5</button><button class="ia-fnp-btn" data-n="6">6</button>
          <button class="ia-fnp-btn" data-n="7">7</button><button class="ia-fnp-btn" data-n="8">8</button><button class="ia-fnp-btn" data-n="9">9</button>
          <button class="ia-fnp-btn ia-fnp-del" data-n="del">⌫</button>
          <button class="ia-fnp-btn" data-n="0">0</button>
          <button class="ia-fnp-btn ia-fnp-ok" data-n="ok">✓</button>
        </div>
        <div class="ia-fondos-kbd-footer"><button id="ia-fondos-kbd-volver">← Volver</button></div>
      </div>
    </div>

    <!-- PASO: ESCANEO CARNET SUPERVISORA (solo entrega) -->
    <div id="ia-fondos-paso-carnet" class="ia-fondos-paso ia-hidden">
      <div class="ia-fondos-scan-box">
        <div class="ia-fondos-scan-icon">🪪</div>
        <div class="ia-fondos-scan-title">Escanea el carnet de la supervisora</div>
        <div class="ia-fondos-scan-sub">La supervisora que recibe el fondo</div>
        <input id="ia-fondos-scan-carnet" class="ia-fondos-scan-input" type="text" placeholder="Esperando escaneo..." autocomplete="off">
      </div>
      <div id="ia-fondos-carnet-info" class="ia-fondos-info-card ia-hidden"></div>
      <div class="ia-fondos-paso-footer ia-fondos-paso-footer--duo">
        <button id="ia-fondos-carnet-volver" class="ia-fondos-btn-secondary">← Volver</button>
        <button id="ia-fondos-carnet-continuar" class="ia-fondos-btn-primary" disabled>Continuar →</button>
      </div>
    </div>

    <!-- PASO: DECLARACIÓN -->
    <div id="ia-fondos-paso-declaracion" class="ia-fondos-paso ia-hidden">
      <div class="ia-fondos-declaracion">
        <div id="ia-fondos-resumen" class="ia-fondos-resumen ia-hidden"></div>
        <div class="ia-fondos-declaracion-title">Declaración de responsabilidad</div>
        <div id="ia-fondos-declaracion-texto" class="ia-fondos-declaracion-texto"></div>
        <label class="ia-fondos-check">
          <input type="checkbox" id="ia-fondos-declaracion-check">
          <span>Confirmo y acepto la declaración</span>
        </label>
      </div>
      <div class="ia-fondos-paso-footer ia-fondos-paso-footer--duo">
          <button id="ia-fondos-volver-denom" class="ia-fondos-btn-secondary">← Volver</button>
          <button id="ia-fondos-finalizar" class="ia-fondos-btn-primary" disabled>Finalizar registro</button>
        </div>
    </div>

    <!-- ÉXITO -->
    <div id="ia-fondos-exito" class="ia-fondos-paso ia-hidden">
      <div id="ia-fondos-exito-content"></div>
    </div>

  </div>
</div>
`;

document.body.appendChild(panel);

// ── Mostrar el boton SOLO en la pantalla principal (Monitor 1 = cajera) ──
// Se reevalua de forma continua: si la ventana se mueve de monitor
// (o el sidecar se tilda en la pantalla de la cajera), el boton
// aparece/desaparece dinamicamente. Metodo: posicion de la ventana
// en el escritorio virtual (screenX / availLeft / availWidth).
function verificarPantalla() {
  var enPrimaria;
  try {
    var sx = window.screenX;
    var al = screen.availLeft || 0;
    var aw = screen.availWidth || screen.width;
    if (al !== 0) {
      // availLeft != 0 -> la ventana esta en un monitor secundario
      enPrimaria = false;
    } else {
      // availLeft == 0 -> primaria, pero confirmar por screenX
      enPrimaria = (sx < aw);
    }
    // Diagnostico accesible desde consola: window.__tiaPantallaDiag
    window.__tiaPantallaDiag = { sx: sx, availLeft: al, availWidth: aw, enPrimaria: enPrimaria };
  } catch (e) {
    // Si algo falla, por seguridad mostramos el boton (mejor que la
    // cajera pueda recuperarse a que no).
    enPrimaria = true;
    window.__tiaPantallaDiag = { error: String(e), enPrimaria: true };
  }

  if (enPrimaria) {
    button.style.setProperty("display", "flex", "important");
  } else {
    button.style.setProperty("display", "none", "important");
    try { if (panel.classList.contains("open")) panel.classList.remove("open"); } catch (e) {}
  }
}
verificarPantalla();
window.addEventListener("resize", verificarPantalla);
window.addEventListener("focus", verificarPantalla);
window.addEventListener("mousemove", verificarPantalla);
setInterval(verificarPantalla, 1500);

// ── Estado ─────────────────────────────────────────────────────
let screenshotBase64 = null;
let viewHistory = [];

// ── Preguntas por proceso ──────────────────────────────────────
const PREGUNTAS = {
  abono: {
    titulo: "💳 Abono",
    preguntas: [
      "Anulacion de Abono",
      "Consulta de Abono",
      "Creacion de Abono",
      "Devolucion de Pago de Abono",
      "Retiro de Abono",
      "Extension de Abono",
      "Pago de Abono",
      "Sacado a la Venta",
    ]
  },
  club: {
    titulo: "🎖️ Club",
    preguntas: [
      "Consulta de Club",
      "Creacion de Club",
      "Devolucion de Contrato / Pagos de Club",
      "Devolucion de Pagos de Club Premiado con Semanas Adelantadas",
      "Devolucion a retiro de Club",
      "Pago de Club",
      "Premiacion de Club",
      "Retiro de Club",
    ]
  },
  descuento: {
    titulo: "🏷️ Descuento",
    preguntas: [
      "Descuento de Asociado",
      "Descuento General",
      "Descuento Personalizado - Empresa",
    ]
  },
  metodos_pago: {
    titulo: "💰 Métodos de Pago",
    preguntas: [
      "Cupon de Bienvenida Banesco",
      "Cupon de BE YOU",
      "Cobro con Efectivo / Donacion",
      "Cobro con Mastercard Steven’s",
      "Cobro con Pos Inalambrico",
      "Cobro con Pos Integrado",
      "Ecommerce Venta en Linea",
      "Pago Crediviva",
      "Pago Tafi",
      "Pago YAPPY",
      "Pago Pluxee Digital QR",
      "Pago Pluxee Papel",
      "Pago Loteria",
      "Pago MC Stevens Contactless Wallet",
      
    ]
  },
  tarjeta_regalo: {
    titulo: "🎁 Tarjeta de Regalo",
    preguntas: [
      "Consulta de Tarjeta de Regalo",
      "Creacion de Tarjeta de Regalo",
      "Devolucion de Tarjeta de Regalo",
      "Retiro de Tarjeta de regalo",
    ]
  },
  arqueo: {
    titulo: "🗂️ Arqueo",
    preguntas: [
      "Arqueo",
      "Consolidado",
    ]
  },
  funciones_caja: {
    titulo: "🖥️ Funciones de Caja",
    preguntas: [
      "Anulaciones Basicas",
      "Apertura de Gaveta de Dinero",
      "Cambio de Precio",
      "Cerrar y Abrir Sesion / Bloquear Sistema",
      "Cierre de Caja",
      "Consulta de Recibo",
      "Creacion / Edicion de Cliene",
      "Ingreso de Codigo Manualmente",
      "Reimprecion de Factura Regalo",
    ]
  },
  facturacion: {
    titulo: "🧾 Facturación",
    preguntas: [
      "Exoneracion de Impuestos",
      "Mercancia de Cosmeticos",
      "Mercancia Olvidada por Clientes",
      "Servicio de Acarreo y Armado (SUM)",
      "Ticket Paquetera Perdido",
      "Cobro Sum Abono",
      "Cobro Sum Venta",
      "Cobro Sastreria",
      "Cobro de SisOtros OTV",
      "Cobro de SisOtros OTT",
      "Cobro de Pedidos TBK",
      "Cupones Promocionales",
      "Canje de Cupon Promocional Porcentaje",
      "Canje de Cupon Promocional Monto Fijo",
    ]
  }
};


// ── Navegación de vistas ───────────────────────────────────────
function showView(viewId, pushHistory = true) {
  document.querySelectorAll(".ia-view").forEach(v => v.classList.add("ia-hidden"));
  document.getElementById(viewId).classList.remove("ia-hidden");

  const backBtn = document.getElementById("ia-back");
  if (pushHistory && viewHistory.length > 0) {
    backBtn.classList.remove("ia-hidden");
  } else {
    backBtn.classList.add("ia-hidden");
  }

  if (pushHistory) viewHistory.push(viewId);
}

function goBack() {
  if (viewHistory.length <= 1) return;
  viewHistory.pop();
  const prev = viewHistory[viewHistory.length - 1];
  showView(prev, false);
  if (viewHistory.length <= 1) {
    document.getElementById("ia-back").classList.add("ia-hidden");
  }
}

// ── Abrir/cerrar panel ─────────────────────────────────────────
button.addEventListener("click", (e) => {
  e.stopPropagation();
  panel.classList.toggle("open");
  if (panel.classList.contains("open") && viewHistory.length === 0) {
    viewHistory = ["ia-view-main"];
    showView("ia-view-main", false);
  }
}, true);

// ── Botón Volver ───────────────────────────────────────────────
document.getElementById("ia-back").addEventListener("click", (e) => {
  e.stopPropagation();
  goBack();
}, true);

// ── Función reset completo ─────────────────────────────────────
function resetPanel() {
  viewHistory = [];
  screenshotBase64 = null;
  limpiarErrores();
  limpiarRespuestaProceso();
  limpiarServiceDesk();
  // Limpiar preguntas y título de proceso
  const lista = document.getElementById("ia-preguntas-lista");
  if (lista) lista.innerHTML = "";
  const titulo = document.getElementById("ia-proceso-titulo");
  if (titulo) titulo.textContent = "";
  // Volver al menú principal sin historial
  document.querySelectorAll(".ia-view").forEach(v => v.classList.add("ia-hidden"));
  document.getElementById("ia-view-main").classList.remove("ia-hidden");
  document.getElementById("ia-back").classList.add("ia-hidden");
}

// ── Botón Cerrar ───────────────────────────────────────────────
document.getElementById("ia-close").addEventListener("click", (e) => {
  e.stopPropagation();
  panel.classList.remove("open");
  setTimeout(() => resetPanel(), 320);
}, true);

// ── Cerrar navegador (cierra todos los Chrome) ─────────────────
// ── Cerrar al hacer clic fuera ─────────────────────────────────
document.addEventListener("click", (e) => {
  if (
    panel.classList.contains("open") &&
    !panel.contains(e.target) &&
    e.target !== button
  ) {
    panel.classList.remove("open");
    setTimeout(() => resetPanel(), 320);
  }
}, true);

// ── Menú principal: botones ────────────────────────────────────
document.querySelectorAll(".ia-main-card").forEach(card => {
  card.addEventListener("click", (e) => {
    e.stopPropagation();
    const view = card.dataset.view;
    if (view === "procesos") {
      showView("ia-view-procesos");
    } else if (view === "errores") {
      limpiarErrores();
      showView("ia-view-errores");
    } else if (view === "servicedesk") {
      limpiarServiceDesk();
      detectarCaja();
      showView("ia-view-servicedesk");
    } else if (view === "fondos") {
      showView("ia-view-fondos");
    } else if (view === "soluciones") {
      showView("ia-view-soluciones");
    } else if (view === "arqueo") {
      if (arqueoIniciar() === false) return;
      showView("ia-view-arqueo");
    } else if (view === "beyou") {
      beyouLimpiar();
      showView("ia-view-beyou");
    }
  }, true);
});

// ══════════════════════════════════════════
// BE YOU / CAMPEON PASS - Consulta de lealtad
// Consume la API de Clau.io a traves del background (el apikey vive en
// config.json y no entra al contexto de la pagina).
// Muestra SOLO los campos autorizados por el SOW:
// Nombres, Apellidos, Cedula/Pasaporte, Telefono, Correo, Nivel.
// ══════════════════════════════════════════
// ══════════════════════════════════════════
// MARCA DEL PROGRAMA DE LEALTAD SEGUN LA CADENA
// Una sola extension sirve a Stevens, Campeon y Madison: el logo y el
// nombre se toman del config.json de cada caja, no del codigo.
// Se puede forzar con beyou.etiqueta y beyou.logo si hiciera falta.
// ══════════════════════════════════════════
// Cada marca define su logo, su nombre, el degradado de la ficha y el
// orden de los campos. El degradado sale de los colores del propio logo:
// Be You es violeta/turquesa y Campeon Pass naranja (#FE6301).
var MARCAS_LEALTAD = {
  stevens: {
    etiqueta: "BE YOU",
    logo: "be_you.png",
    gradiente: "linear-gradient(135deg,#3b2a72 0%,#18b6b9 100%)",
    correoPrimero: false
  },
  campeon: {
    etiqueta: "CAMPEÓN PASS",
    logo: "campeon_pass.png",
    gradiente: "linear-gradient(135deg,#B64700 0%,#FE6301 60%,#FF8A2B 100%)",
    correoPrimero: true
  },
  madison: {
    etiqueta: "BE YOU",
    logo: "be_you.png",
    gradiente: "linear-gradient(135deg,#3b2a72 0%,#18b6b9 100%)",
    correoPrimero: false
  }
};

// Marca activa en esta caja. La define beyouAplicarMarca() al arrancar.
var beyouMarca = MARCAS_LEALTAD.stevens;

async function beyouAplicarMarca() {
  try {
    var resp = await fetch(chrome.runtime.getURL("config.json"), { cache: "no-store" });
    var cfg = await resp.json();
    var by = cfg.beyou || {};

    // La cadena puede venir como "campeon", "campeon1", "campeon2"...
    var cadena = String(cfg.cadena || "").toLowerCase();
    var clave = Object.keys(MARCAS_LEALTAD).find(function (k) {
      return cadena.indexOf(k) === 0;
    });
    var marca = MARCAS_LEALTAD[clave] || MARCAS_LEALTAD.stevens;
    beyouMarca = marca;

    // El config puede sobreescribir la etiqueta y el logo
    var etiqueta = by.etiqueta || marca.etiqueta;
    var logo = by.logo || marca.logo;

    var url = chrome.runtime.getURL(logo);
    var l1 = document.getElementById("ia-beyou-logo-card");
    var l2 = document.getElementById("ia-beyou-logo-vista");
    var t1 = document.getElementById("ia-beyou-label-card");
    if (l1) l1.src = url;
    if (l2) l2.src = url;
    if (t1) t1.textContent = etiqueta;

    // Ocultar la tarjeta si la cadena no tiene el modulo activo
    if (by.activo === false) {
      var card = document.querySelector('.ia-main-card[data-view="beyou"]');
      if (card) card.style.display = "none";
    }

    console.log("[TIA BeYou] marca aplicada:", etiqueta, "(cadena:", cadena || "sin definir", ")");
  } catch (e) {
    console.log("[TIA BeYou] no pude aplicar la marca:", e.message);
  }
}
beyouAplicarMarca();

// ══════════════════════════════════════════
// PUBLICACION A LA PANTALLA DEL CLIENTE (pantalla 2)
// La pantalla 1 deja el resultado en chrome.storage y la pantalla 2 lo
// escucha con storage.onChanged. Se usa storage y no postMessage porque
// son dos pestanas distintas (localhost:9999 y localhost:8000).
// Solo se publican los campos autorizados por el SOW.
// ══════════════════════════════════════════
var P2_KEY = "lealtad_p2";
var P2_ACTIVA = true;              // false desactiva el envio a pantalla 2
var P2_MOSTRAR_NO_REGISTRADO = true;

function beyouFiltrarParaCliente(u) {
  if (!u) return null;
  return {
    nombre:   u.nombre   || "",
    apellido: u.apellido || "",
    numId:    u.numId    || "",
    telefono: u.telefono || "",
    email:    u.email    || "",
    nivel:    u.nivel    || null
  };
}

function beyouPublicarP2(estado, cliente) {
  if (!P2_ACTIVA) return;
  try {
    var obj = {};
    obj[P2_KEY] = { estado: estado, cliente: cliente || null, ts: Date.now() };
    chrome.storage.local.set(obj);
    console.log("[TIA BeYou] publicado a pantalla 2:", estado);
  } catch (e) {
    // Extension recargada: no debe romper la consulta
  }
}

function beyouLimpiar() {
  var est = document.getElementById("ia-beyou-estado");
  var res = document.getElementById("ia-beyou-resultado");
  var inp = document.getElementById("ia-beyou-input");
  if (est) est.textContent = "";
  if (res) res.innerHTML = "";
  if (inp) inp.value = "";
  beyouMayus = false;
  beyouTecladoVisible(false);
  beyouAplicarMayus();
  beyouPublicarP2("limpio", null);
}

function beyouEstado(html, color) {
  var est = document.getElementById("ia-beyou-estado");
  if (est) {
    est.innerHTML = html;
    est.style.color = color || "#6b7280";
  }
}

function escaparHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Decide como buscar segun lo que escribio la cajera.
// La API prioriza email > telefono > numId, y acepta varios campos a la
// vez, asi que para un valor numerico enviamos numId y telefono juntos:
// encuentra al cliente sin importar si el numero es su cedula o su celular.
// Normaliza mayusculas/minusculas: los correos en minuscula, las cedulas
// y pasaportes en mayuscula (ej. PE-123-456), asi no importa como se tecleo.
// Arma la lista de intentos de busqueda, EN ORDEN y por separado.
// No se combinan campos en una sola consulta porque la API prioriza
// telefono sobre numId: si se enviaran juntos podria buscar solo por
// telefono y nunca probar la cedula.
// Tambien se prueban variantes de formato, porque la cedula puede estar
// guardada con guiones (8-829-71) o sin ellos (882971).
function beyouVariantes(valor) {
  var v = String(valor || "").trim();
  if (!v) return [];

  // Correo: un solo intento, en minuscula
  if (v.indexOf("@") !== -1) {
    return [{ cliente: { email: v.toLowerCase() }, etiqueta: "correo " + v.toLowerCase() }];
  }

  v = v.toUpperCase();
  var limpio = v.replace(/[\s.-]/g, "");
  var intentos = [];

  // 1) Cedula tal como se escribio
  intentos.push({ cliente: { numId: v }, etiqueta: "cédula " + v });

  // 2) Cedula sin guiones ni puntos
  if (limpio !== v) {
    intentos.push({ cliente: { numId: limpio }, etiqueta: "cédula " + limpio });
  }

  // 3) Como telefono (solo si es numerico)
  if (/^\d+$/.test(limpio)) {
    intentos.push({ cliente: { telefono: limpio }, etiqueta: "teléfono " + limpio });
  }

  // 4) Como ID externo, ultimo recurso
  intentos.push({ cliente: { extId: v }, etiqueta: "ID externo " + v });

  return intentos;
}

// ── Teclado en pantalla del modulo Be You ─────────────────────
// El campo es readonly a proposito: asi al tocarlo no aparece el teclado
// de Windows y se usa siempre este, con teclas grandes para dedo.
var beyouMayus = false;

function beyouTecladoVisible(mostrar) {
  var kbd = document.getElementById("ia-beyou-teclado");
  if (!kbd) return;
  kbd.classList.toggle("ia-hidden", !mostrar);
}

function beyouAplicarMayus() {
  document.querySelectorAll("#ia-beyou-teclado .ia-by-kbd-key[data-char]").forEach(function (k) {
    var c = k.dataset.char;
    if (c && c.length === 1 && /[a-z]/i.test(c)) {
      k.dataset.char = beyouMayus ? c.toUpperCase() : c.toLowerCase();
    }
  });
  var sh = document.querySelector("#ia-beyou-teclado .ia-by-kbd-key[data-accion='mayus']");
  if (sh) sh.classList.toggle("ia-by-kbd-key--activa", beyouMayus);
}

document.getElementById("ia-beyou-input")?.addEventListener("click", function (e) {
  e.stopPropagation();
  beyouTecladoVisible(true);
}, true);

document.getElementById("ia-beyou-teclado")?.addEventListener("click", function (e) {
  e.stopPropagation();
  e.preventDefault();
  var key = e.target.closest(".ia-by-kbd-key");
  if (!key) return;

  var inp = document.getElementById("ia-beyou-input");
  if (!inp) return;

  var accion = key.dataset.accion;
  var char = key.dataset.char;

  if (accion === "borrar") {
    inp.value = inp.value.slice(0, -1);
  } else if (accion === "limpiar") {
    inp.value = "";
    var res = document.getElementById("ia-beyou-resultado");
    if (res) res.innerHTML = "";
    beyouEstado("");
  } else if (accion === "mayus") {
    beyouMayus = !beyouMayus;
    beyouAplicarMayus();
    return;
  } else if (accion === "listo") {
    beyouTecladoVisible(false);
    beyouConsultar();
    return;
  } else if (char !== undefined) {
    if (inp.value.length < 60) inp.value += char;
    // El shift aplica a una sola letra
    if (beyouMayus) {
      beyouMayus = false;
      beyouAplicarMayus();
    }
  }
}, true);

// Calcula si un color de nivel es demasiado claro para usarlo como texto.
// Necesario porque hay niveles como "White" (#FFFFFF): pintar el texto de
// ese color sobre fondo blanco lo dejaria invisible.
function beyouColorNivel(hex) {
  var h = String(hex || "").trim().replace(/^#/, "");
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return { fondo: "#6b7280", texto: "#ffffff" };
  var r = parseInt(h.substr(0, 2), 16);
  var g = parseInt(h.substr(2, 2), 16);
  var b = parseInt(h.substr(4, 2), 16);
  var lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  // Fondo con el color del nivel y texto con el contraste adecuado
  return {
    fondo: "#" + h,
    texto: lum > 0.65 ? "#1f2937" : "#ffffff",
    claro: lum > 0.9
  };
}

function beyouRenderCliente(u) {
  var nivel = u.nivel || {};
  var nombreNivel = nivel.nivelNombre || "Sin nivel";
  var cn = beyouColorNivel(nivel.nivelColor);

  function fila(etiqueta, valor) {
    var v = (valor === null || valor === undefined || valor === "") ? "—" : valor;
    return '<div style="display:flex; justify-content:space-between; gap:12px; ' +
           'padding:10px 12px; border-bottom:1px solid #eef0f4;">' +
           '<span style="font-size:12px; color:#6b7280;">' + escaparHtml(etiqueta) + '</span>' +
           '<span style="font-size:13px; font-weight:600; color:#1f2937; text-align:right; ' +
           'word-break:break-all;">' + escaparHtml(v) + '</span></div>';
  }

  var cedula = u.numId || u.extId || "";

  // Campos en el orden que define la marca.
  // En Campeon el correo va primero, porque es el dato que el cliente
  // necesita para entrar a la app.
  var campos = [
    ["Nombres", u.nombre],
    ["Apellidos", u.apellido],
    ["Cédula / Pasaporte", cedula],
    ["Teléfono", u.telefono]
  ];
  var filaCorreo = ["Correo electrónico", u.email];
  if (beyouMarca.correoPrimero) {
    campos.unshift(filaCorreo);
  } else {
    campos.push(filaCorreo);
  }

  var html =
    '<div style="background:#fff; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden;">' +
      '<div style="padding:12px; background:' + beyouMarca.gradiente + '; color:#fff;">' +
        '<div style="font-size:15px; font-weight:700;">' +
          escaparHtml(((u.nombre || "") + " " + (u.apellido || "")).trim() || "Cliente") +
        '</div>' +
        '<div style="margin-top:6px; display:inline-block; padding:3px 10px; border-radius:999px; ' +
        'background:rgba(255,255,255,.22); font-size:11px; font-weight:600;">' +
          'Nivel: ' + escaparHtml(nombreNivel) +
        '</div>' +
      '</div>' +
      campos.map(function (c) { return fila(c[0], c[1]); }).join("") +
      '<div style="display:flex; justify-content:space-between; align-items:center; gap:12px; padding:10px 12px;">' +
        '<span style="font-size:12px; color:#6b7280;">Nivel</span>' +
        '<span style="font-size:12px; font-weight:700; padding:4px 12px; border-radius:999px; ' +
        'background:' + escaparHtml(cn.fondo) + '; color:' + escaparHtml(cn.texto) + '; ' +
        'border:1px solid ' + (cn.claro ? '#d1d5db' : escaparHtml(cn.fondo)) + ';">' +
          escaparHtml(nombreNivel) +
        '</span>' +
      '</div>' +
    '</div>';

  var res = document.getElementById("ia-beyou-resultado");
  if (res) res.innerHTML = html;
}

function beyouNoRegistrado(valor) {
  var res = document.getElementById("ia-beyou-resultado");
  if (!res) return;
  res.innerHTML =
    '<div style="background:#fff7ed; border:1px solid #fdba74; border-radius:12px; padding:18px; text-align:center;">' +
      '<div style="font-size:30px;">\ud83d\udd0d</div>' +
      '<div style="font-weight:700; font-size:15px; color:#9a3412; margin-top:8px;">Cliente no registrado</div>' +
      '<div style="font-size:12px; color:#7c2d12; margin-top:8px; line-height:1.5;">' +
        'No encontr\u00e9 una cuenta con <b>' + escaparHtml(valor) + '</b>.<br>' +
        'Orienta al cliente sobre el proceso de registro.' +
      '</div>' +
    '</div>';
}

// Llama al API una vez con un conjunto de campos
async function beyouLlamar(cliente) {
  return new Promise(function (resolve) {
    chrome.runtime.sendMessage(
      { action: "consultarBeYou", cliente: cliente },
      function (r) {
        if (chrome.runtime.lastError) {
          resolve({ ok: false, error: chrome.runtime.lastError.message });
          return;
        }
        resolve(r || { ok: false, error: "sin respuesta" });
      }
    );
  });
}

async function beyouConsultar() {
  var inp = document.getElementById("ia-beyou-input");
  var res = document.getElementById("ia-beyou-resultado");
  var btn = document.getElementById("ia-beyou-buscar");
  if (!inp) return;

  var valorOriginal = String(inp.value || "").trim();
  var intentos = beyouVariantes(valorOriginal);
  if (intentos.length === 0) {
    beyouEstado("Escribe una c\u00e9dula, pasaporte, correo o tel\u00e9fono.", "#b91c1c");
    return;
  }

  if (res) res.innerHTML = "";
  if (btn) btn.disabled = true;

  var probados = [];
  var ultimoError = null;

  try {
    for (var i = 0; i < intentos.length; i++) {
      var it = intentos[i];
      beyouEstado("Buscando por " + escaparHtml(it.etiqueta) + "\u2026 (" +
                  (i + 1) + "/" + intentos.length + ")");

      var resp = await beyouLlamar(it.cliente);

      // Log plano: se lee sin tener que expandir el objeto en la consola
      var _d = resp.data || {};
      var _n = Array.isArray(_d.data) ? _d.data.length : 0;
      var _u = _n > 0 ? _d.data[0] : null;
      console.log("[TIA BeYou] intento " + (i + 1) + " (" + it.etiqueta + ") -> " +
        "enviado=" + JSON.stringify(it.cliente) +
        " | codigoRespuesta=" + _d.codigoRespuesta +
        " | msj=" + _d.msj +
        " | registros=" + _n +
        (_u ? (" | email=" + _u.email + " numId=" + _u.numId +
               " nombre=" + _u.nombre + " " + _u.apellido) : ""));
      console.log("[TIA BeYou] respuesta completa:", resp);

      // Errores de configuracion o conexion: cortar de inmediato
      if (resp.error === "sin-apikey") {
        beyouEstado("\u26a0\ufe0f Falta configurar el <b>apikey</b> de Be You en config.json.", "#b45309");
        return;
      }
      if (!resp.ok && !resp.data) {
        ultimoError = resp.error || ("HTTP " + resp.status);
        beyouEstado("\u274c No pude conectar con Be You (" + escaparHtml(String(ultimoError)) + ").", "#b91c1c");
        return;
      }

      var dd = resp.data || {};
      var cod = dd.codigoRespuesta;

      if (cod === 9501) {
        beyouEstado("\u274c El apikey configurado no es v\u00e1lido (9501).", "#b91c1c");
        return;
      }

      // Encontrado
      if (cod === 0 && Array.isArray(dd.data) && dd.data.length > 0) {
        var u = dd.data[0];
        // El usuario generico "nousuario" significa que no hubo match real
        if (String(u.email || "").toLowerCase().indexOf("nousuario") !== -1) {
          probados.push(it.etiqueta);
          continue;
        }
        beyouEstado("Cliente encontrado por " + escaparHtml(it.etiqueta) + ".", "#166534");
        beyouRenderCliente(u);
        beyouPublicarP2("ok", beyouFiltrarParaCliente(u));
        return;
      }

      probados.push(it.etiqueta + (dd.msj ? " \u2192 " + dd.msj : ""));
    }

    // Ningun intento dio resultado
    beyouEstado("", "#6b7280");
    beyouNoRegistrado(valorOriginal);
    if (P2_MOSTRAR_NO_REGISTRADO) beyouPublicarP2("no_registrado", null);

  } catch (err) {
    beyouEstado("\u274c Error: " + escaparHtml(err.message), "#b91c1c");
  } finally {
    if (btn) btn.disabled = false;
  }
}

document.getElementById("ia-beyou-buscar")?.addEventListener("click", function (e) {
  e.stopPropagation();
  e.preventDefault();
  beyouTecladoVisible(false);
  beyouConsultar();
}, true);

// ── Procesos: botones de categoría ────────────────────────────
document.querySelectorAll(".ia-proceso-btn").forEach(btn => {
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const proceso = btn.dataset.proceso;
    const data = PREGUNTAS[proceso];
    if (!data) return;

    document.getElementById("ia-proceso-titulo").textContent = data.titulo;
    const lista = document.getElementById("ia-preguntas-lista");
    lista.innerHTML = "";
    data.preguntas.forEach(pregunta => {
      const item = document.createElement("button");
      item.className = "ia-pregunta-item";
      item.textContent = pregunta;
      item.addEventListener("click", (e) => {
        e.stopPropagation();
        enviarPreguntaProceso(pregunta);
      }, true);
      lista.appendChild(item);
    });

    showView("ia-view-preguntas");
  }, true);
});

// ── Enviar pregunta de proceso a n8n ──────────────────────────
async function enviarPreguntaProceso(pregunta) {
  limpiarRespuestaProceso();
  showView("ia-view-respuesta-proceso");

  const loading = document.getElementById("ia-loading-proceso");
  const respuesta = document.getElementById("ia-respuesta-proceso");
  loading.classList.remove("ia-hidden");

  try {
    const payload = {
      sessionId: "sess-" + Math.random().toString(36).substring(2),
      mensajeTexto: pregunta,
      url: location.href,
      titulo: document.title
    };

    const response = await fetch(WEBHOOK_PROCESOS, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const rawText = await response.text();
    let html = rawText || "Sin respuesta";

    // Si viene JSON, extraer el campo de respuesta
    try {
      const json = JSON.parse(rawText);
      html = json.output || json.respuesta || json.message || rawText;
    } catch (_) { /* es texto plano, usarlo directo */ }

    html = html.replace(/```html\s*/gi, "").replace(/```/g, "")
               .replace(/<script[\s\S]*?<\/script>/gi, "")
               // Quitar comillas alrededor de <strong>
               .replace(/"(<strong>)/g, "$1")
               .replace(/(<\/strong>)"/g, "$1")
               .replace(/"(<b>)/g, "$1")
               .replace(/(<\/b>)"/g, "$1")
               // Quitar saltos de línea dentro de <li> para que el texto fluya inline
               .replace(/(<li[^>]*>)([\s\S]*?)(<\/li>)/gi, (_, open, inner, close) => {
                 return open + inner.replace(/\n/g, " ").replace(/\s{2,}/g, " ").trim() + close;
               })
               .trim();

    loading.classList.add("ia-hidden");
    respuesta.innerHTML = html;
  } catch (error) {
    loading.classList.add("ia-hidden");
    respuesta.innerHTML = `<div class="ia-error">${error.message}</div>`;
  }
}

function limpiarRespuestaProceso() {
  const r = document.getElementById("ia-respuesta-proceso");
  if (r) r.innerHTML = "";
  const l = document.getElementById("ia-loading-proceso");
  if (l) l.classList.add("ia-hidden");
}

// ── Errores de caja: captura ───────────────────────────────────
function limpiarErrores() {
  const preview = document.getElementById("ia-preview");
  if (preview) { preview.src = ""; preview.style.display = "none"; }
  const respuesta = document.getElementById("ia-respuesta");
  if (respuesta) respuesta.innerHTML = "";
  const loading = document.getElementById("ia-loading");
  if (loading) loading.classList.add("ia-hidden");
  screenshotBase64 = null;
}

async function enviarErrores() {
  const loading   = document.getElementById("ia-loading");
  const respuesta = document.getElementById("ia-respuesta");

  loading.classList.remove("ia-hidden");
  respuesta.innerHTML = "";

  try {
    const payload = {
      sessionId: "sess-" + Math.random().toString(36).substring(2),
      texto: "Analiza la imagen capturada e identifica el error visible en pantalla según el manual técnico.",
      imagen: screenshotBase64
    };

    const response = await fetch(WEBHOOK_ERRORES, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const rawText = await response.text();
    let html = rawText || "Sin respuesta";

    try {
      const json = JSON.parse(rawText);
      html = json.output || json.respuesta || json.message || rawText;
    } catch (_) { /* texto plano */ }

    html = html.replace(/```html\s*/gi, "").replace(/```/g, "")
               .replace(/<script[\s\S]*?<\/script>/gi, "")
               .replace(/"(<strong>)/g, "$1")
               .replace(/(<\/strong>)"/g, "$1")
               .replace(/"(<b>)/g, "$1")
               .replace(/(<\/b>)"/g, "$1")
               .replace(/(<li[^>]*>)([\s\S]*?)(<\/li>)/gi, (_, open, inner, close) => {
                 return open + inner.replace(/\n/g, " ").replace(/\s{2,}/g, " ").trim() + close;
               })
               .trim();
    respuesta.innerHTML = html;
  } catch (error) {
    respuesta.innerHTML = `<div class="ia-error">${error.message}</div>`;
  }

  loading.classList.add("ia-hidden");
}

document.getElementById("ia-capturar").addEventListener("click", (e) => {
  e.stopPropagation();
  panel.classList.remove("open");
  panel.style.display = "none";
  button.style.display = "none";

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        chrome.runtime.sendMessage({ action: "capturarPantalla" }, (response) => {
          panel.style.display = "";
          button.style.display = "";
          panel.classList.add("open");

          if (response && response.imagen) {
            screenshotBase64 = response.imagen;
            const preview = document.getElementById("ia-preview");
            preview.src = screenshotBase64;
            preview.style.display = "block";
            // Enviar automáticamente
            enviarErrores();
          }
        });
      }, 200);
    });
  });
}, true);



// ══════════════════════════════════════════
// SERVICE DESK
// ══════════════════════════════════════════

let sdScreenshotBase64 = null;
let sdSubcat = null;

function detectarCaja() {
  let caja = "No detectada";
  try {
    const allEls = document.querySelectorAll("span, div, li, a");
    for (const el of allEls) {
      if (el.children.length > 0) continue;
      const texto = el.textContent.trim();
      const match = texto.match(/^(N\d{3,4})\s*[-–]\s*(B\d{2,3})$/);
      if (match) { caja = texto; break; }
    }
    if (caja === "No detectada") {
      for (const el of allEls) {
        if (el.children.length > 0) continue;
        const texto = el.textContent.trim();
        const match = texto.match(/[A-Z]\d{3,4}/);
        if (match && texto.length < 20) { caja = texto; break; }
      }
    }
  } catch(e) {}
  const valorEl = document.getElementById("ia-sd-caja-valor");
  const infoBox = document.getElementById("ia-sd-info");
  if (valorEl) valorEl.textContent = caja;
  if (infoBox) infoBox.classList.remove("ia-hidden");
  return caja;
}

function limpiarServiceDesk() {
  sdScreenshotBase64 = null;
  sdSubcat = null;
  kbdText = "";
  kbdShift = false;
  const preview = document.getElementById("ia-sd-preview");
  if (preview) { preview.src = ""; preview.style.display = "none"; }
  const desc = document.getElementById("ia-sd-descripcion");
  if (desc) desc.value = "";
  const kbd = document.getElementById("ia-sd-keyboard");
  if (kbd) kbd.classList.add("ia-hidden");
  kbdUpdateDisplay();
  const enviar = document.getElementById("ia-sd-enviar");
  if (enviar) enviar.classList.add("ia-hidden");
  const loading = document.getElementById("ia-sd-loading");
  if (loading) loading.classList.add("ia-hidden");
  const respuesta = document.getElementById("ia-sd-respuesta");
  if (respuesta) respuesta.innerHTML = "";
  const info = document.getElementById("ia-sd-info");
  if (info) info.classList.add("ia-hidden");
  // Reset subcategory buttons
  document.querySelectorAll(".ia-sd-subcat-btn").forEach(b => b.classList.remove("ia-sd-subcat-btn--active"));
  // Hide capturar until subcategory is selected
  const capturar = document.getElementById("ia-sd-capturar");
  if (capturar) capturar.classList.add("ia-hidden");
}

// ── Subcategoría ──────────────────────────────────────────────
document.querySelectorAll(".ia-sd-subcat-btn").forEach(btn => {
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    // Deselect all, select clicked
    document.querySelectorAll(".ia-sd-subcat-btn").forEach(b => b.classList.remove("ia-sd-subcat-btn--active"));
    btn.classList.add("ia-sd-subcat-btn--active");
    sdSubcat = btn.dataset.subcat;
    // Show capturar button
    document.getElementById("ia-sd-capturar").classList.remove("ia-hidden");
  }, true);
});

document.getElementById("ia-sd-capturar").addEventListener("click", (e) => {
  e.stopPropagation();
  panel.classList.remove("open");
  panel.style.display  = "none";
  button.style.display = "none";

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        chrome.runtime.sendMessage({ action: "capturarPantalla" }, (response) => {
          panel.style.display  = "";
          button.style.display = "";
          panel.classList.add("open");
          if (response && response.imagen) {
            sdScreenshotBase64 = response.imagen;
            const preview = document.getElementById("ia-sd-preview");
            preview.src = sdScreenshotBase64;
            preview.style.display = "block";
            document.getElementById("ia-sd-enviar").classList.remove("ia-hidden");
          }
        });
      }, 200);
    });
  });
}, true);

document.getElementById("ia-sd-enviar").addEventListener("click", async (e) => {
  e.stopPropagation();
  const loading     = document.getElementById("ia-sd-loading");
  const respuesta   = document.getElementById("ia-sd-respuesta");
  const caja        = document.getElementById("ia-sd-caja-valor")?.textContent || "No detectada";
  const descripcion = document.getElementById("ia-sd-descripcion")?.value || "";

  loading.classList.remove("ia-hidden");
  respuesta.innerHTML = "";
  document.getElementById("ia-sd-enviar").classList.add("ia-hidden");

  try {
    const payload = {
      sessionId:    "sd-" + Math.random().toString(36).substring(2),
      caja:         caja,
      subcategoria: sdSubcat || "General",
      descripcion:  descripcion,
      url:          location.href,
      imagen:       sdScreenshotBase64
    };

    const response = await fetch(WEBHOOK_SERVICEDESK, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload)
    });

    const rawText = await response.text();
    let html = "";
    try {
      const json = JSON.parse(rawText);
      const msg = json.message || json.ticketId || json.respuesta || "Ticket enviado correctamente";

      const esError = datos.estado === "error" || (datos.response_status && datos.response_status[0] && datos.response_status[0].status !== "success") || response.status >= 400;
      if (esError) {
        // Error del flujo de n8n
        html = `<div class="ia-error">⚠️ ${msg}</div>`;
        document.getElementById("ia-sd-enviar").classList.remove("ia-hidden");
      } else {
        // Éxito
        html = `<div class="ia-card ia-card--success"><div class="ia-title">✅ Ticket creado</div><div class="ia-content">${msg}</div></div>`;
      }
    } catch (_) {
      html = rawText
        ? `<div class="ia-card ia-card--success"><div class="ia-title">✅ Enviado</div><div class="ia-content">${rawText}</div></div>`
        : `<div class="ia-card ia-card--success"><div class="ia-title">✅ Enviado</div><div class="ia-content">Tu reporte fue enviado al Service Desk correctamente.</div></div>`;
    }
    respuesta.innerHTML = html;
  } catch (error) {
    respuesta.innerHTML = `<div class="ia-error">⚠️ No se pudo conectar con el Service Desk. Intenta de nuevo.</div>`;
    document.getElementById("ia-sd-enviar").classList.remove("ia-hidden");
  }

  loading.classList.add("ia-hidden");
}, true);

// ══════════════════════════════════════════
// TECLADO VIRTUAL SERVICE DESK
// ══════════════════════════════════════════
let kbdText = "";
let kbdShift = false;

function kbdUpdateDisplay() {
  const el = document.getElementById("ia-kbd-text");
  const display = document.getElementById("ia-sd-descripcion-display");
  const hidden = document.getElementById("ia-sd-descripcion");
  if (el) el.textContent = kbdText;
  if (hidden) hidden.value = kbdText;
  if (display) {
    display.textContent = kbdText || "Describe el problema (toca para escribir)...";
    display.classList.toggle("ia-sd-desc-placeholder", !kbdText);
  }
}

document.getElementById("ia-sd-descripcion-display").addEventListener("click", (e) => {
  e.stopPropagation();
  const kbd = document.getElementById("ia-sd-keyboard");
  if (kbd) kbd.classList.remove("ia-hidden");
}, true);

document.getElementById("ia-sd-keyboard").addEventListener("click", (e) => {
  e.stopPropagation();
  const key = e.target.closest(".ia-kbd-key");
  if (!key) return;

  const action = key.dataset.action;
  const char   = key.dataset.char;

  if (action === "backspace") {
    kbdText = kbdText.slice(0, -1);
  } else if (action === "shift") {
    kbdShift = !kbdShift;
    document.querySelectorAll(".ia-kbd-key[data-char]").forEach(k => {
      const c = k.dataset.char;
      if (c && c.length === 1 && c.match(/[a-z]/i)) {
        k.textContent = kbdShift ? c.toUpperCase() : c.toUpperCase();
        k.dataset.char = kbdShift ? c.toUpperCase() : c.toLowerCase();
      }
    });
    document.querySelector(".ia-kbd-key[data-action='shift']")
      ?.classList.toggle("ia-kbd-key--active", kbdShift);
  } else if (action === "clear") {
    kbdText = "";
  } else if (action === "done") {
    document.getElementById("ia-sd-keyboard").classList.add("ia-hidden");
  } else if (char !== undefined) {
    kbdText += kbdShift ? char.toUpperCase() : char;
    if (kbdShift) {
      kbdShift = false;
      document.querySelectorAll(".ia-kbd-key[data-char]").forEach(k => {
        const c = k.dataset.char;
        if (c && c.length === 1 && c.match(/[A-Z]/)) {
          k.textContent = c.toUpperCase();
          k.dataset.char = c.toLowerCase();
        }
      });
      document.querySelector(".ia-kbd-key[data-action='shift']")
        ?.classList.remove("ia-kbd-key--active");
    }
  }
  kbdUpdateDisplay();
}, true);

// ══════════════════════════════════════════
// SOLUCIONES
// ══════════════════════════════════════════
// Refrescar ahora recarga las DOS pantallas, no solo la actual: la de la
// cajera y la del cliente. Lo hace el service worker porque una pagina no
// puede recargar otra ventana.
//
// Si el service worker no responde (reciclado, extension recargandose),
// se recarga al menos la pagina actual: es el comportamiento anterior y
// sirve de respaldo.
document.getElementById("ia-btn-refrescar")?.addEventListener("click", (e) => {
  e.stopPropagation();
  panel.classList.remove("open");
  setTimeout(() => {
    try {
      chrome.runtime.sendMessage({ action: "tiaRefrescarTodo" }, () => {
        // Si el mensaje no llega, recarga solo esta pagina.
        if (chrome.runtime.lastError) window.location.reload();
      });
    } catch (err) {
      window.location.reload();
    }
  }, 200);
}, true);

// Cierra todas las ventanas de Chrome. No es un taskkill: la extension
// cierra sus propias ventanas y Chrome sale al cerrarse la ultima. Si
// Chrome estuviera colgado, no responderia.
document.getElementById("ia-btn-cerrar-navegador")?.addEventListener("click", (e) => {
  e.stopPropagation();
  panel.classList.remove("open");
  setTimeout(() => {
    try { chrome.runtime.sendMessage({ action: "tiaCerrarNavegador" }); } catch (err) {}
  }, 200);
}, true);

// ══════════════════════════════════════════
// CREAR TICKET - OBSERVADOR + LISTENER
// ══════════════════════════════════════════

function extraerInfoCaja() {

  let idCaja = "S000",
      numBase = "B00",
      hostnameFull = "";

  try {

    const pageText = document.body.innerText || "";
    const pageHtml = document.body.innerHTML || "";

    const allTexto =
      pageText + " " +
      document.title + " " +
      location.href + " " +
      pageHtml;

    // ═══════════════════════════════════════
    // ESTRATEGIA 1:
    // Buscar hostname completo
    // Ejemplo:
    // C01-B11-S106
    // C03-B28-N002
    // ═══════════════════════════════════════

    const fullHostRegex =
      /\b([A-Z]\d{2,3})-(B\d{2,3})-([A-Z]\d{3,4})\b/i;

    let mFull = allTexto.match(fullHostRegex);

    if (mFull) {

      hostnameFull = mFull[0].toUpperCase();

      numBase = mFull[2].toUpperCase();

      idCaja = mFull[3].toUpperCase();

      console.log(
        "[IA POS] Hostname completo encontrado:",
        hostnameFull
      );

    } else {

      // ═══════════════════════════════════════
      // ESTRATEGIA 2:
      // Buscar formato visible:
      // S106 - B11
      // ═══════════════════════════════════════

      const simpleMatch =
        allTexto.match(
          /\b([A-Z]\d{3,4})\s*-\s*(B\d{2,3})\b/i
        );

      if (simpleMatch) {

        idCaja = simpleMatch[1].toUpperCase();

        numBase = simpleMatch[2].toUpperCase();

        hostnameFull = `${idCaja}-${numBase}`;

        console.log(
          "[IA POS] Caja/Base encontradas:",
          idCaja,
          numBase
        );

      } else {

        // ═══════════════════════════════════════
        // ESTRATEGIA 3:
        // Buscar por separado
        // ═══════════════════════════════════════

        const mCaja =
          allTexto.match(/\b[A-Z]\d{3,4}\b/i);

        const mB =
          allTexto.match(/\bB\d{2,3}\b/i);

        if (mCaja)
          idCaja = mCaja[0].toUpperCase();

        if (mB)
          numBase = mB[0].toUpperCase();

        hostnameFull = `${idCaja}-${numBase}`;

        console.log(
          "[IA POS] Datos separados:",
          idCaja,
          numBase
        );
      }
    }

  } catch(e) {

    console.error(
      "[IA POS] Error extrayendo caja:",
      e
    );
  }

  const correo =
    ("caja" + numBase + "@grupotova.com")
      .toLowerCase();

  console.log(
    "[IA POS] Datos finales →",
    {
      idCaja,
      numBase,
      hostnameFull,
      correo
    }
  );

  // ── Extraer nombre y código de cajera ──────────────────────
  let nombreCajera = "", codigoAsociado = "";
  try {
    const pageText = document.body.innerText || "";
    const lineas = pageText.split(/\n/);
    for (const linea of lineas) {
      const trimmed = linea.trim();
      const m = trimmed.match(/^(.{5,80})\s*\((\d{4,8})\)\s*$/);
      if (m) {
        const posible = m[1].trim();
        if (!/^\d|http|localhost|Error|SAP|N\d{3}|B\d{2}/.test(posible)) {
          nombreCajera   = posible;
          codigoAsociado = m[2].trim();
          break;
        }
      }
    }
    if (!nombreCajera) {
      const m = pageText.match(/([^\d\n\(\)][^\n\(\)]{4,70})\s*\((\d{4,8})\)/);
      if (m) {
        const posible = m[1].trim();
        if (!/http|localhost|Error|SAP/.test(posible)) {
          nombreCajera   = posible;
          codigoAsociado = m[2].trim();
        }
      }
    }
  } catch(e) {}

  return {
    idCaja,
    numBase,
    hostnameFull,
    correo,
    nombreCajera,
    codigoAsociado
  };
}

// ── OBSERVADOR: muestra el botón cuando #ia-respuesta tiene contenido ──
const _respuestaEl = document.getElementById("ia-respuesta");
if (_respuestaEl) {
  const _observer = new MutationObserver(() => {
    const btnTk = document.getElementById("ia-crear-ticket");
    if (!btnTk) return;
    const hasContent = _respuestaEl.innerHTML.trim().length > 0;
    if (hasContent) {
      btnTk.disabled = false;
      btnTk.textContent = "🎫 Crear Ticket";
      btnTk.classList.remove("ia-hidden");
    } else {
      btnTk.classList.add("ia-hidden");
    }
  });
  _observer.observe(_respuestaEl, { childList: true, subtree: true, characterData: true });
}

// ── Listener del botón Crear Ticket → abre selector de tipo ──
document.getElementById("ia-crear-ticket")?.addEventListener("click", (e) => {
  e.stopPropagation();
  document.getElementById("ia-ticket-tipo-overlay").classList.remove("ia-hidden");
}, true);

// ── Cerrar selector de tipo ──
document.getElementById("ia-ticket-tipo-cerrar").addEventListener("click", (e) => {
  e.stopPropagation();
  document.getElementById("ia-ticket-tipo-overlay").classList.add("ia-hidden");
}, true);

// ── Botones de tipo de error → crean el ticket ──
document.querySelectorAll(".ia-ticket-tipo-btn").forEach(btn => {
  btn.addEventListener("click", async (e) => {
    e.stopPropagation();
    const asuntoTexto = btn.dataset.asunto;
    document.getElementById("ia-ticket-tipo-overlay").classList.add("ia-hidden");

    const btnTk     = document.getElementById("ia-crear-ticket");
    const respuesta = document.getElementById("ia-respuesta");
    const loading   = document.getElementById("ia-loading");

    btnTk.disabled = true;
    btnTk.textContent = "Creando ticket...";
    if (loading) loading.classList.remove("ia-hidden");

    const { idCaja, numBase, hostnameFull, correo } = extraerInfoCaja();
    const nombre = correo.split("@")[0];

    try {
      const payload = {
        sessionId:    "tk-" + Math.random().toString(36).substring(2),
        Posiciondecaja: idCaja, base: "Base " + numBase.replace(/[^0-9]/g, ""), hostname: hostnameFull, requester: correo,
        email:        correo,
        nombre:       nombre,
        loginName:    correo,
        solicitante: {
          email:     correo,
          nombre:    nombre,
          loginName: correo
        },
        instancia:    "TEC",
        tipo:         "INC",
        categoria:    "Cajas Fiscales",
        subcategoria: "Sistema de Arqueo",
        urgencia:    "Medio",
        impacto:      "Sucursal",
        asunto:       asuntoTexto + " " + idCaja + " - " + numBase,
        descripcion:  "Reporte generado desde IA POS",
        url:          location.href,
        imagen:       (typeof screenshotBase64 !== 'undefined') ? screenshotBase64 : null
      };

      const response = await fetch(WEBHOOK_TICKET, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const rawText = await response.text();
      let html = "";
      try {
        const json = JSON.parse(rawText);

        let ticketNum = "";
        let ticketUrl = "";
        let ticketIdInterno = "";
        let mensajeServidor = "";
        const datos = Array.isArray(json) ? json[0] : json;

        // 1. Campos del webhook nuevo (ticket_numero, ticket_url, ticket_id, mensaje)
        ticketNum = datos.ticket_numero || datos.ticketNumero || datos.numero_ticket || "";
        ticketUrl = datos.ticket_url || datos.ticketUrl || datos.url_ticket || "";
        ticketIdInterno = datos.ticket_id || datos.ticketId || "";
        mensajeServidor = datos.mensaje || datos.message || "";

        // 2. Fallbacks (formatos anteriores)
        if (!ticketNum && datos.files && datos.files[0] && datos.files[0].request) {
          ticketNum = datos.files[0].request.display_id || datos.files[0].request.id || "";
        }
        if (!ticketNum) ticketNum = datos.ticketNum || datos.display_id || datos.id || datos.numero || "";
        if (!ticketNum && datos.request) {
          ticketNum = datos.request.display_id || datos.request.id || "";
        }
        if (!ticketNum && datos.data) ticketNum = datos.data.display_id || datos.data.id || "";
        if (!ticketNum && datos.result) ticketNum = datos.result.display_id || datos.result.id || "";

        const msg = mensajeServidor || (ticketNum ? "Ticket #" + ticketNum + " creado exitosamente." : "Ticket creado correctamente.");

        const esError = datos.status === "ERROR" || datos.estado === "error" || (datos.response_status && datos.response_status[0] && datos.response_status[0].status !== "success") || response.status >= 400;
        if (esError) {
          html = '<div class="ia-error">\u26a0\ufe0f ' + msg + "</div>";
          btnTk.disabled = false; btnTk.textContent = "\uD83C\uDFAB Crear Ticket";
        } else {
          // Tarjeta de exito con numero destacado
          let bloqueNumero = "";
          if (ticketNum) {
            bloqueNumero = '<div style="background:#0ea05a;color:#fff;border-radius:8px;padding:10px 14px;margin:8px 0;text-align:center;">'
                         + '<div style="font-size:11px;opacity:.85;letter-spacing:1px;text-transform:uppercase;">Numero de Ticket</div>'
                         + '<div style="font-size:24px;font-weight:800;letter-spacing:1px;margin-top:2px;">#' + ticketNum + '</div>'
                         + '</div>';
          }

          html = '<div class="ia-card ia-card--success">'
               + '<div class="ia-title">\u2705 Ticket creado</div>'
               + '<div class="ia-content">'
               + bloqueNumero
               + '<div style="margin:6px 0;">' + msg + '</div>'
               + '<br><small style="display:block;margin-top:8px;color:#666;">' + asuntoTexto + ' | Caja: ' + idCaja + ' | Base: ' + numBase + '</small>'
               + '</div></div>';
          btnTk.classList.add("ia-hidden");
        }
      } catch (_) {
        const textoRespuesta = rawText.trim();
        html = '<div class="ia-card ia-card--success"><div class="ia-title">\u2705 Ticket creado</div>'
             + '<div class="ia-content">' + (textoRespuesta || "Reporte enviado.") + '<br><small>Caja: ' + idCaja + ' | Base: ' + numBase + '</small></div></div>';
        btnTk.classList.add("ia-hidden");
      }
      if (respuesta) respuesta.innerHTML = html;
    } catch (error) {
      btnTk.disabled = false; btnTk.textContent = "\uD83C\uDFAB Crear Ticket";
      if (respuesta) respuesta.insertAdjacentHTML("beforeend",
        '<div class="ia-error" style="margin-top:10px">\u26a0\ufe0f Error: ' + error.message + "</div>");
    }
    if (loading) loading.classList.add("ia-hidden");
  }, true);
});

// ══════════════════════════════════════════
// REGISTRO DE FONDOS LIMPIOS
// ══════════════════════════════════════════
let fondosTipo       = "recepcion";   // "recepcion" | "entrega"
let fondosActiveRow  = null;
let fondosKbdStr     = "0";
let fondosSobreData  = null;
let fondosCarnetData = null;
// ══════════════════════════════════════════
// REGISTRO LOCAL DE MOVIMIENTOS DE FONDO
// ------------------------------------------------------------
// El arqueo suma un fondo inicial de $100 al efectivo esperado. Pero en
// la tarde la caja ENTREGA ese fondo, y desde ese momento los $100 ya no
// estan: el arqueo salia con un faltante de $100 que no existia,
// marcando a la cajera injustamente.
//
// El dato de si la caja entrego su fondo vive en el backend, pero el
// arqueo siempre se hace en la maquina de la propia caja (el campo
// N de Caja se rellena solo y las cajas no tienen teclado para
// cambiarlo), asi que basta con anotar cada movimiento aqui cuando ocurre.
//
// Regla:
//   recepcion sin entrega posterior -> fondo en caja
//   recepcion y entrega             -> $0
//   sin registros                   -> no se afirma nada, se avisa
// La entrega solo cuenta si ocurrio ANTES de la hora del arqueo: un
// arqueo de las 3pm no debe descontar una entrega de las 4pm.
// ══════════════════════════════════════════
const FONDOS_LOG_KEY = "tia_fondos_movimientos";

function fondosHoyISO() {
  const d = new Date();
  return d.getFullYear() + "-" +
         String(d.getMonth() + 1).padStart(2, "0") + "-" +
         String(d.getDate()).padStart(2, "0");
}

async function fondosRegistrarMovimiento(tipo, monto) {
  try {
    const g = await chrome.storage.local.get(FONDOS_LOG_KEY);
    const previos = (g && g[FONDOS_LOG_KEY]) || [];
    const hoy = fondosHoyISO();
    const limpios = previos.filter(m => m.fecha === hoy);   // solo los de hoy
    limpios.push({
      tipo: tipo,
      monto: monto,
      fecha: hoy,
      hora: new Date().toTimeString().slice(0, 8),
      ts: Date.now()
    });
    const obj = {};
    obj[FONDOS_LOG_KEY] = limpios;
    await chrome.storage.local.set(obj);
    console.log("[IA POS] Movimiento de fondo registrado localmente:", tipo, monto);
  } catch (e) {
    console.warn("[IA POS] No pude registrar el movimiento de fondo:", e.message);
  }
}

// Devuelve { monto, detalle, confiable }
async function fondosCalcularEsperado(horaArqueo) {
  const resultado = { monto: 0, detalle: "", confiable: false };
  try {
    const g = await chrome.storage.local.get(FONDOS_LOG_KEY);
    const movs = ((g && g[FONDOS_LOG_KEY]) || []).filter(m => m.fecha === fondosHoyISO());

    if (movs.length === 0) {
      resultado.detalle = "Sin movimientos de fondo registrados hoy en esta caja";
      return resultado;
    }
    resultado.confiable = true;

    const corte = horaArqueo || new Date().toTimeString().slice(0, 8);
    const previos = movs.filter(m => m.hora <= corte);
    const recepcion = previos.filter(m => m.tipo === "recepcion").pop();
    const entrega   = previos.filter(m => m.tipo === "entrega").pop();

    if (recepcion && !entrega) {
      resultado.monto = parseFloat(recepcion.monto) || 100;
      resultado.detalle = "Recepción de fondo a las " + recepcion.hora;
    } else if (recepcion && entrega) {
      resultado.monto = 0;
      resultado.detalle = "Fondo entregado a las " + entrega.hora +
                          " (recibido a las " + recepcion.hora + ")";
    } else if (entrega && !recepcion) {
      resultado.monto = 0;
      resultado.detalle = "Entrega de fondo a las " + entrega.hora + " (sin recepción registrada)";
    } else {
      resultado.monto = 0;
      resultado.detalle = "Sin movimientos previos a las " + corte;
    }
  } catch (e) {
    resultado.detalle = "No pude leer los movimientos locales";
  }
  return resultado;
}

let arqueoFondoInfo = null;   // que fondo se uso en el arqueo y por que

let fondosMontoIncorrecto = false;  // true si el total no es $100
let fondosScanTarget = null;   // "sobre" | "carnet" | null
let fondosScanBuffer = "";
let fondosScanLastTime = 0;

// Iniciar la captura de escaneo. El lector QR escribe muy rápido y termina con Enter.
// Capturamos las teclas a nivel de documento para que NO lleguen al campo de SAP.
function fondosFijarFoco(inputId) {
  fondosScanTarget = inputId === "ia-fondos-scan-carnet" ? "carnet" : "sobre";
  fondosScanBuffer = "";
  const el = document.getElementById(inputId);
  if (el) { el.value = ""; el.placeholder = "Esperando escaneo..."; }
}

function fondosLiberarFoco() {
  fondosScanTarget = null;
  fondosScanBuffer = "";
}

// Procesar el contenido escaneado
async function fondosProcesarEscaneo(target, raw) {
  const data = fondosParsearQR(raw);

  // ── Escaneo del carnet del auditor (arqueo) ──
  if (target === "auditor") {
    const rawDigits = raw.replace(/[^0-9]/g, "");
    const auditorId = rawDigits.substring(0, 6);
    const inp = document.getElementById("ia-arqueo-auditor");
    if (inp) inp.value = auditorId;
    fondosScanTarget = null;
    fondosScanBuffer = "";
    return;
  }

  if (target === "sobre") {
    fondosSobreData = data;
    const info = document.getElementById("ia-fondos-sobre-info");
    const inp = document.getElementById("ia-fondos-scan-sobre");

    // ── Validar que el código sea de un sobre válido (CADENA-BASE-NUMERO) ──
    const codigoSobre = (data.codigo || raw || "").toUpperCase().trim();
    const cadenasValidas = ["STEVENS", "MADISON", "CAMPEON"];
    const partesSobre = codigoSobre.split("-");
    const sobreCadena = partesSobre[0] || "";
    const sobreBase = partesSobre[1] || "";
    const esCadenaValida = cadenasValidas.some(c => sobreCadena.includes(c));

    // Obtener la base de la caja actual
    const { numBase: baseCaja } = extraerInfoCaja();
    const baseActual = (baseCaja || "").toUpperCase().trim();

    if (!esCadenaValida) {
      info.innerHTML =
        '<div class="ia-fondos-info-title" style="color:#dc2626">⚠️ Código no válido</div>' +
        '<div class="ia-fondos-info-row"><span>Escaneado:</span><strong>' + codigoSobre + '</strong></div>' +
        '<div style="color:#dc2626;font-size:13px;font-weight:600;margin-top:8px">' +
        'Este código no corresponde a un sobre. Escanea el código QR del sobre.</div>';
      info.classList.remove("ia-hidden");
      if (inp) { inp.value = ""; inp.placeholder = "Escanea el sobre..."; }
      document.getElementById("ia-fondos-sobre-continuar").disabled = true;
      fondosScanTarget = "sobre"; fondosScanBuffer = "";
      return;
    }

    if (baseActual && sobreBase && sobreBase !== baseActual) {
      info.innerHTML =
        '<div class="ia-fondos-info-title" style="color:#dc2626">⚠️ Sobre de otra base</div>' +
        '<div class="ia-fondos-info-row"><span>Escaneado:</span><strong>' + codigoSobre + '</strong></div>' +
        '<div class="ia-fondos-info-row"><span>Base del sobre:</span><strong>' + sobreBase + '</strong></div>' +
        '<div class="ia-fondos-info-row"><span>Base de esta caja:</span><strong>' + baseActual + '</strong></div>' +
        '<div style="color:#dc2626;font-size:13px;font-weight:600;margin-top:8px">' +
        'Este sobre pertenece a otra base. Solo puedes usar sobres de <strong>' + baseActual + '</strong>.</div>';
      info.classList.remove("ia-hidden");
      if (inp) { inp.value = ""; inp.placeholder = "Escanea un sobre de " + baseActual + "..."; }
      document.getElementById("ia-fondos-sobre-continuar").disabled = true;
      fondosScanTarget = "sobre"; fondosScanBuffer = "";
      return;
    }

    // ── En ENTREGA: validar que el sobre tenga una recepción previa ──
    if (fondosTipo === "entrega") {
      info.innerHTML =
        '<div class="ia-fondos-info-title">🔄 Validando sobre...</div>' +
        '<div class="ia-fondos-info-row"><span>Código:</span><strong>' + (data.codigo||"—") + '</strong></div>';
      info.classList.remove("ia-hidden");
      if (inp) inp.value = data.codigo || raw;
      document.getElementById("ia-fondos-sobre-continuar").disabled = true;
      document.getElementById("ia-fondos-sobre-reescanear").classList.remove("ia-hidden");

      try {
        const resp = await fetch(WEBHOOK_VALIDAR_SOBRE, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sobreCodigo: data.codigo, tipoValidacion: "entrega" })
        });
        const resultado = await resp.json();

        if (resultado.tieneRecepcion === false) {
          info.innerHTML =
            '<div class="ia-fondos-info-title" style="color:#dc2626">⚠️ Sobre sin recepción</div>' +
            '<div class="ia-fondos-info-row"><span>Código:</span><strong>' + (data.codigo||"—") + '</strong></div>' +
            '<div style="color:#dc2626;font-size:13px;font-weight:600;margin-top:8px">' +
            'Este sobre no tiene una recepción registrada. No se puede hacer la entrega sin recepción previa. ' +
            'Escanea un sobre válido.</div>';
          info.classList.remove("ia-hidden");
          if (inp) { inp.value = ""; inp.placeholder = "Escanea un sobre con recepción..."; }
          document.getElementById("ia-fondos-sobre-continuar").disabled = true;
          fondosScanTarget = "sobre"; fondosScanBuffer = "";
          return;
        }

        if (resultado.tieneEntrega === true) {
          info.innerHTML =
            '<div class="ia-fondos-info-title" style="color:#dc2626">⚠️ Entrega duplicada</div>' +
            '<div class="ia-fondos-info-row"><span>Código:</span><strong>' + (data.codigo||"—") + '</strong></div>' +
            '<div style="color:#dc2626;font-size:13px;font-weight:600;margin-top:8px">' +
            'Este sobre ya tiene una entrega registrada hoy. No se puede entregar el mismo sobre dos veces.</div>';
          info.classList.remove("ia-hidden");
          if (inp) { inp.value = ""; inp.placeholder = "Escanea otro sobre..."; }
          document.getElementById("ia-fondos-sobre-continuar").disabled = true;
          fondosScanTarget = "sobre"; fondosScanBuffer = "";
          return;
        }
      } catch(err) {
        console.warn("[IA POS] Error validando recepción del sobre:", err.message);
        // Si falla, mostrar advertencia pero dejar continuar
      }
    }

    // ── En RECEPCIÓN: validar que el sobre NO tenga ya una recepción hoy ──
    if (fondosTipo === "recepcion") {
      info.innerHTML =
        '<div class="ia-fondos-info-title">🔄 Validando sobre...</div>' +
        '<div class="ia-fondos-info-row"><span>Código:</span><strong>' + (data.codigo||"—") + '</strong></div>';
      info.classList.remove("ia-hidden");
      if (inp) inp.value = data.codigo || raw;
      document.getElementById("ia-fondos-sobre-continuar").disabled = true;
      document.getElementById("ia-fondos-sobre-reescanear").classList.remove("ia-hidden");

      try {
        const resp = await fetch(WEBHOOK_VALIDAR_SOBRE, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sobreCodigo: data.codigo, tipoValidacion: "recepcion" })
        });
        const resultado = await resp.json();

        if (resultado.tieneRecepcion === true) {
          info.innerHTML =
            '<div class="ia-fondos-info-title" style="color:#dc2626">⚠️ Recepción duplicada</div>' +
            '<div class="ia-fondos-info-row"><span>Código:</span><strong>' + (data.codigo||"—") + '</strong></div>' +
            '<div style="color:#dc2626;font-size:13px;font-weight:600;margin-top:8px">' +
            'Este sobre ya tiene una recepción registrada hoy. No se puede recibir el mismo sobre dos veces.</div>';
          info.classList.remove("ia-hidden");
          if (inp) { inp.value = ""; inp.placeholder = "Escanea otro sobre..."; }
          document.getElementById("ia-fondos-sobre-continuar").disabled = true;
          fondosScanTarget = "sobre"; fondosScanBuffer = "";
          return;
        }
      } catch(err) {
        console.warn("[IA POS] Error validando recepción duplicada:", err.message);
        // Si falla, dejar continuar
      }
    }

    info.innerHTML =
      '<div class="ia-fondos-info-title">📦 Sobre escaneado</div>' +
      '<div class="ia-fondos-info-row"><span>Código:</span><strong>' + (data.codigo||"—") + '</strong></div>' +
      (data.fecha   ? '<div class="ia-fondos-info-row"><span>Fecha:</span><strong>'+data.fecha+'</strong></div>' : '') +
      (data.hora    ? '<div class="ia-fondos-info-row"><span>Hora:</span><strong>'+data.hora+'</strong></div>' : '') +
      (data.usuario ? '<div class="ia-fondos-info-row"><span>Usuario:</span><strong>'+data.usuario+'</strong></div>' : '') +
      (data.caja    ? '<div class="ia-fondos-info-row"><span>Caja:</span><strong>'+data.caja+'</strong></div>' : '');
    info.classList.remove("ia-hidden");
    if (inp) { inp.value = data.codigo || raw; inp.placeholder = "Esperando escaneo..."; }
    document.getElementById("ia-fondos-sobre-continuar").disabled = false;
    document.getElementById("ia-fondos-sobre-reescanear").classList.remove("ia-hidden");
    // Mantener el escáner activo para permitir re-escaneo
    fondosScanTarget = "sobre";
    fondosScanBuffer = "";
  } else if (target === "carnet") {
    // El QR del carnet puede venir como "%05069419920504"
    const rawDigits = raw.replace(/[^0-9]/g, "");
    const carnetId = rawDigits.substring(0, 6);
    
    if (!data.id && !data.codigo) data.codigo = carnetId;
    if (data.id) data.id = data.id.replace(/[^0-9]/g, "").substring(0, 6);
    if (data.codigo && !data.id) data.id = data.codigo.replace(/[^0-9]/g, "").substring(0, 6);
    
    const info = document.getElementById("ia-fondos-carnet-info");
    const inp = document.getElementById("ia-fondos-scan-carnet");

    // ── Validar que NO sea la misma persona que la cajera ──
    const { codigoAsociado } = extraerInfoCaja();
    if (carnetId && codigoAsociado && carnetId === codigoAsociado) {
      info.innerHTML =
        '<div class="ia-fondos-info-title" style="color:#dc2626">⚠️ Carnet rechazado</div>' +
        '<div class="ia-fondos-info-row"><span>ID escaneado:</span><strong>' + carnetId + '</strong></div>' +
        '<div style="color:#dc2626;font-size:13px;font-weight:600;margin-top:8px">' +
        'La supervisora no puede ser la misma persona que la cajera. ' +
        'Escanea el carnet de otra supervisora.</div>';
      info.classList.remove("ia-hidden");
      if (inp) { inp.value = ""; inp.placeholder = "Escanea otro carnet..."; }
      document.getElementById("ia-fondos-carnet-continuar").disabled = true;
      fondosScanTarget = "carnet"; fondosScanBuffer = "";
      return;
    }

    // ── Mostrar "Validando..." mientras consulta ──
    info.innerHTML =
      '<div class="ia-fondos-info-title">🔄 Validando carnet...</div>' +
      '<div class="ia-fondos-info-row"><span>ID:</span><strong>' + carnetId + '</strong></div>';
    info.classList.remove("ia-hidden");
    if (inp) inp.value = carnetId;
    document.getElementById("ia-fondos-carnet-continuar").disabled = true;

    // ── Consultar n8n para validar cargo ──
    try {
      const resp = await fetch(WEBHOOK_VALIDAR_SUPERVISOR, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ carnetId })
      });
      const resultado = await resp.json();

      if (resultado.noEncontrado) {
        // Usuario no existe en la base de datos
        info.innerHTML =
          '<div class="ia-fondos-info-title" style="color:#dc2626">⚠️ Usuario no encontrado</div>' +
          '<div class="ia-fondos-info-row"><span>ID escaneado:</span><strong>' + carnetId + '</strong></div>' +
          '<div style="color:#dc2626;font-size:13px;font-weight:600;margin-top:8px">' +
          'Este código no está registrado en el sistema. Verifica el carnet e intenta de nuevo.</div>';
        info.classList.remove("ia-hidden");
        if (inp) { inp.value = ""; inp.placeholder = "Escanea otro carnet..."; }
        document.getElementById("ia-fondos-carnet-continuar").disabled = true;
        fondosScanTarget = "carnet"; fondosScanBuffer = "";
        return;
      }

      if (resultado.valido === false) {
        // No es supervisora (CJV o VND)
        info.innerHTML =
          '<div class="ia-fondos-info-title" style="color:#dc2626">⚠️ Carnet rechazado</div>' +
          '<div class="ia-fondos-info-row"><span>ID:</span><strong>' + carnetId + '</strong></div>' +
          (resultado.nombre ? '<div class="ia-fondos-info-row"><span>Nombre:</span><strong>' + resultado.nombre + '</strong></div>' : '') +
          '<div class="ia-fondos-info-row"><span>Cargo:</span><strong>' + (resultado.cargo || "—") + '</strong></div>' +
          '<div style="color:#dc2626;font-size:13px;font-weight:600;margin-top:8px">' +
          'Esta persona no es supervisora. Escanea el carnet de una supervisora.</div>';
        info.classList.remove("ia-hidden");
        if (inp) { inp.value = ""; inp.placeholder = "Escanea carnet de supervisora..."; }
        document.getElementById("ia-fondos-carnet-continuar").disabled = true;
        fondosScanTarget = "carnet"; fondosScanBuffer = "";
        return;
      }

      // ── Supervisora válida ──
      fondosCarnetData = data;
      fondosCarnetData.id = carnetId;
      fondosCarnetData.nombre = resultado.nombre || "";

      info.innerHTML =
        '<div class="ia-fondos-info-title">🪪 Supervisora ✅</div>' +
        '<div class="ia-fondos-info-row"><span>ID:</span><strong>' + carnetId + '</strong></div>' +
        (resultado.nombre ? '<div class="ia-fondos-info-row"><span>Nombre:</span><strong>' + resultado.nombre + '</strong></div>' : '') +
        (resultado.cargo ? '<div class="ia-fondos-info-row"><span>Cargo:</span><strong>' + resultado.cargo + '</strong></div>' : '') +
        '<div class="ia-fondos-info-row"><span>Escaneo:</span><strong>' + new Date().toLocaleString() + '</strong></div>';
      info.classList.remove("ia-hidden");
      if (inp) inp.value = resultado.nombre || carnetId;
      document.getElementById("ia-fondos-carnet-continuar").disabled = false;

    } catch(err) {
      // Si falla la validación, permitir avanzar con solo el ID
      console.warn("[IA POS] Error validando supervisora:", err.message);
      fondosCarnetData = data;
      fondosCarnetData.id = carnetId;

      info.innerHTML =
        '<div class="ia-fondos-info-title">🪪 Supervisora</div>' +
        '<div class="ia-fondos-info-row"><span>ID:</span><strong>' + carnetId + '</strong></div>' +
        '<div class="ia-fondos-info-row"><span>Escaneo:</span><strong>' + new Date().toLocaleString() + '</strong></div>' +
        '<div style="color:#b45309;font-size:11px;margin-top:6px">⚠️ No se pudo validar el cargo (sin conexión al servidor)</div>';
      info.classList.remove("ia-hidden");
      if (inp) inp.value = carnetId;
      document.getElementById("ia-fondos-carnet-continuar").disabled = false;
    }
  }
  fondosLiberarFoco();
}

// Captura global: intercepta las teclas del lector antes de que lleguen a SAP
// El lector QR usa layout US, pero el teclado del sistema es español.
// Usamos e.code (tecla física) para traducir al carácter correcto.
function scanKeyToChar(e) {
  const code = e.code || "";
  // Mapa de tecla física → carácter US (sin Shift)
  const baseMap = {
    Minus:"-", Equal:"=", Slash:"/", Period:".", Comma:",",
    Semicolon:";", Quote:"'", BracketLeft:"[", BracketRight:"]",
    Backslash:"\\", Backquote:"`", Space:" "
  };
  // Con Shift
  const shiftMap = {
    Minus:"_", Equal:"+", Slash:"?", Period:">", Comma:"<",
    Semicolon:":", Quote:'"', BracketLeft:"{", BracketRight:"}",
    Backslash:"|", Backquote:"~",
    Digit1:"!", Digit2:"@", Digit3:"#", Digit4:"$", Digit5:"%",
    Digit6:"^", Digit7:"&", Digit8:"*", Digit9:"(", Digit0:")"
  };
  if (e.shiftKey && shiftMap[code]) return shiftMap[code];
  if (baseMap[code]) return baseMap[code];
  if (code.startsWith("Key")) return e.shiftKey ? code[3].toUpperCase() : code[3].toLowerCase();
  if (code.startsWith("Digit")) return code[5];
  if (code.startsWith("Numpad") && code.length === 7) return code[6];
  return (e.key && e.key.length === 1) ? e.key : null;
}

document.addEventListener("keydown", (e) => {
  if (!fondosScanTarget) return;

  e.stopPropagation();
  e.stopImmediatePropagation();

  const ahora = Date.now();
  if (ahora - fondosScanLastTime > 1000) fondosScanBuffer = "";
  fondosScanLastTime = ahora;

  if (e.key === "Enter") {
    e.preventDefault();
    const raw = fondosScanBuffer.trim();
    fondosScanBuffer = "";
    if (raw) fondosProcesarEscaneo(fondosScanTarget, raw);
  } else {
    const ch = scanKeyToChar(e);
    if (ch) {
      e.preventDefault();
      fondosScanBuffer += ch;
      let inputId = "ia-fondos-scan-sobre";
      if (fondosScanTarget === "carnet")  inputId = "ia-fondos-scan-carnet";
      if (fondosScanTarget === "auditor") inputId = "ia-arqueo-auditor";
      const inp = document.getElementById(inputId);
      if (inp) inp.value = fondosScanBuffer;
    }
  }
}, true);

// ── Captura de escaneo para el campo Auditor del arqueo ──
const _auditorInput = document.getElementById("ia-arqueo-auditor");
if (_auditorInput) {
  // Al enfocar el campo, activar la captura del escáner
  _auditorInput.addEventListener("focus", () => {
    fondosScanTarget = "auditor";
    fondosScanBuffer = "";
  }, true);
  // Al salir del campo, desactivar la captura
  _auditorInput.addEventListener("blur", () => {
    if (fondosScanTarget === "auditor") {
      fondosScanTarget = null;
      fondosScanBuffer = "";
    }
  }, true);
}

const DECLARACION_RECEPCION =
  "Confirmo que los fondos limpios fueron verificados y recibidos conforme, " +
  "de acuerdo a los procedimientos internos de la empresa, asumiendo la responsabilidad " +
  "sobre la exactitud del monto y la correcta gestión del efectivo durante el proceso.";

const DECLARACION_ENTREGA =
  "Confirmo que los fondos limpios fueron verificados y entregados conforme, " +
  "de acuerdo a los procedimientos internos de la empresa, asumiendo la responsabilidad " +
  "sobre la exactitud del monto y la correcta gestión del efectivo durante el proceso.";

// Parsear contenido del QR (JSON o separado por |)
function fondosParsearQR(raw) {
  const txt = (raw || "").trim();
  if (!txt) return null;
  // Intentar JSON
  try {
    const obj = JSON.parse(txt);
    if (typeof obj === "object") return obj;
  } catch(_) {}
  // Intentar separado por | : codigo|fecha|hora|usuario|caja
  if (txt.includes("|")) {
    const p = txt.split("|");
    return { codigo: p[0]||"", fecha: p[1]||"", hora: p[2]||"", usuario: p[3]||"", caja: p[4]||"" };
  }
  // Solo código
  return { codigo: txt };
}

function fondosMostrarPaso(pasoId) {
  document.querySelectorAll(".ia-fondos-paso").forEach(p => p.classList.add("ia-hidden"));
  document.getElementById(pasoId).classList.remove("ia-hidden");
}

function fondosActualizarSteps(actual) {
  // Indicador de pasos
  const total = fondosTipo === "entrega" ? 5 : 4;
  const el = document.getElementById("ia-fondos-steps");
  if (el) el.textContent = "Paso " + actual + " de " + total;
}

function fondosRecalcular() {
  let tB=0, tC=0;
  document.querySelectorAll("#ia-fondos-overlay .ia-fondos-item").forEach(row => {
    const d=parseFloat(row.dataset.denom), t=row.dataset.type;
    const v=row.querySelector(".ia-fondos-val-display"), mE=row.querySelector(".ia-fondos-monto-display");
    if (!v || !mE || isNaN(d)) return;
    const q=parseInt(v.dataset.qty||"0"), m=d*q;
    mE.textContent = q>0 ? "= $"+m.toFixed(2) : "";
    if (t==="bill") tB+=m; else tC+=m;
  });
  const g = tB+tC;
  document.getElementById("ia-fondos-total-bills").textContent = "$"+tB.toFixed(2);
  document.getElementById("ia-fondos-total-coins").textContent = "$"+tC.toFixed(2);

  const grandEl = document.getElementById("ia-fondos-total-grand");
  grandEl.textContent = "$"+g.toFixed(2);

  // Mostrar alerta visual si el total no es $100 (informativa, no bloquea)
  const alerta = document.getElementById("ia-fondos-limite-alerta");
  if (g > 0 && g !== 100) {
    grandEl.style.color = "#dc2626";
    if (alerta) {
      alerta.textContent = g > 100
        ? "⚠️ El monto excede los $100.00 (+" + (g-100).toFixed(2) + ")"
        : "⚠️ Faltan $" + (100-g).toFixed(2) + " para completar $100.00";
      alerta.classList.remove("ia-hidden");
    }
  } else {
    grandEl.style.color = "";
    if (alerta) alerta.classList.add("ia-hidden");
  }

  return { totalBills:tB, totalCoins:tC, grand:g };
}

function fondosMostrarTeclado(row) {
  fondosActiveRow = row;
  const d = parseFloat(row.dataset.denom);
  const q = parseInt(row.querySelector(".ia-fondos-val-display").dataset.qty||"0");
  fondosKbdStr = q>0 ? String(q) : "0";
  document.getElementById("ia-fondos-kbd-label").textContent = row.dataset.label;
  document.getElementById("ia-fondos-kbd-qty").textContent   = fondosKbdStr;
  document.getElementById("ia-fondos-kbd-monto").textContent = "= $"+(d*(parseInt(fondosKbdStr)||0)).toFixed(2);
  document.getElementById("ia-fondos-vista-lista").classList.add("ia-hidden");
  document.getElementById("ia-fondos-vista-teclado").classList.remove("ia-hidden");
  fondosActualizarTotalTeclado();
}

function fondosActualizarTotalTeclado() {
  const { grand } = fondosRecalcular();
  const el = document.getElementById("ia-fondos-kbd-running-total");
  if (el) {
    el.textContent = "Total: $" + grand.toFixed(2);
    el.style.color = (grand > 100) ? "#dc2626" : (grand === 100 ? "#15803d" : "");
  }
}

function fondosVolverLista() {
  document.getElementById("ia-fondos-vista-teclado").classList.add("ia-hidden");
  document.getElementById("ia-fondos-vista-lista").classList.remove("ia-hidden");
}

function fondosGuardarDenom() {
  if (!fondosActiveRow) return;
  const q = parseInt(fondosKbdStr)||0;
  const v = fondosActiveRow.querySelector(".ia-fondos-val-display");
  v.textContent = q>0 ? q : "—"; v.dataset.qty = q;
  fondosRecalcular();

  // Buscar la siguiente denominación en la lista
  const allItems = Array.from(document.querySelectorAll("#ia-fondos-overlay .ia-fondos-item"));
  const idx = allItems.indexOf(fondosActiveRow);

  if (idx >= 0 && idx < allItems.length - 1) {
    // Hay siguiente → abrir su teclado automáticamente
    const nextRow = allItems[idx + 1];
    fondosMostrarTeclado(nextRow);
    fondosActualizarTotalTeclado();
    // Scroll para que se vea la fila siguiente cuando vuelva a la lista
    nextRow.scrollIntoView({ behavior: "smooth", block: "center" });
  } else {
    // Era el último → volver a la lista
    fondosVolverLista();
  }
}

function fondosAbrir(tipo) {
  // Validar que hay una cajera conectada al sistema
  const { nombreCajera, codigoAsociado } = extraerInfoCaja();
  if (!nombreCajera || !codigoAsociado) {
    alert("⚠️ No hay un usuario conectado al sistema.\n\nDebe iniciar sesión en la caja antes de registrar fondos.");
    return;
  }

  fondosTipo = tipo;
  fondosSobreData = null; fondosCarnetData = null; fondosMontoIncorrecto = false;
  document.getElementById("ia-fondos-title-txt").textContent =
    tipo === "recepcion" ? "Recepción de Fondos" : "Entrega de Fondos";

  // Reset denominaciones
  document.querySelectorAll("#ia-fondos-overlay .ia-fondos-item").forEach(row => {
    const v = row.querySelector(".ia-fondos-val-display");
    v.textContent = "—"; v.dataset.qty = "0";
    row.querySelector(".ia-fondos-monto-display").textContent = "";
  });
  fondosRecalcular();

  // Reset scans
  document.getElementById("ia-fondos-scan-sobre").value = "";
  document.getElementById("ia-fondos-sobre-info").classList.add("ia-hidden");
  document.getElementById("ia-fondos-sobre-continuar").disabled = true;
  document.getElementById("ia-fondos-sobre-reescanear").classList.add("ia-hidden");
  const carnetInput = document.getElementById("ia-fondos-scan-carnet");
  if (carnetInput) carnetInput.value = "";
  document.getElementById("ia-fondos-carnet-info").classList.add("ia-hidden");
  document.getElementById("ia-fondos-carnet-continuar").disabled = true;
  document.getElementById("ia-fondos-declaracion-check").checked = false;
  document.getElementById("ia-fondos-finalizar").disabled = true;
  document.getElementById("ia-fondos-finalizar").textContent = "Finalizar registro";

  fondosActualizarSteps(1);
  fondosMostrarPaso("ia-fondos-paso-sobre");
  document.getElementById("ia-fondos-overlay").classList.remove("ia-hidden");

  // Mantener foco en el input de escaneo del sobre
  fondosFijarFoco("ia-fondos-scan-sobre");
}

function fondosCerrar() {
  fondosLiberarFoco();
  document.getElementById("ia-fondos-overlay").classList.add("ia-hidden");
}

function fondosMostrarResumen(supervisoraId) {
  const { grand } = fondosRecalcular();
  fondosMontoIncorrecto = (grand !== 100 && grand > 0);
  const sobre = fondosSobreData || {};
  const ahora = new Date();
  const fecha = ahora.toLocaleDateString();
  const hora  = ahora.toLocaleTimeString();
  const label = fondosTipo === "recepcion" ? "Resumen de Recepción" : "Resumen de Entrega";
  const diff  = Math.abs(grand - 100);

  let warningHtml = "";

  if (fondosTipo === "recepcion" && grand < 100 && grand > 0) {
    // Faltante en recepción — con supervisor del último uso del sobre
    const quien = supervisoraId || "la supervisora anterior";
    warningHtml =
      '<div class="ia-fondos-warning ia-fondos-warning--faltante">' +
      '<div class="ia-fondos-warning-title">⚠️ Faltante en fondo — $' + diff.toFixed(2) + '</div>' +
      '<div class="ia-fondos-warning-text">No usar este fondo. <strong>' + quien + '</strong> debe retirar <strong>$' + diff.toFixed(2) + '</strong> de la bóveda como "Retiro" por "Corrección de Fondo".</div>' +
      '</div>';
  } else if (fondosTipo === "recepcion" && grand > 100) {
    warningHtml =
      '<div class="ia-fondos-warning ia-fondos-warning--sobrante">' +
      '<div class="ia-fondos-warning-title">⚠️ Sobrante en fondo — $' + diff.toFixed(2) + '</div>' +
      '<div class="ia-fondos-warning-text">No usar este fondo. Ingresar <strong>$' + diff.toFixed(2) + '</strong> a la bóveda como "Ingreso" por "Sobrante Encontrado".</div>' +
      '</div>';
  } else if (fondosTipo === "entrega" && grand !== 100 && grand > 0) {
    if (grand > 100) {
      warningHtml =
        '<div class="ia-fondos-warning ia-fondos-warning--sobrante">' +
        '<div class="ia-fondos-warning-title">⚠️ Sobrante en fondo — $' + diff.toFixed(2) + '</div>' +
        '<div class="ia-fondos-warning-text">No usar este fondo. Ingresar <strong>$' + diff.toFixed(2) + '</strong> a la bóveda como "Ingreso" por "Sobrante Encontrado".</div>' +
        '</div>';
    } else {
      warningHtml =
        '<div class="ia-fondos-warning ia-fondos-warning--faltante">' +
        '<div class="ia-fondos-warning-title">⚠️ Faltante en fondo — $' + diff.toFixed(2) + '</div>' +
        '<div class="ia-fondos-warning-text">No usar este fondo. Se deben retirar <strong>$' + diff.toFixed(2) + '</strong> de la bóveda como "Retiro" por "Corrección de Fondo".</div>' +
        '</div>';
    }
  }

  const resumen = document.getElementById("ia-fondos-resumen");
  resumen.innerHTML =
    '<div class="ia-fondos-resumen-title">' + label + '</div>' +
    '<div class="ia-fondos-resumen-row"><span>Sobre:</span><strong>' + (sobre.codigo || "—") + '</strong></div>' +
    '<div class="ia-fondos-resumen-row"><span>Fecha:</span><strong>' + fecha + '</strong></div>' +
    '<div class="ia-fondos-resumen-row"><span>Hora:</span><strong>' + hora + '</strong></div>' +
    '<div class="ia-fondos-resumen-row ia-fondos-resumen-total"><span>Total:</span><strong>$' + grand.toFixed(2) + '</strong></div>' +
    warningHtml;
  resumen.classList.remove("ia-hidden");
}

// ── Botones del footer ──
document.getElementById("ia-btn-recepcion").addEventListener("click", (e) => {
  e.stopPropagation(); fondosAbrir("recepcion");
}, true);
document.getElementById("ia-btn-entrega").addEventListener("click", (e) => {
  e.stopPropagation(); fondosAbrir("entrega");
}, true);
document.getElementById("ia-fondos-cerrar").addEventListener("click", (e) => {
  e.stopPropagation(); fondosCerrar();
}, true);

// ── Botón: Volver a escanear sobre ──
document.getElementById("ia-fondos-sobre-reescanear").addEventListener("click", (e) => {
  e.stopPropagation();
  fondosSobreData = null;
  document.getElementById("ia-fondos-scan-sobre").value = "";
  document.getElementById("ia-fondos-sobre-info").classList.add("ia-hidden");
  document.getElementById("ia-fondos-sobre-continuar").disabled = true;
  document.getElementById("ia-fondos-sobre-reescanear").classList.add("ia-hidden");
  fondosFijarFoco("ia-fondos-scan-sobre");
}, true);

document.getElementById("ia-fondos-sobre-continuar").addEventListener("click", (e) => {
  e.stopPropagation();
  fondosLiberarFoco();
  fondosActualizarSteps(2);
  fondosMostrarPaso("ia-fondos-paso-denom");
  fondosVolverLista();
}, true);

// ── PASO 2: Denominaciones ──
document.querySelectorAll("#ia-fondos-overlay .ia-fondos-item").forEach(row => {
  row.addEventListener("click", (e) => { e.stopPropagation(); fondosMostrarTeclado(row); }, true);
});

document.getElementById("ia-fondos-vista-teclado").addEventListener("click", (e) => {
  const btn = e.target.closest(".ia-fnp-btn");
  if (!btn) return;
  e.stopPropagation();
  const n = btn.dataset.n, d = fondosActiveRow ? parseFloat(fondosActiveRow.dataset.denom) : 1;
  if (n === "del") fondosKbdStr = fondosKbdStr.length>1 ? fondosKbdStr.slice(0,-1) : "0";
  else if (n === "ok") { fondosGuardarDenom(); return; }
  else fondosKbdStr = fondosKbdStr==="0" ? n : (fondosKbdStr.length<6 ? fondosKbdStr+n : fondosKbdStr);
  document.getElementById("ia-fondos-kbd-qty").textContent   = fondosKbdStr;
  document.getElementById("ia-fondos-kbd-monto").textContent = "= $"+(d*(parseInt(fondosKbdStr)||0)).toFixed(2);

  // Actualizar total en vivo (total actual + lo que está escribiendo - lo que tenía guardado)
  const savedQty = parseInt((fondosActiveRow ? fondosActiveRow.querySelector(".ia-fondos-val-display").dataset.qty : "0") || "0");
  const typingQty = parseInt(fondosKbdStr) || 0;
  const { grand } = fondosRecalcular();
  const liveTotal = grand - (savedQty * d) + (typingQty * d);
  const rtEl = document.getElementById("ia-fondos-kbd-running-total");
  if (rtEl) {
    rtEl.textContent = "Total: $" + liveTotal.toFixed(2);
    rtEl.style.color = (liveTotal > 100) ? "#dc2626" : (liveTotal === 100 ? "#15803d" : "");
  }
}, true);

document.getElementById("ia-fondos-kbd-volver").addEventListener("click", (e) => {
  e.stopPropagation(); fondosVolverLista();
}, true);

document.getElementById("ia-fondos-denom-completado").addEventListener("click", async (e) => {
  e.stopPropagation();
  if (fondosTipo === "entrega") {
    fondosActualizarSteps(4);
    fondosMostrarPaso("ia-fondos-paso-carnet");
    fondosFijarFoco("ia-fondos-scan-carnet");
  } else {
    // Recepción: si hay faltante, consultar quién fue la última supervisora
    const { grand } = fondosRecalcular();
    let supervisoraId = null;

    if (grand < 100 && grand > 0 && fondosSobreData && fondosSobreData.codigo) {
      try {
        const btn = document.getElementById("ia-fondos-denom-completado");
        btn.disabled = true; btn.textContent = "Consultando...";
        const r = await fetch(WEBHOOK_FONDOS_CONSULTA, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sobreCodigo: fondosSobreData.codigo })
        });
        const data = await r.json();
        supervisoraId = data.supervisoraNombre || data.supervisoraId || data.SupervisoraID || null;
        btn.disabled = false; btn.textContent = "Completado →";
      } catch(err) {
        console.warn("[IA POS] No se pudo consultar supervisora:", err.message);
        const btn = document.getElementById("ia-fondos-denom-completado");
        btn.disabled = false; btn.textContent = "Completado →";
      }
    }

    fondosMostrarResumen(supervisoraId);
    document.getElementById("ia-fondos-declaracion-texto").textContent = DECLARACION_RECEPCION;
    fondosActualizarSteps(4);
    fondosMostrarPaso("ia-fondos-paso-declaracion");
  }
}, true);

// ── PASO 4 (entrega): el escaneo del carnet lo maneja la captura global ──

document.getElementById("ia-fondos-carnet-volver").addEventListener("click", (e) => {
  e.stopPropagation();
  fondosLiberarFoco();
  fondosActualizarSteps(2);
  fondosMostrarPaso("ia-fondos-paso-denom");
  fondosVolverLista();
}, true);

document.getElementById("ia-fondos-carnet-continuar").addEventListener("click", (e) => {
  e.stopPropagation();
  fondosLiberarFoco();
  fondosMostrarResumen();
  document.getElementById("ia-fondos-declaracion-texto").textContent = DECLARACION_ENTREGA;
  fondosActualizarSteps(5);
  fondosMostrarPaso("ia-fondos-paso-declaracion");
}, true);

// ── Volver desde declaración a denominaciones ──
document.getElementById("ia-fondos-volver-denom").addEventListener("click", (e) => {
  e.stopPropagation();
  document.getElementById("ia-fondos-declaracion-check").checked = false;
  document.getElementById("ia-fondos-finalizar").disabled = true;
  document.getElementById("ia-fondos-resumen").classList.add("ia-hidden");
  fondosActualizarSteps(2);
  fondosMostrarPaso("ia-fondos-paso-denom");
  fondosVolverLista();
}, true);

// ── PASO FINAL: Declaración ──
document.getElementById("ia-fondos-declaracion-check").addEventListener("change", (e) => {
  if (fondosMontoIncorrecto) {
    // Si hay alerta de monto, no dejar finalizar aunque marque el checkbox
    document.getElementById("ia-fondos-finalizar").disabled = true;
  } else {
    document.getElementById("ia-fondos-finalizar").disabled = !e.target.checked;
  }
}, true);

document.getElementById("ia-fondos-finalizar").addEventListener("click", async (e) => {
  e.stopPropagation();
  const btn = document.getElementById("ia-fondos-finalizar");
  btn.disabled = true; btn.textContent = "Guardando...";
  console.log("[IA POS] Finalizar clickeado");

  const { idCaja, numBase, hostnameFull, correo, nombreCajera, codigoAsociado } = extraerInfoCaja();
  console.log("[IA POS] Info caja:", { idCaja, numBase, hostnameFull, correo });
  const { totalBills, totalCoins, grand } = fondosRecalcular();
  console.log("[IA POS] Totales:", { totalBills, totalCoins, grand });

  const detalle = {};
  document.querySelectorAll("#ia-fondos-overlay .ia-fondos-item").forEach(row => {
    const dd=row.dataset.denom, tt=row.dataset.type;
    const vEl = row.querySelector(".ia-fondos-val-display");
    if (!vEl || !dd || !tt) return;
    const qq=parseInt(vEl.dataset.qty||"0");
    detalle[(tt==="bill"?"billete_":"moneda_")+dd.replace(".","_")] = qq;
  });
  console.log("[IA POS] Detalle:", detalle);
  console.log("[IA POS] Sobre:", fondosSobreData);
  console.log("[IA POS] Carnet:", fondosCarnetData);

  const payload = {
    sessionId:      "fl-" + Math.random().toString(36).substring(2),
    tipo:           fondosTipo,
    timestamp:      new Date().toISOString(),
    idCaja, numBase, hostname: hostnameFull, requester: correo,
    nombreCajera:   nombreCajera   || "",
    codigoAsociado: codigoAsociado || "",
    sobre:          fondosSobreData || {},
    supervisora:    fondosCarnetData || null,
    totalBilletes:  totalBills.toFixed(2),
    totalMonedas:   totalCoins.toFixed(2),
    totalGeneral:   grand.toFixed(2),
    detalle,
    declaracionAceptada: true,
    url: location.href
  };

  try {
    console.log("[IA POS] Enviando a:", WEBHOOK_FONDOS);
    console.log("[IA POS] Payload:", JSON.stringify(payload).substring(0, 300));
    const r = await fetch(WEBHOOK_FONDOS, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const txt = await r.text();
    let msg = "Registro guardado correctamente.";
    try { const j = JSON.parse(txt); if (j.estado==="error") throw new Error(j.message); msg = j.message || msg; } catch(_) {}

    // Anotar el movimiento localmente para que el arqueo sepa si el fondo
    // sigue en la caja. DESPUES de que el webhook confirmo, para no
    // registrar un movimiento que en realidad fallo.
    await fondosRegistrarMovimiento(fondosTipo, grand);

    const label = fondosTipo === "recepcion" ? "Recepción" : "Entrega";
    document.getElementById("ia-fondos-exito-content").innerHTML =
      '<div class="ia-fondos-exito-icon">✅</div>' +
      '<div class="ia-fondos-exito-title">' + label + ' registrada con éxito</div>' +
      '<div class="ia-fondos-exito-sub">Sobre: <strong>' + (fondosSobreData.codigo||"—") + '</strong><br>' +
        'Total: <strong>$' + grand.toFixed(2) + '</strong></div>';
    fondosActualizarSteps("");
    fondosMostrarPaso("ia-fondos-exito");
    setTimeout(() => fondosCerrar(), 3000);
  } catch(err) {
    btn.disabled = false; btn.textContent = "Finalizar registro";
    alert("Error al guardar: " + err.message);
  }
}, true);

// ══════════════════════════════════════════
// ARQUEO SORPRESIVO
// ══════════════════════════════════════════
let arqueoActiveRow = null;
let arqueoKbdStr    = "0";
let arqueoEsperado  = 0;      // efectivo esperado según ventas
let arqueoVentas    = null;   // respuesta completa de la consulta

function arqueoIniciar() {
  // Validar que hay alguien logueado en la caja
  const { idCaja, codigoAsociado, nombreCajera } = extraerInfoCaja();
  if (!nombreCajera && !codigoAsociado) {
    alert("⚠️ No hay un usuario conectado al sistema.\n\nDebe haber una cajera logueada en la caja para realizar el arqueo.");
    return false;
  }
  const hoy = new Date().toISOString().split("T")[0];
  document.getElementById("ia-arqueo-fecha").value  = hoy;
  document.getElementById("ia-arqueo-caja").value   = idCaja || "";
  document.getElementById("ia-arqueo-auditor").value = "";
  document.getElementById("ia-arqueo-error").classList.add("ia-hidden");

  // Reset conteo
  document.querySelectorAll("#ia-arqueo-paso-conteo .ia-fondos-item").forEach(row => {
    const v = row.querySelector(".ia-arqueo-val-display");
    v.textContent = "—"; v.dataset.qty = "0";
    row.querySelector(".ia-arqueo-monto-display").textContent = "";
  });
  arqueoEsperado = 0; arqueoVentas = null; arqueoActiveRow = null;
  // Tambien el fondo: si no se limpia, un arqueo posterior podria enviar
  // el dato del anterior si por algun camino no se recalcula.
  arqueoFondoInfo = null;

  // Reset botón guardar
  var btnFin = document.getElementById("ia-arqueo-finalizar");
  if (btnFin) { btnFin.disabled = false; btnFin.textContent = "Guardar arqueo"; }

  document.getElementById("ia-arqueo-paso-datos").classList.remove("ia-hidden");
  document.getElementById("ia-arqueo-paso-conteo").classList.add("ia-hidden");
  document.getElementById("ia-arqueo-exito").classList.add("ia-hidden");

  // Auto-focus en el campo del auditor para que el escáner capture directo
  setTimeout(() => {
    const inp = document.getElementById("ia-arqueo-auditor");
    if (inp) { inp.focus(); fondosScanTarget = "auditor"; fondosScanBuffer = ""; }
  }, 300);
  return true;
}

function arqueoRecalcular() {
  let contado = 0;
  document.querySelectorAll("#ia-arqueo-paso-conteo .ia-fondos-item").forEach(row => {
    const d = parseFloat(row.dataset.adenom);
    const v = row.querySelector(".ia-arqueo-val-display");
    const mE = row.querySelector(".ia-arqueo-monto-display");
    const q = parseInt(v.dataset.qty || "0");
    const m = d * q;
    mE.textContent = q > 0 ? "= $" + m.toFixed(2) : "";
    contado += m;
  });
  document.getElementById("ia-arqueo-total-contado").textContent = "$" + contado.toFixed(2);
  document.getElementById("ia-arqueo-total-esperado").textContent = "$" + arqueoEsperado.toFixed(2);

  const dif = contado - arqueoEsperado;
  const difEl = document.getElementById("ia-arqueo-diferencia");
  const lblEl = document.getElementById("ia-arqueo-dif-label");
  difEl.textContent = "$" + Math.abs(dif).toFixed(2);
  if (Math.abs(dif) < 0.005) {
    lblEl.textContent = "CUADRE EXACTO"; difEl.style.color = "#4ade80";
  } else if (dif > 0) {
    lblEl.textContent = "SOBRANTE"; difEl.style.color = "#fcd34d";
  } else {
    lblEl.textContent = "FALTANTE"; difEl.style.color = "#fca5a5";
  }
  return { contado, dif };
}

function arqueoActualizarTotalTeclado() {
  let contado = 0;
  document.querySelectorAll("#ia-arqueo-paso-conteo .ia-fondos-item").forEach(row => {
    const d = parseFloat(row.dataset.adenom);
    const q = parseInt(row.querySelector(".ia-arqueo-val-display").dataset.qty || "0");
    contado += d * q;
  });
  // Sumar lo que se está tecleando ahora (reemplaza el valor guardado de la fila activa)
  if (arqueoActiveRow) {
    const dA = parseFloat(arqueoActiveRow.dataset.adenom);
    const savedQty = parseInt(arqueoActiveRow.querySelector(".ia-arqueo-val-display").dataset.qty || "0");
    const typingQty = parseInt(arqueoKbdStr) || 0;
    contado = contado - (savedQty * dA) + (typingQty * dA);
  }
  const el = document.getElementById("ia-arqueo-kbd-running");
  if (el) el.textContent = "Contado: $" + contado.toFixed(2);
}

function arqueoMostrarTeclado(row) {
  arqueoActiveRow = row;
  const d = parseFloat(row.dataset.adenom);
  const q = parseInt(row.querySelector(".ia-arqueo-val-display").dataset.qty || "0");
  arqueoKbdStr = q > 0 ? String(q) : "0";
  document.getElementById("ia-arqueo-kbd-label").textContent = row.dataset.alabel;
  document.getElementById("ia-arqueo-kbd-qty").textContent = arqueoKbdStr;
  document.getElementById("ia-arqueo-kbd-monto").textContent = "= $" + (d * (parseInt(arqueoKbdStr)||0)).toFixed(2);
  document.getElementById("ia-arqueo-vista-lista").classList.add("ia-hidden");
  document.getElementById("ia-arqueo-vista-teclado").classList.remove("ia-hidden");
  arqueoActualizarTotalTeclado();
}

function arqueoVolverLista() {
  document.getElementById("ia-arqueo-vista-teclado").classList.add("ia-hidden");
  document.getElementById("ia-arqueo-vista-lista").classList.remove("ia-hidden");
}

function arqueoGuardarDenom() {
  if (!arqueoActiveRow) return;
  const q = parseInt(arqueoKbdStr) || 0;
  const v = arqueoActiveRow.querySelector(".ia-arqueo-val-display");
  v.textContent = q > 0 ? q : "—"; v.dataset.qty = q;
  arqueoRecalcular();
  // Avanzar a la siguiente denominación
  const allItems = Array.from(document.querySelectorAll("#ia-arqueo-paso-conteo .ia-fondos-item"));
  const idx = allItems.indexOf(arqueoActiveRow);
  if (idx >= 0 && idx < allItems.length - 1) {
    arqueoMostrarTeclado(allItems[idx + 1]);
  } else {
    arqueoVolverLista();
  }
}

// ── Consultar ventas ──
document.getElementById("ia-arqueo-consultar").addEventListener("click", async (e) => {
  e.stopPropagation();
  const btn = document.getElementById("ia-arqueo-consultar");
  const err = document.getElementById("ia-arqueo-error");
  const fecha   = document.getElementById("ia-arqueo-fecha").value;
  const caja    = document.getElementById("ia-arqueo-caja").value.trim();
  const auditor = document.getElementById("ia-arqueo-auditor").value.trim();

  if (!fecha || !caja || !auditor) {
    err.textContent = "⚠️ Completa todos los campos antes de continuar.";
    err.classList.remove("ia-hidden");
    return;
  }

  // Validar que el auditor esté en la lista autorizada
  const auditorValido = AUDITORES_AUTORIZADOS.find(a => a.id === auditor);
  if (!auditorValido) {
    err.textContent = "⚠️ ID de auditor no autorizado. Solo personal de Auditoría Interna puede realizar arqueos.";
    err.classList.remove("ia-hidden");
    return;
  }
  err.classList.add("ia-hidden");
  btn.disabled = true; btn.textContent = "Consultando...";

  try {
    const resp = await fetch(WEBHOOK_ARQUEO_CONSULTA, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idCaja: caja, fecha })
    });
    const data = await resp.json();
    arqueoVentas = data;
    arqueoEsperado = parseFloat(data.efectivo || 0);

    // Mostrar resumen de ventas por forma de pago
    let filas = "";
    (data.detalle || []).forEach(d => {
      var rowClass = '';
      if (d.codigo === 'DEV') rowClass = ' ia-arqueo-venta-dev';
      else if (d.codigo === '9' || d.codigo === '09' || d.nombre.toUpperCase() === 'EFECTIVO') rowClass = ' ia-arqueo-venta-efectivo-row';
      filas += '<div class="ia-arqueo-venta-row' + rowClass + '"><span>' + d.nombre + '</span><strong>$' + parseFloat(d.total).toFixed(2) + '</strong></div>';
    });
    // ── FONDO EN CAJA AL MOMENTO DEL ARQUEO ──
    // El backend asume el fondo y ya lo incluye en data.efectivo. Si la
    // caja entrego su fondo esa tarde, esos $100 no estan y el arqueo
    // salia con un faltante inexistente.
    const fondoBackend = parseFloat(data.fondoInicial != null ? data.fondoInicial : 100);
    const horaArqueo = new Date().toTimeString().slice(0, 8);
    const fondoLocal = await fondosCalcularEsperado(horaArqueo);

    let fondoInicial = fondoBackend;
    let notaFondo = "";

    if (fondoLocal.confiable) {
      fondoInicial = fondoLocal.monto;
      // Se ajusta por la DIFERENCIA en vez de recalcular, para respetar la
      // formula del backend (que puede contemplar devoluciones u otros).
      arqueoEsperado = arqueoEsperado + (fondoInicial - fondoBackend);
      notaFondo = '<div class="ia-arqueo-venta-row" style="font-size:11px;color:#6b7280;">' +
                  '<span>' + fondoLocal.detalle + '</span><span></span></div>';
    } else {
      // Sin registros no se afirma nada: se conserva el valor del backend
      // y se avisa. Asumir $0 crearia un SOBRANTE falso.
      notaFondo = '<div class="ia-arqueo-venta-row" style="font-size:11px;color:#b45309;">' +
                  '<span>⚠️ ' + fondoLocal.detalle + '. Verifique si el fondo está en caja.</span><span></span></div>';
    }

    arqueoFondoInfo = {
      monto: fondoInicial,
      detalle: fondoLocal.detalle,
      confiable: fondoLocal.confiable,
      fondoBackend: fondoBackend
    };

    const ventasEfectivo = parseFloat(data.ventasEfectivo || 0);
    document.getElementById("ia-arqueo-ventas-resumen").innerHTML =
      '<div class="ia-arqueo-ventas-title">💳 Ventas registradas hoy</div>' +
      filas +
      '<div class="ia-arqueo-venta-row ia-arqueo-venta-total"><span>Total general</span><strong>$' + parseFloat(data.totalGeneral||0).toFixed(2) + '</strong></div>' +
      '<div class="ia-arqueo-ventas-title" style="margin-top:12px">💵 Efectivo esperado en caja</div>' +
      '<div class="ia-arqueo-venta-row"><span>Fondo en caja</span><strong>$' + fondoInicial.toFixed(2) + '</strong></div>' +
      notaFondo +
      '<div class="ia-arqueo-venta-row"><span>Ventas en efectivo</span><strong>$' + ventasEfectivo.toFixed(2) + '</strong></div>' +
      '<div class="ia-arqueo-venta-row ia-arqueo-venta-efectivo"><span>Total efectivo esperado</span><strong>$' + arqueoEsperado.toFixed(2) + '</strong></div>';

    arqueoRecalcular();
    document.getElementById("ia-arqueo-paso-datos").classList.add("ia-hidden");
    document.getElementById("ia-arqueo-paso-conteo").classList.remove("ia-hidden");
    arqueoVolverLista();
  } catch(error) {
    err.textContent = "⚠️ Error al consultar ventas: " + error.message;
    err.classList.remove("ia-hidden");
  }
  btn.disabled = false; btn.textContent = "Consultar ventas →";
}, true);

// ── Conteo: clicks en denominaciones ──
document.querySelectorAll("#ia-arqueo-paso-conteo .ia-fondos-item").forEach(row => {
  row.addEventListener("click", (e) => { e.stopPropagation(); arqueoMostrarTeclado(row); }, true);
});

// ── Teclado numérico ──
document.getElementById("ia-arqueo-vista-teclado").addEventListener("click", (e) => {
  const btn = e.target.closest(".ia-fnp-btn");
  if (!btn) return;
  e.stopPropagation();
  const n = btn.dataset.an, d = arqueoActiveRow ? parseFloat(arqueoActiveRow.dataset.adenom) : 1;
  if (n === "del") arqueoKbdStr = arqueoKbdStr.length > 1 ? arqueoKbdStr.slice(0,-1) : "0";
  else if (n === "ok") { arqueoGuardarDenom(); return; }
  else arqueoKbdStr = arqueoKbdStr === "0" ? n : (arqueoKbdStr.length < 6 ? arqueoKbdStr + n : arqueoKbdStr);
  document.getElementById("ia-arqueo-kbd-qty").textContent = arqueoKbdStr;
  document.getElementById("ia-arqueo-kbd-monto").textContent = "= $" + (d * (parseInt(arqueoKbdStr)||0)).toFixed(2);
  arqueoActualizarTotalTeclado();
}, true);

document.getElementById("ia-arqueo-kbd-volver").addEventListener("click", (e) => {
  e.stopPropagation(); arqueoVolverLista();
}, true);

document.getElementById("ia-arqueo-volver-datos").addEventListener("click", (e) => {
  e.stopPropagation();
  document.getElementById("ia-arqueo-paso-conteo").classList.add("ia-hidden");
  // Reset botón guardar
  var btnFin = document.getElementById("ia-arqueo-finalizar");
  if (btnFin) { btnFin.disabled = false; btnFin.textContent = "Guardar arqueo"; }

  document.getElementById("ia-arqueo-paso-datos").classList.remove("ia-hidden");
}, true);

// ── Guardar arqueo ──
document.getElementById("ia-arqueo-finalizar").addEventListener("click", async (e) => {
  e.stopPropagation();
  const btn = document.getElementById("ia-arqueo-finalizar");
  btn.disabled = true; btn.textContent = "Guardando...";

  const { contado, dif } = arqueoRecalcular();
  const { hostnameFull, codigoAsociado, nombreCajera, numBase } = extraerInfoCaja();
  const fecha   = document.getElementById("ia-arqueo-fecha").value;
  const caja    = document.getElementById("ia-arqueo-caja").value.trim();
  const auditor = document.getElementById("ia-arqueo-auditor").value.trim();
  const auditorInfo = AUDITORES_AUTORIZADOS.find(a => a.id === auditor);

  const detalle = {};
  document.querySelectorAll("#ia-arqueo-paso-conteo .ia-fondos-item").forEach(row => {
    const dd = row.dataset.adenom, tt = row.dataset.atype;
    const qq = parseInt(row.querySelector(".ia-arqueo-val-display").dataset.qty || "0");
    detalle[(tt === "bill" ? "billete_" : "moneda_") + dd.replace(".", "_")] = qq;
  });

  let resultado = "CUADRE";
  if (Math.abs(dif) >= 0.005) resultado = dif > 0 ? "SOBRANTE" : "FALTANTE";

  const payload = {
    sessionId: "arq-" + Math.random().toString(36).substring(2),
    timestamp: new Date().toISOString(),
    fecha, idCaja: caja, base: numBase || "", idCajero: codigoAsociado || "", nombreCajera: nombreCajera || "", cajeros: arqueoVentas ? (arqueoVentas.cajeros || "") : "", auditor, auditorNombre: auditorInfo ? auditorInfo.nombre : auditor,
    hostname: hostnameFull,
    // El fondo REALMENTE usado, mas el motivo, para auditarlo despues.
    fondoInicial: (arqueoFondoInfo ? arqueoFondoInfo.monto
                                   : (arqueoVentas && arqueoVentas.fondoInicial != null ? arqueoVentas.fondoInicial : 100)),
    fondoDetalle: (arqueoFondoInfo ? arqueoFondoInfo.detalle : ""),
    fondoVerificado: (arqueoFondoInfo ? arqueoFondoInfo.confiable : false),
    ventasEfectivo: (arqueoVentas && arqueoVentas.ventasEfectivo != null ? arqueoVentas.ventasEfectivo : 0),
    efectivoEsperado: arqueoEsperado.toFixed(2),
    efectivoContado: contado.toFixed(2),
    diferencia: dif.toFixed(2),
    resultado,
    ventasDetalle: arqueoVentas ? arqueoVentas.detalle : [],
    totalVentas: arqueoVentas ? arqueoVentas.totalGeneral : 0,
    detalleConteo: detalle,
    url: location.href
  };

  try {
    const resp = await fetch(WEBHOOK_ARQUEO_GUARDAR, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    await resp.text();
    const color = resultado === "CUADRE" ? "#15803d" : (resultado === "SOBRANTE" ? "#b45309" : "#dc2626");
    document.getElementById("ia-arqueo-exito-content").innerHTML =
      '<div class="ia-fondos-exito-icon">' + (resultado === "CUADRE" ? "✅" : "⚠️") + '</div>' +
      '<div class="ia-fondos-exito-title" style="color:' + color + '">Arqueo registrado — ' + resultado + '</div>' +
      '<div class="ia-fondos-exito-sub">Contado: <strong>$' + contado.toFixed(2) + '</strong><br>' +
        'Esperado: <strong>$' + arqueoEsperado.toFixed(2) + '</strong><br>' +
        'Diferencia: <strong>$' + Math.abs(dif).toFixed(2) + '</strong></div>';
    document.getElementById("ia-arqueo-paso-conteo").classList.add("ia-hidden");
    document.getElementById("ia-arqueo-exito").classList.remove("ia-hidden");
    setTimeout(() => { showView("ia-view-main"); }, 4000);
  } catch(error) {
    btn.disabled = false; btn.textContent = "Guardar arqueo";
    alert("Error al guardar el arqueo: " + error.message);
  }
}, true);

}

    })(); // fin ASISTENTE IA
  }

  // ==========================================================
  // MODULO 2: PUBLICIDAD DINAMICA (sidecar-ads)
  // Corre solo en la pantalla del cliente, identificada por la URL
  // del sidecar (/sidecarscreen/). El video depende de esa URL para
  // cargar la playlist, por eso este modulo si va atado a la ruta.
  // ==========================================================
  var __esSidecarURL = location.pathname.indexOf('/sidecarscreen/') !== -1;
  if (__esSidecarURL) {
    (function () {
(function () {
  'use strict';

  const CONFIG = {
    API_URL: 'https://tovastreaming.grupotova.local',
    REFRESH_INTERVAL_MS: 1 * 60 * 1000,
    HEARTBEAT_INTERVAL_MS: 30 * 1000,
    SAFETY_CHECK_MS: 1500,
    // La encuesta del POS dura 20s. Si el modo encuesta se prolonga mucho
    // mas, la deteccion se quedo trabada: se fuerza la salida para que la
    // pantalla del cliente no quede sin video indefinidamente.
    MAX_MODO_ENCUESTA_MS: 60000,
    DEBUG: true,

    // POSICION DEL VIDEO EN MODO MINI (durante venta)
    MINI_WIDTH_PERCENT: 34,
    MINI_HEIGHT_PX: 723,
    MINI_RIGHT_PX: 0,
    MINI_TOP_PX: 0,

    // ============================================================
    // SINCRONIA ENTRE CAJAS
    // Todas las pantallas de la tienda reproducen el mismo video en el
    // mismo momento. No hace falta un servidor coordinador: cada caja
    // calcula la posicion del ciclo a partir de la hora del SERVIDOR
    // (se deriva del campo generatedAt de la playlist), asi que el
    // resultado es identico en todas sin depender del reloj local.
    // Al no guardar estado, funciona igual en modo incognito.
    // ============================================================
    // ACTIVADA. Se apago en su momento porque el corrector oscilaba, y esa
    // oscilacion tenia una causa concreta: el largo del ciclo se calculaba
    // con duraciones medidas localmente y no coincidia entre cajas. Ver el
    // comentario de posicionEnCiclo(). Con eso corregido es estable.
    SYNC_HABILITADO: true,
    // Ambos modos van sincronizados. El mini tambien, porque las dos
    // playlists reproducen de forma continua en paralelo (solo cambia
    // cual se ve), asi que el mini ya "entra" a un ciclo en curso.
    // Sincronizarlo hace que todas las cajas en venta muestren lo mismo.
    SYNC_MODOS: ['fullscreen', 'mini'],
    SYNC_CHECK_MS: 5000,        // cada cuanto se revisa la deriva
    // Limites para que la correccion de sincronia NUNCA congele el video.
    // Principio: un video desincronizado es mucho mejor que uno congelado.
    SYNC_SEEK_COOLDOWN_MS: 20000, // minimo entre saltos, evita el thrash
    SYNC_MAX_SEEKS: 3,            // tras N saltos sin exito, deja de saltar
    // Tiempo minimo que un video debe permanecer antes de que la
    // sincronia pueda cambiarlo. Red de seguridad contra la oscilacion:
    // sin esto, un ciclo mal calculado hacia que cambiara de video varias
    // veces por segundo, interrumpiendo cada play() con el siguiente.
    SYNC_MIN_PERMANENCIA_MS: 3000,
    // Pausar el carrusel del POS cuando nuestro video lo tapa por completo.
    // TopManage reproduce su propio carrusel en la pantalla del cliente
    // (se ve en consola: "Slide programado para 8000ms"). En modo
    // fullscreen nuestro overlay lo cubre entero, asi que seguir
    // decodificando ese contenido es trabajo puro perdido que compite por
    // CPU con nuestro video. En modo mini NO se toca, porque ahi la
    // pantalla del POS si es visible.
    PAUSAR_MEDIA_POS: true,

    // Watchdog de congelamiento
    WATCHDOG_MS: 2000,            // cada cuanto se revisa si el video avanza
    STALL_MS: 6000,               // congelado DESPUES de haber reproducido
    // Paciencia para la primera carga. Un video de 40MB por un enlace
    // cargado puede tardar bastante: si se interviene antes, el load()
    // aborta la descarga y el video nunca llega a cargar.
    CARGA_PACIENCIA_MS: 60000,    // 60s antes de siquiera avisar
    CARGA_MAX_MS: 180000,         // 3 min: recien ahi se intenta otra cosa
    // Rebuffering: cuando la red no alcanza para el bitrate del video, en
    // vez de micro-trabarse cada pocos segundos conviene pausar, acumular
    // buffer y despues reproducir corrido.
    REBUFFER_TRAS_N: 2,           // inanidiciones seguidas antes de pausar
    REBUFFER_SEG: 8,              // segundos de buffer a acumular
    REBUFFER_MAX_MS: 45000,       // tope de espera acumulando
    SYNC_UMBRAL_SEEK: 0.75,     // desfase (s) a partir del cual se salta
    SYNC_UMBRAL_RATE: 0.15,     // desfase (s) a partir del cual se corrige con velocidad
    SYNC_RATE_AJUSTE: 0.02      // 2% de ajuste de velocidad (imperceptible)
  };

  function log(...args) { if (CONFIG.DEBUG) console.log('[TIA Ads]', ...args); }
  function logError(...args) { console.error('[TIA Ads]', ...args); }

  log('Iniciando sistema de publicidad v4.0 (2 overlays paralelos)...');

  // ============================================================
  // ESTADO
  // ============================================================
  let cadena              = null;
  let terminal            = null;

  const modos = {
    fullscreen: { pantallaId: null, token: null, playlist: [], indice: 0 },
    mini:       { pantallaId: null, token: null, playlist: [], indice: 0 }
  };
  let modoPlaylistActivo  = 'fullscreen';
  let estadoActual        = null;
  let inicioModoEncuesta  = 0;
  let ultimaDeteccion     = null;
  let deteccionesConsecutivas = 0;

  // ============================================================
  // RELOJ DEL SERVIDOR (base de la sincronia entre cajas)
  // ============================================================
  // offsetReloj = cuanto hay que sumarle al reloj local para obtener la
  // hora del servidor. Se calcula con generatedAt de la playlist y la
  // mitad del viaje ida/vuelta de la peticion.
  let offsetReloj = 0;
  let offsetCalibrado = false;
  let syncTimer = null;
  // Huella de la playlist: si cambia la campana, hay que resincronizar
  const huellaPlaylist = { fullscreen: null, mini: null };
  // Duraciones reales medidas (solo para avisar si no coinciden con la API)
  const duracionesMedidas = {};

  function ahoraServidorMs() {
    return Date.now() + offsetReloj;
  }

  // Solo se aceptan mediciones con viaje corto. Una respuesta lenta hace
  // que el termino rtt/2 sea enorme y produzca un offset falso: en
  // produccion un rtt de 11.7s genero un offset de +5.5s, un desfase
  // fantasma de 9.75s y un salto innecesario del video.
  // Es el mismo criterio que usa NTP: la muestra de menor latencia es la
  // mas confiable.
  const RTT_MAX_ACEPTABLE = 1500;   // ms
  const muestrasReloj = [];         // ultimas mediciones válidas
  const MAX_MUESTRAS = 5;

  function calibrarReloj(generatedAt, tIda, tVuelta) {
    if (!generatedAt) return;
    const servidorMs = new Date(generatedAt).getTime();
    if (isNaN(servidorMs)) return;
    const rtt = tVuelta - tIda;

    if (rtt > RTT_MAX_ACEPTABLE) {
      log(`Reloj: descarto la medicion, viaje muy lento (rtt=${rtt}ms). ` +
          `Mantengo offset=${Math.round(offsetReloj)}ms`);
      return;
    }

    // generatedAt corresponde aproximadamente a la mitad del viaje.
    // La hora del servidor "ahora" (en tVuelta) es generatedAt + rtt/2.
    const medido = (servidorMs + rtt / 2) - tVuelta;

    muestrasReloj.push({ offset: medido, rtt: rtt, ts: Date.now() });
    while (muestrasReloj.length > MAX_MUESTRAS) muestrasReloj.shift();

    // Se usa la muestra de MENOR latencia: es la menos contaminada.
    let mejor = muestrasReloj[0];
    for (const m of muestrasReloj) if (m.rtt < mejor.rtt) mejor = m;

    const nuevoOffset = mejor.offset;
    const cambio = nuevoOffset - offsetReloj;
    offsetReloj = nuevoOffset;
    offsetCalibrado = true;
    log(`Reloj calibrado: offset=${Math.round(offsetReloj)}ms ` +
        `(rtt de esta medicion ${rtt}ms, se usa la mejor de ${muestrasReloj.length}: ${mejor.rtt}ms)` +
        (Math.abs(cambio) > 1000 ? ` [ajuste de ${Math.round(cambio)}ms]` : ''));

    // Guardarlo para que la sincronia aguante caidas de red.
    // Sin esto, si Chrome se reinicia sin conexion se perderia el offset
    // y cada caja usaria su reloj local (se desincronizarian entre si).
    try {
      chrome.storage.local.set({
        tia_sync_offset: { offset: offsetReloj, at: Date.now() }
      });
    } catch (e) {}
  }

  // Recupera el offset guardado. Se usa al arrancar, ANTES del primer
  // fetch, para que la sincronia funcione incluso si la red esta caida.
  async function restaurarOffsetGuardado() {
    if (!CONFIG.SYNC_HABILITADO) return;
    try {
      const g = await chrome.storage.local.get('tia_sync_offset');
      const s = g && g.tia_sync_offset;
      // Un offset viejo puede estar mal: si w32time corrigio el reloj de
      // Windows mientras la caja estuvo apagada, la diferencia guardada ya
      // no aplica. Se descarta pasadas 24h.
      const edadH = (Date.now() - (s && s.at ? s.at : 0)) / 3600000;
      if (s && typeof s.offset === 'number' && edadH > 24) {
        log(`Offset guardado descartado por antiguedad (${edadH.toFixed(1)}h). ` +
            `Uso el reloj local hasta el primer fetch.`);
      } else if (s && typeof s.offset === 'number') {
        offsetReloj = s.offset;
        offsetCalibrado = true;
        const horas = ((Date.now() - (s.at || 0)) / 3600000).toFixed(1);
        log(`Offset de reloj recuperado del cache: ${Math.round(offsetReloj)}ms ` +
            `(guardado hace ${horas}h). Se recalibra al primer fetch exitoso.`);
      }
    } catch (e) {}
  }

  function syncActivoPara(modo) {
    return CONFIG.SYNC_HABILITADO && CONFIG.SYNC_MODOS.indexOf(modo) !== -1;
  }

  // Duracion que se usa para el calculo del ciclo.
  // Se usa SIEMPRE la declarada por la API: es la unica garantia de que
  // todas las cajas calculen exactamente lo mismo. La medida se usa solo
  // para avisar en consola si la metadata esta mal.
  // ¿Estan medidas TODAS las duraciones de esta playlist?
  // Es la clave para que el ciclo sea estable: mezclar duraciones reales
  // con declaradas cambia el largo del ciclo cada vez que se mide una
  // nueva, la posicion calculada salta y el corrector empieza a cambiar
  // de video sin parar (oscilacion entre el 1 y el 2).
  function todasMedidas(playlist) {
    for (const it of playlist) {
      if (!it || !it.url) continue;
      const tipo = (it.type || 'video').toLowerCase();
      if (tipo === 'image') continue;   // las imagenes usan la declarada
      const r = duracionesMedidas[it.url];
      if (!(isFinite(r) && r > 0.5)) return false;
    }
    return true;
  }

  function duracionDeclarada(item) {
    const d = parseFloat(item && item.duration);
    if (isFinite(d) && d > 0) return d;
    return 15; // respaldo si la API no la trae
  }

  // La duracion se resuelve de forma CONSISTENTE para toda la playlist:
  // o todas reales, o todas declaradas. Nunca mezcladas.
  function duracionDe(item, usarReales) {
    if (!item) return 15;
    if (usarReales) {
      const real = duracionesMedidas[item.url];
      if (isFinite(real) && real > 0.5) return real;
    }
    return duracionDeclarada(item);
  }

  function calcularHuella(playlist) {
    return playlist.map(it => (it.campaignId || '') + '|' + (it.url || '')).join(';');
  }

  // Devuelve que video toca y en que segundo, segun la hora del servidor
  // ------------------------------------------------------------
  // El comentario de arriba ya decia lo correcto ("se usa SIEMPRE la
  // declarada"), pero el codigo usaba las MEDIDAS cuando estaban todas
  // disponibles. Esa era la falla de fondo de la sincronia:
  //
  //   - Una caja que ya midio usa 20.1s; otra que aun no midio usa los
  //     20s declarados por la API. Totales distintos.
  //   - Y 'total' cambiaba DENTRO de la misma caja al medir un video
  //     nuevo, corriendo la posicion de golpe. De ahi la oscilacion.
  //
  // El anclaje a la epoca amplifica cualquier diferencia: han pasado
  // ~89 millones de ciclos de 20s desde 1970, asi que 0.05s de
  // discrepancia no produce una deriva pequena sino una fase
  // practicamente aleatoria (medido: total=20.00 -> 4.46s;
  // total=20.05 -> 0.61s). Por eso no alcanza con ajustar la metadata:
  // haria falta igualdad exacta de punto flotante.
  //
  // Las duraciones medidas se siguen usando, pero solo para que un video
  // mas corto que su casillero haga bucle en lugar de quedarse congelado.
  // ------------------------------------------------------------
  let avisoDuracionDada = {};

  function posicionEnCiclo(modo) {
    const m = modos[modo];
    if (!m.playlist.length) return null;

    // SIEMPRE declaradas: es el unico dato identico en las 40 cajas.
    const durs = m.playlist.map(it => duracionDeclarada(it));
    const total = durs.reduce((a, b) => a + b, 0);
    if (!(total > 0)) return null;

    let pos = (ahoraServidorMs() / 1000) % total;
    for (let i = 0; i < durs.length; i++) {
      if (pos < durs[i]) {
        const item = m.playlist[i];
        let off = pos;

        const real = duracionesMedidas[item && item.url];
        if (isFinite(real) && real > 0.5 && item && item.url) {
          if (real < durs[i] - 0.15) {
            // El archivo dura menos que su casillero: se reinicia dentro
            // del casillero en vez de dejar el ultimo fotograma quieto.
            off = pos % real;
            if (!avisoDuracionDada[item.url]) {
              avisoDuracionDada[item.url] = true;
              logError(`[${modo}] La plataforma declara ${durs[i]}s para este video ` +
                       `pero el archivo dura ${real.toFixed(2)}s. Se hace bucle dentro ` +
                       `del casillero. Conviene corregir la duracion en el CMS.`);
            }
          } else if (real > durs[i] + 1) {
            if (!avisoDuracionDada[item.url]) {
              avisoDuracionDada[item.url] = true;
              logError(`[${modo}] La plataforma declara ${durs[i]}s pero el archivo dura ` +
                       `${real.toFixed(2)}s: solo se veran los primeros ${durs[i]}s. ` +
                       `Corregir la duracion en el CMS.`);
            }
          }
        }
        return { indice: i, offset: off, total: total, duracion: durs[i] };
      }
      pos -= durs[i];
    }
    return { indice: 0, offset: 0, total: total, duracion: durs[0] };
  }

  // ============================================================
  // 2 OVERLAYS PARALELOS: uno fullscreen, uno mini
  // Ambos existen simultaneamente. Se muestra uno u otro cambiando opacity.
  // ============================================================
  function crearOverlay(id, styleCss) {
    const el = document.createElement('div');
    el.id = id;
    el.style.cssText = styleCss;
    return el;
  }

  const STYLE_FULLSCREEN = `
    position: fixed !important;
    top: 0 !important; left: 0 !important;
    width: 100vw !important; height: 100vh !important;
    background: transparent !important;
    z-index: 2147483000 !important;
    display: none !important;
    align-items: center !important;
    justify-content: center !important;
    opacity: 1 !important;
    pointer-events: none !important;
    transition: none !important;
    border-radius: 0 !important;
  `;

  const STYLE_MINI = `
    position: fixed !important;
    top: ${CONFIG.MINI_TOP_PX}px !important;
    right: ${CONFIG.MINI_RIGHT_PX}px !important;
    left: auto !important;
    width: ${CONFIG.MINI_WIDTH_PERCENT}vw !important;
    height: ${CONFIG.MINI_HEIGHT_PX}px !important;
    background: transparent !important;
    z-index: 2147483000 !important;
    display: none !important;
    align-items: center !important;
    justify-content: center !important;
    opacity: 1 !important;
    pointer-events: none !important;
    transition: none !important;
    overflow: hidden !important;
    border-radius: 0 !important;
  `;

  const overlayFullscreen = crearOverlay('tia-ads-overlay-fullscreen', STYLE_FULLSCREEN);
  const overlayMini = crearOverlay('tia-ads-overlay-mini', STYLE_MINI);

  // Cada overlay tiene su propio par de videos A/B para doble buffer
  function crearPar(prefix) {
    const vA = document.createElement('video');
    vA.id = `${prefix}-video-a`;
    vA.muted = true;
    vA.playsInline = true;
    vA.preload = 'auto';
    vA.style.cssText = 'position:absolute !important; top:0 !important; left:0 !important; width:100% !important; height:100% !important; object-fit:cover !important; display:none !important;';

    const vB = document.createElement('video');
    vB.id = `${prefix}-video-b`;
    vB.muted = true;
    vB.playsInline = true;
    vB.preload = 'auto';
    vB.style.cssText = 'position:absolute !important; top:0 !important; left:0 !important; width:100% !important; height:100% !important; object-fit:cover !important; display:none !important;';

    const imgEl = document.createElement('img');
    imgEl.id = `${prefix}-img`;
    imgEl.style.cssText = 'position:absolute !important; top:0 !important; left:0 !important; width:100% !important; height:100% !important; object-fit:cover !important; display:none !important;';

    return { videoA: vA, videoB: vB, img: imgEl, activo: vA, preload: vB, precargadoUrl: null };
  }

  const parFS = crearPar('tia-fs');
  const parMini = crearPar('tia-mini');

  overlayFullscreen.appendChild(parFS.videoA);
  overlayFullscreen.appendChild(parFS.videoB);
  overlayFullscreen.appendChild(parFS.img);
  overlayMini.appendChild(parMini.videoA);
  overlayMini.appendChild(parMini.videoB);
  overlayMini.appendChild(parMini.img);

  function montarOverlays() {
    if (!document.body) { setTimeout(montarOverlays, 100); return; }
    document.body.appendChild(overlayFullscreen);
    document.body.appendChild(overlayMini);
  }
  montarOverlays();

  // Timer para imagenes por par
  const imgTimers = { fullscreen: null, mini: null };

  // ============================================================
  // CONFIG LOAD
  // ============================================================
  async function cargarConfig() {
    try {
      const url = chrome.runtime.getURL('config.json');
      const res = await fetch(url);
      const cfg = await res.json();

      cadena   = cfg.cadena || null;
      terminal = cfg.terminal || null;

      // Soporte dual y legacy
      if (cfg.fullscreen && cfg.mini) {
        modos.fullscreen.pantallaId = cfg.fullscreen.pantalla_id;
        modos.fullscreen.token      = cfg.fullscreen.token;
        modos.mini.pantallaId       = cfg.mini.pantalla_id;
        modos.mini.token            = cfg.mini.token;
        log('Config cargada (DUAL PLAYLIST):', {cadena, terminal, fullscreen: modos.fullscreen.pantallaId, mini: modos.mini.pantallaId});
      } else {
        modos.fullscreen.pantallaId = cfg.pantalla_id;
        modos.fullscreen.token      = cfg.token;
        modos.mini.pantallaId       = cfg.pantalla_id;
        modos.mini.token            = cfg.token;
        log('Config cargada (single, compat):', {cadena, terminal, pantalla: cfg.pantalla_id});
      }
    } catch (err) {
      logError('Error cargando config.json:', err.message);
    }
  }

  // ============================================================
  // FETCH PLAYLIST
  // ============================================================
  function construirUrlPlaylist(modo) {
    const m = modos[modo];
    return `${CONFIG.API_URL}/api/screens/${m.pantallaId}/playlist?token=${m.token}`;
  }

  async function fetchPlaylist(modo) {
    const url = construirUrlPlaylist(modo);
    log(`Solicitando playlist [${modo}]:`, url);
    const tIda = Date.now();
    const res = await fetch(url, { method: 'GET', cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const tVuelta = Date.now();
    log(`Respuesta API [${modo}]:`, data);

    // Calibrar el reloj con la hora del servidor: es lo que permite que
    // todas las cajas coincidan sin depender del reloj de Windows.
    if (CONFIG.SYNC_HABILITADO) {
      calibrarReloj(data.generatedAt, tIda, tVuelta);
    }

    const items = data.content || data.videos || [];
    if (!Array.isArray(items)) throw new Error('Respuesta invalida');
    return { ...data, videos: items };
  }

  // ============================================================
  // CONTEXTO DE LA EXTENSION INVALIDADO
  // ------------------------------------------------------------
  // Cuando la extension se recarga o se actualiza, la instancia del
  // script que ya estaba corriendo en esta pagina queda huerfana: sus
  // llamadas a chrome.* fallan con "Extension context invalidated".
  // El script viejo NO puede recuperarse por si mismo.
  //
  // En la pantalla del cliente recargar la pagina es inofensivo (solo
  // muestra publicidad), asi que se recarga sola para que entre el
  // script nuevo. Sin esto la pantalla quedaria congelada en silencio
  // hasta que alguien la recargara a mano.
  //
  // No hay riesgo de bucle: si la extension se desinstalo, tras la
  // recarga ya no hay script que vuelva a intentarlo.
  // ============================================================
  let recargaProgramada = false;

  // Los errores "Uncaught (in promise) Extension context invalidated"
  // vienen de llamadas asincronas a chrome.* que quedaron sin capturar.
  // Se escuchan para detectar el caso cuanto antes.
  try {
    window.addEventListener('unhandledrejection', (ev) => {
      const r = ev && ev.reason;
      const msg = (r && r.message) ? r.message : String(r || '');
      if (msg.indexOf('Extension context invalidated') !== -1) {
        ev.preventDefault();
        recuperarDeContextoInvalidado();
      }
    });
  } catch (e) {}

  // Chequeo directo: si la extension se recargo, chrome.runtime.id
  // desaparece. Es instantaneo y no hay que esperar a que falle una
  // llamada para enterarse.
  function contextoVivo() {
    try {
      return !!(chrome && chrome.runtime && chrome.runtime.id);
    } catch (e) {
      return false;
    }
  }

  function contextoInvalidado(err) {
    const msg = (err && err.message) ? err.message : String(err || '');
    return msg.indexOf('Extension context invalidated') !== -1 ||
           msg.indexOf('Extension context was invalidated') !== -1 ||
           !(chrome && chrome.runtime && chrome.runtime.id);
  }

  function recuperarDeContextoInvalidado() {
    if (recargaProgramada) return;
    recargaProgramada = true;
    logError('La extension se recargo y este script quedo huerfano. ' +
             'Recargo la pantalla en 3s para retomar la publicidad.');
    setTimeout(() => {
      try { location.reload(); } catch (e) {}
    }, 3000);
  }

  async function cargarPlaylist(modo) {
    if (!modo) {
      const r1 = await cargarPlaylist('fullscreen');
      const r2 = await cargarPlaylist('mini');
      return r1 || r2;
    }
    const m = modos[modo];
    const cacheKey = `tia_playlist_cache_${modo}`;
    try {
      const data = await fetchPlaylist(modo);
      m.playlist = data.videos;

      // Si cambio la campana, hay que reposicionar el ciclo desde cero
      const huellaNueva = calcularHuella(m.playlist);
      const cambioContenido = huellaPlaylist[modo] !== null &&
                              huellaPlaylist[modo] !== huellaNueva;
      huellaPlaylist[modo] = huellaNueva;
      if (cambioContenido) {
        log(`Playlist [${modo}] CAMBIO de contenido: resincronizando`);
      }

      // ------------------------------------------------------------
      // PLAYLIST VACIA: hay que APAGAR, no solo registrarlo.
      //
      // aplicarVisibilidad() ya contempla el caso vacio y oculta los
      // overlays, pero solo se llama al cambiar de estado
      // (venta/reposo/encuesta). Al quitar una campana en la plataforma
      // la lista llegaba vacia, se escribia esta linea en el log, y
      // nadie volvia a evaluar la visibilidad: el <video> seguia en
      // bucle con su src cargado indefinidamente.
      //
      // Esto mismo hacia que el horario de la campana (08:00-23:00) no
      // tuviera efecto: al salir de la ventana la playlist llega vacia
      // y el video seguia corriendo igual.
      // ------------------------------------------------------------
      if (m.playlist.length === 0) {
        log(`Playlist [${modo}] vacia: apagando ese overlay`);
        apagarPar(modo);
        m.indice = 0;
        aplicarVisibilidad();
      } else {
        log(`Playlist [${modo}] cargada: ${m.playlist.length} items`);
        // Si venia vacia y ahora hay contenido, hay que volver a mostrarlo.
        if (vaciaAnterior[modo]) aplicarVisibilidad();
      }
      vaciaAnterior[modo] = (m.playlist.length === 0);
      const guardar = {};
      guardar[cacheKey] = data;
      guardar[`${cacheKey}_at`] = Date.now();
      await chrome.storage.local.set(guardar);
      if (m.indice >= m.playlist.length) m.indice = 0;

      // Arrancar reproduccion en el par correspondiente.
      // Sin contenido no hay nada que arrancar: iniciarReproduccion()
      // sobre una lista vacia no hace nada util y vuelve a dejar el
      // video anterior en su lugar.
      if (m.playlist.length === 0) return true;

      if (cambioContenido && syncActivoPara(modo) && modo === modoPlaylistActivo) {
        // Forzar la entrada en el nuevo ciclo (solo si este modo se ve)
        const pos = posicionEnCiclo(modo);
        if (pos) {
          m.indice = pos.indice;
          reproducirEnPar(modo, pos.offset);
        } else {
          iniciarReproduccion(modo);
        }
      } else {
        iniciarReproduccion(modo);
      }
      return true;
    } catch (err) {
      // Si la extension se recargo, este script ya no sirve: recargar
      if (contextoInvalidado(err)) { recuperarDeContextoInvalidado(); return false; }
      logError(`Error playlist [${modo}]:`, err.message);
      const cached = await chrome.storage.local.get(cacheKey);
      if (cached[cacheKey]?.videos?.length) {
        m.playlist = cached[cacheKey].videos;
        log(`Cache [${modo}]:`, m.playlist.length, 'items');
        iniciarReproduccion(modo);
        return true;
      }
      return false;
    }
  }

  // ============================================================
  // REPRODUCCION POR PAR (fullscreen o mini)
  // ============================================================
  function getPar(modo) { return modo === 'fullscreen' ? parFS : parMini; }

  // Recuerda si la playlist de cada modo estaba vacia en la carga previa,
  // para reaccionar solo cuando el estado cambia.
  const vaciaAnterior = { fullscreen: false, mini: false };

  // ============================================================
  // APAGAR UN PAR
  // ------------------------------------------------------------
  // No alcanza con ocultar el overlay: un <video> con display:none
  // sigue decodificando y consumiendo CPU, que es la misma que atiende
  // los mensajes del POS. Se pausa y se libera el src.
  // ============================================================
  function apagarPar(modo) {
    const par = getPar(modo);
    if (!par) return;
    clearTimeout(imgTimers[modo]);
    [par.activo, par.preload].forEach(v => {
      if (!v) return;
      try { v.pause(); } catch (e) {}
      try { v.removeAttribute('src'); v.load(); } catch (e) {}
    });
    if (par.img) {
      try {
        par.img.removeAttribute('src');
        par.img.style.setProperty('display', 'none', 'important');
      } catch (e) {}
    }
  }
  function getOverlay(modo) { return modo === 'fullscreen' ? overlayFullscreen : overlayMini; }

  function precargarSiguienteEnPar(modo) {
    const m = modos[modo];
    const par = getPar(modo);
    if (m.playlist.length <= 1) return;
    const idxSig = (m.indice + 1) % m.playlist.length;
    const itemSig = m.playlist[idxSig];
    if (!itemSig) return;
    const type = (itemSig.type || 'video').toLowerCase();
    if (type !== 'video' && type !== 'video/mp4') return;
    if (par.precargadoUrl === itemSig.url) return;

    par.preload.src = itemSig.url;
    par.preload.load();
    par.precargadoUrl = itemSig.url;
  }

  function swapEnPar(modo) {
    const par = getPar(modo);
    par.activo.style.setProperty('display', 'none', 'important');
    par.activo.pause();
    const tmp = par.activo;
    par.activo = par.preload;
    par.preload = tmp;
    par.activo.style.setProperty('display', 'block', 'important');
    // Igual que en reproducirEnPar: durante la encuesta no se intenta
    // reproducir, porque Chrome pausa el video oculto y el play falla.
    if (!enModoEncuesta()) {
      const p = par.activo.play();
      if (p?.then) p.catch(err => log(`[${modo}] swap play: ${err.message}`));
    }
    par.preload.pause();
    par.precargadoUrl = null;
  }

  // Asigna el archivo al modo oculto para que se descargue en segundo
  // plano, pero solo cuando el visible ya tiene datos suficientes.
  // Asi el video del cobro esta listo sin robarle banda al que se ve.
  function precargarOcultoSiConviene(modo) {
    const m = modos[modo];
    const item = m.playlist[m.indice];
    if (!item || !item.url) return;
    const tipo = (item.type || 'video').toLowerCase();
    if (tipo === 'image') return;

    const par = getPar(modo);
    if (!par || !par.activo) return;

    // Ya lo tiene asignado: nada que hacer
    if (par.activo.src === item.url) return;

    // Esperar a que el VISIBLE este cargado para no competir por la red
    const parVisible = getPar(modoPlaylistActivo);
    const visibleListo = parVisible && parVisible.activo &&
                         parVisible.activo.readyState >= 3;
    if (!visibleListo) {
      log(`[${modo}] Oculto: espero que el visible cargue antes de precargar`);
      return;
    }

    try {
      par.activo.src = item.url;
      par.activo.load();       // descarga en segundo plano, NO reproduce
      log(`[${modo}] Oculto: precargando en segundo plano (listo para el cobro)`);
    } catch (e) {}
  }

  function reproducirEnPar(modo, offsetInicial) {
    const m = modos[modo];
    const par = getPar(modo);
    if (m.playlist.length === 0) return;

    const item = m.playlist[m.indice];
    if (!item) return;
    const type = (item.type || 'video').toLowerCase();

    log(`Reproduciendo [${modo}] [${m.indice + 1}/${m.playlist.length}] tipo:${type}` +
        (offsetInicial > 0 ? ` desde ${offsetInicial.toFixed(1)}s` : '') +
        ` | ${item.url.substring(0, 80)}`);

    clearTimeout(imgTimers[modo]);

    if (type === 'image') {
      par.videoA.style.setProperty('display', 'none', 'important');
      par.videoB.style.setProperty('display', 'none', 'important');
      par.videoA.pause(); par.videoB.pause();
      par.img.style.setProperty('display', 'block', 'important');
      par.img.src = item.url;
      // Con sincronia, la imagen solo muestra el tiempo que le queda
      const durTotal = duracionDeclarada(item);
      const restante = (offsetInicial > 0) ? Math.max(1, durTotal - offsetInicial) : durTotal;
      imgTimers[modo] = setTimeout(() => siguienteEnPar(modo), restante * 1000);
      return;
    }

    par.img.style.setProperty('display', 'none', 'important');

    // Si el video ya esta precargado en el buffer, hacer swap instantaneo
    if (par.precargadoUrl === item.url) {
      swapEnPar(modo);
    } else {
      par.activo.style.setProperty('display', 'block', 'important');
      if (par.activo.src !== item.url) {
        par.activo.src = item.url;
        par.activo.load();
      }
      // Guarda defensiva: si algo llama aqui durante la encuesta, no se
      // intenta reproducir un video oculto (Chrome lo pausaria y el play
      // fallaria con "video-only background media was paused to save power").
      if (!enModoEncuesta()) {
        const p = par.activo.play();
        if (p?.then) p.catch(err => log(`[${modo}] play: ${err.message}`));
      }
    }

    // Colocar el video en el segundo que corresponde al ciclo
    if (offsetInicial > 0) {
      try { par.activo.playbackRate = 1; } catch (e) {}
      posicionarVideo(par.activo, offsetInicial);
    }

    // Verificar que la duracion declarada coincida con la real.
    // Si no coincide, el ciclo se desfasaria: hay que avisarlo.
    verificarDuracion(par.activo, item);

    // Precargar siguiente
    setTimeout(() => precargarSiguienteEnPar(modo), 500);
  }

  // Compara la duracion real del archivo contra la declarada por la API.
  // No cambia el calculo (todas las cajas deben usar la declarada para
  // coincidir), pero deja el aviso para corregir la metadata en la plataforma.
  function verificarDuracion(video, item) {
    if (!CONFIG.SYNC_HABILITADO || !item || !item.url) return;
    if (duracionesMedidas[item.url] !== undefined) return;
    const medir = () => {
      const real = video.duration;
      if (!isFinite(real) || real <= 0) return;
      const declarada = parseFloat(item.duration);
      duracionesMedidas[item.url] = real;
      const dif = isFinite(declarada) ? Math.abs(real - declarada) : 0;
      // Una diferencia menor a 1.5s es normal: los codificadores generan
      // duraciones con decimales y la plataforma suele guardar enteros.
      // Solo se reporta como error cuando la diferencia es grande, que es
      // lo que desestabiliza el ciclo.
      if (dif > 1.5) {
        logError(`DURACION MAL DECLARADA: la API dice ${declarada}s pero el video ` +
                 `dura ${real.toFixed(2)}s (dif ${dif.toFixed(2)}s). ` +
                 `El ciclo SIGUE usando la declarada para no desincronizar la tienda; ` +
                 `corregir la duracion en la plataforma: ` +
                 `${item.url.substring(0, 80)}`);
        // El ciclo cambio de largo: reiniciar contadores de salto y
        // recolocar el video segun el ciclo corregido.
        ['fullscreen', 'mini'].forEach(mo => {
          if (salud[mo]) { salud[mo].seeks = 0; salud[mo].ultimoSeek = 0; }
        });
      } else if (dif > 0.05) {
        log(`Duracion: la API declara ${declarada}s y el archivo dura ` +
            `${real.toFixed(2)}s (dif ${dif.toFixed(2)}s). Diferencia normal; ` +
            `el ciclo usa la declarada.`);
      }
    };
    if (video.readyState >= 1) medir();
    else video.addEventListener('loadedmetadata', medir, { once: true });
  }

  function siguienteEnPar(modo) {
    const m = modos[modo];
    if (m.playlist.length === 0) return;
    clearTimeout(imgTimers[modo]);

    // Durante la encuesta no se reproduce nada: solo se deja el indice
    // donde corresponde para retomar al salir.
    if (enModoEncuesta()) {
      if (syncActivoPara(modo)) {
        const posE = posicionEnCiclo(modo);
        if (posE) m.indice = posE.indice;
      } else {
        m.indice = (m.indice + 1) % m.playlist.length;
      }
      return;
    }

    // Con sincronia, el siguiente video lo decide el reloj, no un contador.
    // Asi una pantalla que vuelve del modo mini entra en el punto correcto.
    if (syncActivoPara(modo)) {
      const pos = posicionEnCiclo(modo);
      if (pos) {
        m.indice = pos.indice;
        if (salud[modo]) salud[modo].ultimoCambio = Date.now();
        reproducirEnPar(modo, pos.offset);
        return;
      }
    }

    m.indice = (m.indice + 1) % m.playlist.length;
    reproducirEnPar(modo);
  }

  // ============================================================
  // SINCRONIA: colocar el video en el segundo que corresponde
  // ============================================================
  // Coloca el video en un segundo determinado, PERO solo si el salto es
  // barato. Un WebM convertido automaticamente suele no traer indice de
  // busqueda (cues): sin el, Chrome no sabe en que byte esta ese segundo y
  // tiene que descargar y parsear gran parte del archivo. Se veia en
  // produccion como el mismo video tardando 12, 24 y 26s en "cargar" una y
  // otra vez, aunque ya se hubiera descargado antes.
  //
  // Estrategia: si el destino no esta descargado, NO se salta. El video
  // arranca desde el principio (descarga lineal, eficiente y cacheable) y
  // el corrector de deriva lo alinea despues, cuando saltar ya sea barato.
  function posicionarVideo(video, offsetSeg) {
    if (!(offsetSeg > 0)) return;

    const aplicar = () => {
      try {
        const max = isFinite(video.duration) ? Math.max(0, video.duration - 0.3) : offsetSeg;
        const destino = Math.min(offsetSeg, max);

        if (!estaBuffereado(video, destino)) {
          log(`Entrada sin salto: el segundo ${destino.toFixed(1)} no esta descargado. ` +
              `Arranco desde el inicio y la sincronia alinea despues ` +
              `(evita el salto caro en WebM sin indice de busqueda).`);
          return;
        }
        video.currentTime = destino;
      } catch (e) {}
    };

    if (video.readyState >= 1) {
      aplicar();
    } else {
      video.addEventListener('loadedmetadata', aplicar, { once: true });
    }
  }

  // Revisa la deriva y la corrige. Desfases chicos se corrigen acelerando
  // o frenando el video un 2% (imperceptible); los grandes con un salto.
  function corregirDeriva(modo) {
    if (!syncActivoPara(modo)) return;
    if (enModoEncuesta()) return;   // nada visible: no hay que sincronizar
    // No tiene sentido (ni es seguro) corregir un video pausado y oculto
    if (modo !== modoPlaylistActivo) return;
    const m = modos[modo];
    if (!m.playlist.length) return;

    const pos = posicionEnCiclo(modo);
    if (!pos) return;

    const par = getPar(modo);
    const v = par.activo;
    const s = salud[modo];

    // Si toca otro video, cambiar. Con una permanencia minima para no
    // entrar en oscilacion si el ciclo estuviera mal calculado.
    if (pos.indice !== m.indice) {
      const desdeUltimo = Date.now() - (s.ultimoCambio || 0);
      if (desdeUltimo < CONFIG.SYNC_MIN_PERMANENCIA_MS) {
        if (!s.avisoOscilacion) {
          s.avisoOscilacion = true;
          logError(`[${modo}] Sync pedia cambiar de video a los ${desdeUltimo}ms del ` +
                   `cambio anterior. Lo freno para evitar oscilacion. ` +
                   `Suele indicar duraciones mal declaradas en la plataforma.`);
        }
        return;
      }
      s.avisoOscilacion = false;
      log(`[${modo}] Sync: toca el video ${pos.indice + 1}, estaba en ${m.indice + 1}`);
      m.indice = pos.indice;
      s.seeks = 0;              // video nuevo, se reinicia el contador
      s.ultimoCambio = Date.now();
      reproducirEnPar(modo, pos.offset);
      return;
    }

    const item = m.playlist[m.indice];
    const type = (item && (item.type || 'video')).toLowerCase();
    if (type === 'image') return; // las imagenes las maneja su timer

    if (!v || v.paused || !isFinite(v.currentTime)) return;

    // ── Reglas de seguridad: la sincronia no debe congelar el video ──
    // Un video desincronizado es mucho mejor que uno detenido.
    if (v.seeking) return;               // ya hay un salto en curso
    if (v.readyState < 3) return;        // sin datos suficientes: no tocar

    const desfase = v.currentTime - pos.offset; // >0 = adelantado
    const abs = Math.abs(desfase);

    if (abs > CONFIG.SYNC_UMBRAL_SEEK) {
      const ahora = Date.now();
      const enfriando = (ahora - s.ultimoSeek) < CONFIG.SYNC_SEEK_COOLDOWN_MS;
      const agotado = s.seeks >= CONFIG.SYNC_MAX_SEEKS;
      const hayDatos = estaBuffereado(v, pos.offset);

      if (agotado) {
        // Los saltos no estan funcionando en este archivo (por ejemplo un
        // WebM sin indice de busqueda). Se deja de saltar y se corrige
        // solo con velocidad: pierde sincronia fina pero no se congela.
        if (v.playbackRate === 1) {
          log(`[${modo}] Sync: saltos agotados, solo corrijo con velocidad`);
        }
        aplicarVelocidad(v, desfase);
        return;
      }
      if (enfriando) { aplicarVelocidad(v, desfase); return; }
      if (!hayDatos) {
        // Saltar a una zona sin descargar obliga a pedir otro rango y es
        // la principal causa de congelamiento con red cargada.
        log(`[${modo}] Sync: el segundo ${pos.offset.toFixed(1)} no esta descargado, no salto`);
        aplicarVelocidad(v, desfase);
        return;
      }

      log(`[${modo}] Sync: desfase ${desfase.toFixed(2)}s, salto (${s.seeks + 1}/${CONFIG.SYNC_MAX_SEEKS})`);
      s.seeks++;
      s.ultimoSeek = ahora;
      try { v.playbackRate = 1; } catch (e) {}
      posicionarVideo(v, pos.offset);
      return;
    }

    // Ya estamos en sincronia: se restituye el presupuesto de saltos.
    //
    // El contador solo se reiniciaba al CAMBIAR de video. Con UN solo
    // video en la playlist ese cambio nunca ocurre, asi que tras 3 saltos
    // la caja quedaba sin poder volver a saltar por el resto de la sesion
    // de Chrome: un rebuffer largo la dejaba desincronizada corrigiendo
    // solo al 2% (unos 7 minutos para recuperar 8s).
    //
    // El presupuesto existe para detectar archivos donde los saltos NO
    // funcionan. Si el desfase quedo dentro del umbral, es que si
    // funcionan. El anti-oscilacion lo sigue dando el enfriamiento de
    // 20s, que no se toca.
    if (s.seeks > 0) {
      log(`[${modo}] Sync en rango (${desfase.toFixed(2)}s): restituyo el presupuesto de saltos`);
      s.seeks = 0;
    }

    aplicarVelocidad(v, desfase);
  }

  // Corrige el desfase acelerando o frenando un 2%: imperceptible y sin
  // riesgo, porque no obliga a descargar datos nuevos.
  function aplicarVelocidad(v, desfase) {
    const abs = Math.abs(desfase);
    try {
      if (abs > CONFIG.SYNC_UMBRAL_RATE) {
        const rate = desfase > 0 ? (1 - CONFIG.SYNC_RATE_AJUSTE) : (1 + CONFIG.SYNC_RATE_AJUSTE);
        if (v.playbackRate !== rate) v.playbackRate = rate;
      } else if (v.playbackRate !== 1) {
        v.playbackRate = 1;
      }
    } catch (e) {}
  }

  function iniciarCorrectorDeriva() {
    if (!CONFIG.SYNC_HABILITADO) return;
    clearInterval(syncTimer);
    syncTimer = setInterval(() => {
      CONFIG.SYNC_MODOS.forEach(modo => {
        try { corregirDeriva(modo); } catch (e) {}
      });
    }, CONFIG.SYNC_CHECK_MS);
    log(`Corrector de sincronia activo (cada ${CONFIG.SYNC_CHECK_MS}ms) para: ${CONFIG.SYNC_MODOS.join(', ')}`);
  }

  function iniciarReproduccion(modo) {
    if (modos[modo].playlist.length === 0) return;
    const m = modos[modo];
    const par = getPar(modo);

    // Durante la encuesta no hay modo visible: no arrancar nada
    if (enModoEncuesta()) {
      if (syncActivoPara(modo)) {
        const posE = posicionEnCiclo(modo);
        if (posE) m.indice = posE.indice;
      }
      log(`[${modo}] Modo encuesta: no arranco reproduccion`);
      return;
    }

    // Si este modo NO se ve, no arrancar ni saltar: solo dejar el indice
    // apuntando a lo que corresponde. Antes, en cada refresco de playlist
    // (cada 60s) se hacia un seek en el video oculto y se pausaba acto
    // seguido: ese salto pedia un rango de bytes al servidor sin ninguna
    // utilidad y competia por el ancho de banda que causa los
    // congelamientos. Al volverse visible entra en la posicion correcta
    // (lo hace aplicarVisibilidad).
    // Nota: NO se condiciona a modoVisibleAnterior. Antes se hacia asi y
    // en el ARRANQUE (cuando aun es null) se colaban las dos descargas en
    // paralelo: dos archivos de 40MB compitiendo en el peor momento.
    // modoPlaylistActivo ya viene con un valor por defecto ('fullscreen').
    if (modo !== modoPlaylistActivo) {
      if (syncActivoPara(modo)) {
        const posOculto = posicionEnCiclo(modo);
        if (posOculto) m.indice = posOculto.indice;
      }
      // CARGA ESCALONADA: no se reproduce, pero SI se le asigna el archivo
      // para que el navegador lo vaya descargando (preload='auto') y este
      // listo cuando el modo se vuelva visible.
      //
      // Antes no se asignaba el src en absoluto, y eso hacia que al empezar
      // una venta el video mini tuviera que descargarse desde cero con el
      // cliente mirando: se veia congelado los primeros segundos.
      //
      // Se espera a que el visible ya este cargado para no competir por el
      // ancho de banda en el arranque, que era el motivo del ahorro.
      precargarOcultoSiConviene(modo);
      return;
    }

    // Con sincronia: entrar en el punto donde va el ciclo ahora mismo
    if (syncActivoPara(modo)) {
      const pos = posicionEnCiclo(modo);
      if (pos) {
        const itemDestino = m.playlist[pos.indice];
        const yaEnElCorrecto = itemDestino &&
                               par.activo.src === itemDestino.url &&
                               !par.activo.paused;
        if (yaEnElCorrecto) {
          // Ya esta en el video correcto: solo ajustar la deriva
          log(`[${modo}] Ya en el video correcto, ajustando sincronia`);
          corregirDeriva(modo);
          return;
        }
        m.indice = pos.indice;
        log(`[${modo}] Entrando al ciclo: video ${pos.indice + 1} en ${pos.offset.toFixed(1)}s ` +
            `(ciclo de ${pos.total}s)`);
        reproducirEnPar(modo, pos.offset);
        return;
      }
    }

    // Si ya esta reproduciendo el mismo video actual, no reiniciar
    const itemActual = m.playlist[m.indice];
    if (itemActual && par.activo.src === itemActual.url && !par.activo.paused) {
      log(`[${modo}] Reproduccion ya en curso, no reiniciar`);
      return;
    }
    reproducirEnPar(modo);
  }

  // Attach eventos a los 4 videos (2 pares)
  function attachListeners(par, modo) {
    [par.videoA, par.videoB].forEach(v => {
      v.addEventListener('ended', () => {
        if (v === par.activo) siguienteEnPar(modo);
      });
      v.addEventListener('error', () => {
        logError(`[${modo}] Video fallo:`, v.src);
        if (v === par.activo) setTimeout(() => siguienteEnPar(modo), 2000);
      });
    });
  }
  attachListeners(parFS, 'fullscreen');
  attachListeners(parMini, 'mini');

  // ============================================================
  // WATCHDOG DE CONGELAMIENTO
  // ------------------------------------------------------------
  // asegurarReproduccion() solo levanta videos PAUSADOS. Un video
  // congelado NO esta pausado: paused es false y currentTime deja de
  // avanzar (falta de datos, decoder trabado, o un seek que no completa).
  // Ese caso no lo detectaba nadie y el video quedaba quieto para siempre.
  // Aqui se vigila que currentTime avance y se recupera en escalones.
  // ============================================================
  const salud = {
    fullscreen: { ultimoTime: -1, quieto: 0, cargando: 0, intentos: 0, seeks: 0, ultimoSeek: 0, stalls: 0, recuperados: 0, inaniciones: 0, rebuffer: false, rebufferMs: 0, ultimoCambio: 0, avisoOscilacion: false },
    mini:       { ultimoTime: -1, quieto: 0, cargando: 0, intentos: 0, seeks: 0, ultimoSeek: 0, stalls: 0, recuperados: 0, inaniciones: 0, rebuffer: false, rebufferMs: 0, ultimoCambio: 0, avisoOscilacion: false }
  };

  // ¿El instante que queremos ya esta descargado? Saltar a una zona sin
  // datos obliga al navegador a pedir otro rango: si la red esta cargada,
  // eso es justamente lo que congela el video.
  // Cuantos segundos hay descargados por delante del punto actual
  function bufferAdelante(v) {
    try {
      const t = v.currentTime;
      for (let i = 0; i < v.buffered.length; i++) {
        if (t >= v.buffered.start(i) - 0.2 && t <= v.buffered.end(i)) {
          return v.buffered.end(i) - t;
        }
      }
    } catch (e) {}
    return 0;
  }

  function estaBuffereado(v, t) {
    try {
      for (let i = 0; i < v.buffered.length; i++) {
        if (t >= v.buffered.start(i) - 0.2 && t <= v.buffered.end(i)) return true;
      }
    } catch (e) {}
    return false;
  }

  function recuperarVideo(modo) {
    const par = getPar(modo);
    const v = par.activo;
    const s = salud[modo];
    if (!v) return;
    s.intentos++;

    if (s.intentos === 1) {
      log(`[${modo}] Recuperacion 1/2: play()`);
      const p = v.play();
      if (p?.then) p.catch(err => log(`[${modo}] play: ${err.message}`));
      return;
    }

    if (s.intentos === 2) {
      // Reposicionar dentro de lo YA descargado. No se llama load():
      // eso abortaria la descarga en curso y reiniciaria desde cero.
      log(`[${modo}] Recuperacion 2/2: reposiciono dentro del buffer`);
      try {
        let destino = null;
        for (let i = 0; i < v.buffered.length; i++) {
          const ini = v.buffered.start(i), fin = v.buffered.end(i);
          if (v.currentTime >= ini - 0.5 && v.currentTime <= fin) {
            // Empujar un poco adelante dentro del mismo rango
            if (fin - v.currentTime > 1.5) destino = v.currentTime + 1;
          }
        }
        if (destino !== null) v.currentTime = destino;
        const p = v.play();
        if (p?.then) p.catch(() => {});
      } catch (e) {}
      return;
    }

    // Ultimo recurso: pasar al siguiente SOLO si hay mas de un item.
    // Con un solo video, cambiar no aporta nada y genera churn que
    // impide que la descarga termine.
    s.intentos = 0;
    s.seeks = 0;
    if (modos[modo].playlist.length > 1) {
      logError(`[${modo}] No pude recuperar: paso al siguiente`);
      siguienteEnPar(modo);
    } else {
      logError(`[${modo}] No pude recuperar y solo hay 1 video: sigo esperando ` +
               `sin reiniciar la descarga`);
    }
  }

  function vigilarCongelamiento(modo) {
    const m = modos[modo];
    const s = salud[modo];
    if (!m.playlist.length) return;

    // En modo encuesta todo esta pausado a proposito: no es congelamiento
    if (enModoEncuesta()) {
      s.ultimoTime = -1; s.quieto = 0; s.cargando = 0;
      s.rebuffer = false; s.rebufferMs = 0; s.inaniciones = 0;
      return;
    }

    // El modo oculto esta pausado a proposito: no es un congelamiento
    if (modo !== modoPlaylistActivo) {
      s.ultimoTime = -1; s.quieto = 0; s.cargando = 0;
      s.rebuffer = false; s.rebufferMs = 0; s.inaniciones = 0;
      return;
    }

    const item = m.playlist[m.indice];
    const type = (item && (item.type || 'video')).toLowerCase();
    if (type === 'image') { s.ultimoTime = -1; s.quieto = 0; s.cargando = 0; return; }

    const par = getPar(modo);
    const v = par.activo;
    if (!v || !v.src) return;

    // ── CASO 1: todavia no tiene datos para reproducir ──
    // readyState < 3 con red=2 significa que ESTA DESCARGANDO, no que se
    // congelo. Aqui hay que tener paciencia: intervenir con load() aborta
    // la descarga y el video nunca termina de cargar.
    if (v.readyState < 3) {
      s.cargando += CONFIG.WATCHDOG_MS;
      s.quieto = 0;
      s.ultimoTime = v.currentTime;

      if (s.cargando % 15000 === 0) {
        log(`[${modo}] Descargando el video... ${(s.cargando / 1000)}s ` +
            `(readyState=${v.readyState}, red=${v.networkState}, ` +
            `buffer=${(function(){ try { return v.buffered.length ? v.buffered.end(0).toFixed(1)+'s' : '0s'; } catch(e){ return '?'; } })()})`);
      }
      if (s.cargando === CONFIG.CARGA_PACIENCIA_MS) {
        logError(`[${modo}] El video tarda mas de ${CONFIG.CARGA_PACIENCIA_MS/1000}s en ` +
                 `descargar. Es un problema de red, no del reproductor. ` +
                 `NO reinicio la descarga para no empeorarlo.`);
      }
      if (s.cargando >= CONFIG.CARGA_MAX_MS) {
        s.cargando = 0;
        if (m.playlist.length > 1) {
          logError(`[${modo}] Sigue sin cargar tras ${CONFIG.CARGA_MAX_MS/1000}s: pruebo el siguiente`);
          siguienteEnPar(modo);
        } else {
          logError(`[${modo}] Sigue sin cargar tras ${CONFIG.CARGA_MAX_MS/1000}s. ` +
                   `Solo hay 1 video: sigo esperando la red.`);
        }
      }
      return;
    }

    // Ya tiene datos: se reinicia el contador de carga
    if (s.cargando > 0) {
      log(`[${modo}] Video listo para reproducir (tardo ${(s.cargando/1000).toFixed(0)}s en cargar)`);
      s.cargando = 0;
    }

    // ── CASO 2: pausado ──
    if (v.paused) {
      // Si estamos rebuffereando, ver si ya hay suficiente para seguir
      if (s.rebuffer) {
        const adelante = bufferAdelante(v);
        s.rebufferMs += CONFIG.WATCHDOG_MS;
        if (adelante >= CONFIG.REBUFFER_SEG || s.rebufferMs >= CONFIG.REBUFFER_MAX_MS) {
          log(`[${modo}] Rebuffer listo (${adelante.toFixed(1)}s acumulados): reanudo`);
          s.rebuffer = false; s.rebufferMs = 0; s.inaniciones = 0;
          const p = v.play(); if (p?.then) p.catch(() => {});
        } else if (s.rebufferMs % 6000 === 0) {
          log(`[${modo}] Acumulando buffer... ${adelante.toFixed(1)}s de ${CONFIG.REBUFFER_SEG}s`);
        }
        return;
      }
      s.quieto = 0; s.ultimoTime = v.currentTime; return;
    }
    // Seek en curso: no es congelamiento
    if (v.seeking) { s.quieto = 0; return; }

    // ── CASO 2b: INANICION DE RED (no es congelamiento) ──
    // readyState 2/3 con red=2 significa que hay datos para el frame
    // actual pero no para seguir, y sigue descargando. El video se traba
    // porque la descarga va mas lenta que la reproduccion.
    // Insistir con play() no sirve: hay que ACUMULAR buffer.
    const estaBuffereando = (v.networkState === 2 && v.readyState < 4);
    if (estaBuffereando) {
      const t2 = v.currentTime;
      const avanzo = !(s.ultimoTime >= 0 && Math.abs(t2 - s.ultimoTime) < 0.05);
      s.ultimoTime = t2;
      if (avanzo) { s.quieto = 0; return; }

      s.quieto += CONFIG.WATCHDOG_MS;
      if (s.quieto >= CONFIG.STALL_MS) {
        s.quieto = 0;
        s.inaniciones++;
        logError(`[${modo}] Red insuficiente para el video (inanicion ${s.inaniciones}): ` +
                 `buffer adelante ${bufferAdelante(v).toFixed(1)}s`);
        if (s.inaniciones >= CONFIG.REBUFFER_TRAS_N) {
          // Pausar a proposito y acumular buffer, como hace cualquier
          // reproductor: mejor una pausa limpia que trabarse sin parar.
          log(`[${modo}] Pauso para acumular ${CONFIG.REBUFFER_SEG}s de buffer`);
          s.rebuffer = true; s.rebufferMs = 0;
          try { v.pause(); } catch (e) {}
        } else {
          const p = v.play(); if (p?.then) p.catch(() => {});
        }
      }
      return;
    }

    // ── CASO 3: reproduciendo pero sin avanzar = congelado de verdad ──
    const t = v.currentTime;
    if (s.ultimoTime >= 0 && Math.abs(t - s.ultimoTime) < 0.05) {
      s.quieto += CONFIG.WATCHDOG_MS;
    } else {
      if (s.quieto > 0 || s.intentos > 0) {
        log(`[${modo}] Video recuperado, reproduciendo normal`);
        s.recuperados++;
      }
      s.quieto = 0;
      s.intentos = 0;
    }
    s.ultimoTime = t;

    if (s.quieto >= CONFIG.STALL_MS) {
      s.stalls++;
      logError(`[${modo}] VIDEO CONGELADO en ${t.toFixed(2)}s ` +
               `(${s.quieto}ms sin avanzar, readyState=${v.readyState}, ` +
               `red=${v.networkState}). Recuperando...`);
      s.quieto = 0;
      recuperarVideo(modo);
    }
  }

  // Si el modo encuesta se prolonga mas de lo posible, la deteccion se
  // trabo. Con los videos pausados a proposito durante la encuesta, no
  // salir de ese modo dejaria la pantalla del cliente sin nada.
  function vigilarModoEncuestaTrabado() {
    if (estadoActual !== 'encuesta') return;
    if (!inicioModoEncuesta) return;
    const dur = Date.now() - inicioModoEncuesta;
    if (dur > CONFIG.MAX_MODO_ENCUESTA_MS) {
      logError(`Modo encuesta llevaba ${(dur/1000).toFixed(0)}s (la encuesta dura ~20s): ` +
               `la deteccion se trabo. Fuerzo la salida para recuperar el video.`);
      inicioModoEncuesta = 0;
      estadoActual = null;          // obliga a recalcular
      ultimaDeteccion = null;
      deteccionesConsecutivas = 0;
      pasarAModoIdle();
    }
  }

  function iniciarWatchdog() {
    setInterval(() => {
      // Lo primero: si la extension se recargo, este script ya no sirve.
      // Antes solo se detectaba al refrescar la playlist (cada 60s) y la
      // pantalla del cliente quedaba en negro todo ese rato.
      if (!contextoVivo()) { recuperarDeContextoInvalidado(); return; }

      try { vigilarModoEncuestaTrabado(); } catch (e) {}
      // Reintentar la precarga del modo oculto: la primera vez el visible
      // suele no estar cargado todavia, asi que hay que volver a evaluarlo.
      if (!enModoEncuesta()) {
        ['fullscreen', 'mini'].forEach(mo => {
          if (mo !== modoPlaylistActivo && modos[mo].playlist.length) {
            try { precargarOcultoSiConviene(mo); } catch (e) {}
          }
        });
      }
      ['fullscreen', 'mini'].forEach(modo => {
        try { vigilarCongelamiento(modo); } catch (e) {}
      });
    }, CONFIG.WATCHDOG_MS);
    log(`Watchdog de congelamiento activo (revisa cada ${CONFIG.WATCHDOG_MS}ms, ` +
        `umbral ${CONFIG.STALL_MS}ms)`);
  }

  // ============================================================
  // LECTURA DE TEXTO DE LA PANTALLA (barato)
  // ------------------------------------------------------------
  // innerText FUERZA UN RELAYOUT cada vez que se lee. Se estaba
  // llamando varias veces por ciclo y el ciclo corria cada 50-150ms,
  // lo que saturaba el hilo principal y CONGELABA el video
  // (se veia en consola: "Forced reflow ... took 114ms").
  //
  // Ahora: textContent como prefiltro (no fuerza layout) y solo si la
  // frase aparece se paga el costo de la verificacion visible. Ademas
  // se cachea por 400ms para no repetir el trabajo en el mismo ciclo.
  // ============================================================
  let avisoMiniVacia = false;
  let modoVisibleAnterior = null;
  let cacheTextoVisible = { valor: '', ts: 0 };
  let cacheTextoCrudo   = { valor: '', ts: 0 };

  // Barato: no fuerza layout. Incluye texto oculto, sirve de prefiltro.
  function textoCrudo() {
    const ahora = Date.now();
    if (ahora - cacheTextoCrudo.ts < 400) return cacheTextoCrudo.valor;
    cacheTextoCrudo.valor = (document.body.textContent || '').toLowerCase();
    cacheTextoCrudo.ts = ahora;
    return cacheTextoCrudo.valor;
  }

  // Caro (fuerza layout): solo cuando de verdad hace falta.
  function textoVisible() {
    const ahora = Date.now();
    if (ahora - cacheTextoVisible.ts < 400) return cacheTextoVisible.valor;
    cacheTextoVisible.valor = (document.body.innerText || '').toLowerCase();
    cacheTextoVisible.ts = ahora;
    return cacheTextoVisible.valor;
  }

  // ============================================================
  // AHORRO: pausar el media del POS que queda tapado
  // ============================================================
  let avisoPausaPOS = false;

  function esNuestroVideo(v) {
    try {
      let el = v;
      while (el) {
        const id = el.id || '';
        if (id.indexOf('tia-ads') === 0 || id.indexOf('tia-') === 0) return true;
        el = el.parentElement;
      }
    } catch (e) {}
    return false;
  }

  function gestionarMediaPOS() {
    if (!CONFIG.PAUSAR_MEDIA_POS) return;
    // Solo cuando nuestro overlay cubre TODA la pantalla
    const tapandoTodo = (estadoActual !== 'venta') &&
                        overlayFullscreen &&
                        overlayFullscreen.style.display === 'flex';
    try {
      const videos = document.querySelectorAll('video');
      let pausados = 0, reanudados = 0;
      videos.forEach(v => {
        if (esNuestroVideo(v)) return;
        if (tapandoTodo) {
          if (!v.paused) { v.pause(); pausados++; }
        } else {
          // Se devuelve el control al POS cuando dejamos de taparlo
          if (v.paused && v.dataset.tiaPausado === '1') {
            const p = v.play(); if (p?.then) p.catch(() => {});
            reanudados++;
          }
        }
        if (tapandoTodo) v.dataset.tiaPausado = '1';
        else delete v.dataset.tiaPausado;
      });
      if (pausados && !avisoPausaPOS) {
        avisoPausaPOS = true;
        log(`Pausados ${pausados} video(s) del POS que quedaban tapados por el overlay`);
      }
      if (reanudados) log(`Reanudados ${reanudados} video(s) del POS`);
    } catch (e) {}
  }

  // ============================================================
  // CONTROL DE VISIBILIDAD - cambio INSTANTANEO por opacity
  // Los DOS videos reproducen SIEMPRE. Solo cambia cual se ve.
  // ============================================================
  // ============================================================
  // SOLO EL MODO VISIBLE REPRODUCE
  // ------------------------------------------------------------
  // Chrome pausa a proposito el media SIN AUDIO que esta oculto:
  //   "video-only background media was paused to save power"
  // Nuestros videos son muted y el inactivo queda en display:none, asi
  // que Chrome lo apagaba una y otra vez. Insistir con play() era pelear
  // contra una politica del navegador y generaba errores constantes.
  //
  // Ahora el oculto se pausa a proposito (con preload='auto' sigue
  // descargando, asi que el cambio de modo es rapido) y solo reproduce
  // el que se ve. Al volverse visible entra en la posicion del ciclo,
  // que es justo lo que sabe hacer la sincronia por reloj.
  // ============================================================
  // En modo encuesta los DOS overlays estan ocultos, asi que no hay ningun
  // modo visible y nada debe reproducir. Insistir con play() sobre un video
  // oculto y sin audio hace que Chrome lo pause para ahorrar energia y el
  // play() falle ("video-only background media was paused to save power").
  function enModoEncuesta() {
    return estadoActual === 'encuesta';
  }

  function asegurarReproduccion() {
    // Durante la encuesta se pausa todo a proposito y no se intenta nada
    if (enModoEncuesta()) {
      ['fullscreen', 'mini'].forEach(modo => {
        const par = getPar(modo);
        if (!par) return;
        try { if (par.activo && !par.activo.paused) par.activo.pause(); } catch (e) {}
        try { if (par.preload && !par.preload.paused) par.preload.pause(); } catch (e) {}
      });
      return;
    }

    ['fullscreen', 'mini'].forEach(modo => {
      const par = getPar(modo);
      if (!par || !par.activo) return;
      const visible = (modo === modoPlaylistActivo);

      if (visible) {
        // Si estamos acumulando buffer a proposito, no reanudar aqui
        if (salud[modo] && salud[modo].rebuffer) return;
        if (par.activo.paused && par.activo.src) {
          const p = par.activo.play();
          if (p?.then) p.catch(err => log(`[${modo}] play: ${err.message}`));
        }
      } else {
        // Pausar nosotros en vez de dejar que Chrome lo haga
        try { if (!par.activo.paused) par.activo.pause(); } catch (e) {}
        try { if (!par.preload.paused) par.preload.pause(); } catch (e) {}
      }
    });
  }

  function aplicarVisibilidad() {
    if (estadoActual === 'encuesta') {
      overlayFullscreen.style.setProperty('display', 'none', 'important');
      overlayMini.style.setProperty('display', 'none', 'important');
      return;
    }

    // ------------------------------------------------------------
    // CADA MODO MUESTRA SOLO SU PROPIA PLAYLIST
    //
    // Antes habia un respaldo cruzado: si la playlist del modo que
    // correspondia estaba vacia, se mostraba la del otro modo. Se quito
    // porque provoca dos problemas peores que la falta de publicidad:
    //
    //   1. Durante la VENTA, un mini vacio hacia que se mostrara el
    //      fullscreen, y el video a pantalla completa TAPA los articulos
    //      que se estan escaneando: el cliente no puede verificar lo que
    //      le cobran. Eso es una falla funcional, no estetica.
    //
    //   2. En REPOSO, un fullscreen vacio hacia que se mostrara el video
    //      del mini estirado en el overlay grande, con el layout
    //      equivocado.
    //
    //   3. Ademas impedia apagar la publicidad de una pantalla: el
    //      horario de campana (08:00-23:00) no tenia efecto porque al
    //      vaciarse una playlist se mostraba la otra.
    //
    // Ahora: modo venta -> solo mini; modo reposo -> solo fullscreen. Si
    // esa playlist esta vacia, no se muestra nada y queda visible lo que
    // el sidecar del POS muestre debajo.
    // ------------------------------------------------------------
    const hayMini = modos.mini.playlist.length > 0;
    const hayFS   = modos.fullscreen.playlist.length > 0;

    const modoQueCorresponde = (estadoActual === 'venta') ? 'mini' : 'fullscreen';
    const hayContenido = (modoQueCorresponde === 'mini') ? hayMini : hayFS;

    modoPlaylistActivo = modoQueCorresponde;

    if (!hayContenido) {
      overlayFullscreen.style.setProperty('display', 'none', 'important');
      overlayMini.style.setProperty('display', 'none', 'important');
      if (modoQueCorresponde === 'mini' && !avisoMiniVacia) {
        avisoMiniVacia = true;   // se reinicia mas abajo al volver el contenido
        logError('Playlist MINI vacia: durante la venta no se muestra publicidad. ' +
                 'Si no es intencional, revisar la playlist de la pantalla mini ' +
                 'en la plataforma.');
      }
      return;
    }

    if (modoQueCorresponde === 'mini') avisoMiniVacia = false;

    let mostrar, ocultar;
    if (modoQueCorresponde === 'mini') {
      mostrar = overlayMini; ocultar = overlayFullscreen;
    } else {
      mostrar = overlayFullscreen; ocultar = overlayMini;
    }

    // Cambio INSTANTANEO: primero ocultar el otro, luego mostrar el nuevo
    // sin superposicion posible ya que el "otro" pasa a display:none
    ocultar.style.setProperty('display', 'none', 'important');
    mostrar.style.setProperty('display', 'flex', 'important');

    // Solo el visible reproduce (el oculto se pausa a proposito)
    asegurarReproduccion();

    // Si CAMBIO el modo, el video que se vuelve visible debe entrar en la
    // posicion que manda el reloj, no donde quedo pausado.
    if (modoPlaylistActivo !== modoVisibleAnterior) {
      const antes = modoVisibleAnterior;
      modoVisibleAnterior = modoPlaylistActivo;
      log(`Modo visible: ${antes || '(ninguno)'} -> ${modoPlaylistActivo}`);
      if (syncActivoPara(modoPlaylistActivo)) {
        const pos = posicionEnCiclo(modoPlaylistActivo);
        if (pos) {
          const mm = modos[modoPlaylistActivo];
          mm.indice = pos.indice;
          // Limpieza COMPLETA: si quedara rebuffer=true de una vez
          // anterior, asegurarReproduccion() se negaria a reproducir.
          if (salud[modoPlaylistActivo]) {
            const sv = salud[modoPlaylistActivo];
            sv.seeks = 0; sv.ultimoTime = -1; sv.quieto = 0;
            sv.cargando = 0; sv.intentos = 0;
            sv.inaniciones = 0; sv.rebuffer = false; sv.rebufferMs = 0;
          }
          reproducirEnPar(modoPlaylistActivo, pos.offset);
        }
      } else {
        // Sincronia APAGADA: igual hay que arrancar el video que se vuelve
        // visible. El modo oculto no tenia src (guarda de ahorro de red),
        // asi que sin esto la pantalla quedaria en negro al cambiar de modo.
        const par = getPar(modoPlaylistActivo);
        const mm = modos[modoPlaylistActivo];
        const it = mm.playlist[mm.indice];
        if (it && (!par.activo.src || par.activo.src !== it.url)) {
          log(`[${modoPlaylistActivo}] Sync apagada: arranco el video desde el inicio`);
          reproducirEnPar(modoPlaylistActivo);
        }
        if (salud[modoPlaylistActivo]) {
          const sv = salud[modoPlaylistActivo];
          sv.ultimoTime = -1; sv.quieto = 0; sv.cargando = 0;
          sv.intentos = 0; sv.inaniciones = 0;
          sv.rebuffer = false; sv.rebufferMs = 0;
        }
      }
    }

    // Liberar CPU: pausar el media del POS si quedo tapado
    gestionarMediaPOS();
  }

  function pasarAModoIdle() {
    if (estadoActual === 'idle') return;
    const veniaDeEncuesta = (estadoActual === 'encuesta');
    estadoActual = 'idle';
    log('>>> MODO IDLE (fullscreen visible)');
    aplicarVisibilidad();
    if (veniaDeEncuesta) notificarTouchHelper('/encuesta-off');
  }

  function pasarAModoVenta(motivo) {
    if (estadoActual === 'venta') return;
    const veniaDeEncuesta = (estadoActual === 'encuesta');
    estadoActual = 'venta';
    log('>>> MODO VENTA (mini visible). Razon:', motivo);
    aplicarVisibilidad();
    if (veniaDeEncuesta) notificarTouchHelper('/encuesta-off');
  }

  function pasarAModoEncuesta() {
    if (estadoActual === 'encuesta') return;
    estadoActual = 'encuesta';
    inicioModoEncuesta = Date.now();
    log('>>> MODO ENCUESTA (todo oculto)');
    aplicarVisibilidad();
    // Avisar al helper para activar el touch de la Pantalla 2 (encuesta)
    notificarTouchHelper('/encuesta-on');
  }

  // ============================================================
  // CONTROL DEL DRIVER TACTIL
  // El control del touch de la Pantalla 2 lo maneja EXCLUSIVAMENTE
  // touch-control.js (que corre en world:MAIN y detecta onReceiptPrint,
  // la encuesta y la firma de devolucion de forma temprana).
  // sidecar-ads.js NO avisa al helper HTTP, para evitar conflictos donde
  // dos scripts se contradigan (uno activa, otro desactiva) el touch.
  // Esta funcion queda como no-op intencional para no tocar las llamadas
  // existentes en pasarAModo*(); el touch se controla en otro modulo.
  // ============================================================
  function notificarTouchHelper(ruta) {
    // Intencionalmente sin logica. Control delegado a touch-control.js
  }

  // ============================================================
  // DETECCION DE ESTADOS (venta, idle, encuesta)
  // ============================================================
  function obtenerTotales(texto) {
    const regex = /(SUB)?TOTAL\s*[\r\n]+\s*(-?)\s*\$\s*(-?)([\d,]+(?:\.\d{1,2})?)/gi;
    const resultados = [];
    let m;
    while ((m = regex.exec(texto)) !== null) {
      const negativo = (m[2] === '-' || m[3] === '-');
      let num = parseFloat(m[4].replace(/,/g, ''));
      if (negativo) num = -num;
      if (!isNaN(num)) resultados.push({ tipo: (m[1] || '') + 'TOTAL', valor: num });
    }
    return resultados;
  }

  function hayVentaActiva(texto) {
    const totales = obtenerTotales(texto);
    for (const t of totales) if (Math.abs(t.valor) > 0) return t;
    return null;
  }

  function screensaverVisible() {
    const ss = document.getElementById('screensaver');
    if (!ss) return false;
    const style = getComputedStyle(ss);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    if (parseFloat(style.opacity) === 0) return false;
    const r = ss.getBoundingClientRect();
    return r.width > window.innerWidth * 0.5 && r.height > window.innerHeight * 0.3;
  }

  // Detecta la pantalla de "Gracias por su compra" (fin de venta transitorio)
  // Solo se considera si aparece en texto GRANDE (mensaje central), no en el footer
  // permanente del POS que dice "Gracias por comprar con nosotros"
  const FRASES_ENCUESTA = [
    'cómo fue su experiencia', 'como fue su experiencia', 'califica tu experiencia',
    'tu opinión nos importa', 'tu opinion nos importa', 'cuéntanos cómo te atendimos',
    'cuentanos como te atendimos'
  ];

  function encuestaVisible() {
    // Prefiltro barato: si la frase no esta ni en el texto crudo, no hay
    // encuesta y nos ahorramos todo el trabajo caro (innerText fuerza
    // relayout y eso congelaba el video).
    const crudo = textoCrudo();
    const hayFrase = FRASES_ENCUESTA.some(f => crudo.includes(f));

    // Modal: se exige que sea grande de verdad. Antes CUALQUIER modal
    // >100x100 ocultaba el video, y por eso el video "se quitaba" con
    // cualquier aviso del POS.
    const modales = document.querySelectorAll('.modal.show, .modal[style*="display: block"]');
    for (const m of modales) {
      const r = m.getBoundingClientRect();
      const grande = r.width > window.innerWidth * 0.45 &&
                     r.height > window.innerHeight * 0.35;
      if (!grande) continue;
      const t = (m.textContent || '').toLowerCase();
      if (FRASES_ENCUESTA.some(f => t.includes(f))) return true;
      if (!hayFrase && r.width > window.innerWidth * 0.8 &&
          r.height > window.innerHeight * 0.7) return true;
    }

    if (!hayFrase) return false;
    // Confirmar que la frase este realmente visible
    const vis = textoVisible();
    return FRASES_ENCUESTA.some(f => vis.includes(f));
  }

  const FRASES_GRACIAS = ['gracias por su compra', 'gracias por tu compra'];

  function graciasPorCompraVisible() {
    // Prefiltro barato. El barrido de abajo recorria TODOS los div/span/p
    // llamando innerText + getComputedStyle en cada uno: carisimo y se
    // ejecutaba varias veces por segundo. Ahora solo se hace si la frase
    // realmente esta en la pagina.
    const crudo = textoCrudo();
    if (!FRASES_GRACIAS.some(f => crudo.includes(f))) return false;

    // Busqueda acotada: solo titulos y elementos con poco texto
    const todos = document.querySelectorAll('h1, h2, h3, h4, span, div, p');
    let revisados = 0;
    for (const el of todos) {
      if (revisados > 400) break;   // tope de seguridad
      // textContent es barato: se descarta rapido lo que no aplica
      const tc = (el.textContent || '');
      if (tc.length > 100) continue;
      if (!FRASES_GRACIAS.some(f => tc.toLowerCase().includes(f))) continue;
      revisados++;

      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      if (parseFloat(style.opacity) === 0) continue;

      const fontSize = parseFloat(style.fontSize) || 0;
      const r = el.getBoundingClientRect();
      if (fontSize >= 24 && r.width > 100 && r.top >= 0 && r.top < window.innerHeight) {
        return true;
      }
    }
    return false;
  }

  function detectarEstado() {
    // Encuesta y "Gracias por su compra" -> todos los videos ocultos
    if (encuestaVisible() || graciasPorCompraVisible()) {
      pasarAModoEncuesta();
      return;
    }

    const texto = document.body.innerText || '';
    const venta = hayVentaActiva(texto);
    const ss = screensaverVisible();

    let nuevoEstado;
    if (ss) nuevoEstado = 'idle';
    else if (venta) nuevoEstado = 'venta';
    else nuevoEstado = 'idle';

    // Histeresis: requiere 2 detecciones consecutivas para cambiar
    if (nuevoEstado === ultimaDeteccion) {
      deteccionesConsecutivas++;
    } else {
      deteccionesConsecutivas = 1;
      ultimaDeteccion = nuevoEstado;
    }

    if (deteccionesConsecutivas >= 2) {
      if (nuevoEstado === 'venta') pasarAModoVenta(venta ? `TOTAL=$${venta.valor}` : 'venta');
      else pasarAModoIdle();
    }
  }

  // ============================================================
  // HEARTBEAT
  // ============================================================
  async function enviarHeartbeatA(modo) {
    const m = modos[modo];
    if (!m.pantallaId || !m.token) return;
    const esActiva = (modo === modoPlaylistActivo);
    const idxActivo = m.indice;
    const status = esActiva ? (estadoActual === 'idle' ? 3 : 4) : 3;
    try {
      await fetch(`${CONFIG.API_URL}/api/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceCode: m.pantallaId,
          playerVersion: 'TIA-Addon-4.0',
          cpuUsagePercent: 0,
          ramUsagePercent: 0,
          diskFreeBytes: 0,
          currentCampaign: m.playlist[idxActivo]?.campaignName || '',
          status: status
        })
      });
      log(`Heartbeat [${modo}] ${m.pantallaId} | status=${status} | activa=${esActiva}`);
    } catch (err) {
      logError(`Heartbeat [${modo}] fallo:`, err.message);
    }
  }

  async function enviarHeartbeat() {
    await Promise.all([enviarHeartbeatA('fullscreen'), enviarHeartbeatA('mini')]);
  }

  // ============================================================
  // DIAGNOSTICO DE SINCRONIA
  // En la consola de la pantalla del cliente:
  //   window.tiaSyncEstado()
  // Sirve para comparar dos cajas: el "ciclo" debe coincidir entre ellas.
  // ============================================================
  window.tiaSyncEstado = function () {
    const r = {
      sincronia: CONFIG.SYNC_HABILITADO ? 'activa' : 'desactivada',
      modosSincronizados: CONFIG.SYNC_MODOS.join(', '),
      relojCalibrado: offsetCalibrado,
      offsetRelojMs: Math.round(offsetReloj),
      horaServidor: new Date(ahoraServidorMs()).toISOString(),
      horaLocal: new Date().toISOString()
    };
    ['fullscreen', 'mini'].forEach(modo => {
      const m = modos[modo];
      if (!m.playlist.length) { r[modo] = 'sin playlist'; return; }
      const pos = posicionEnCiclo(modo);
      const par = getPar(modo);
      const sd = salud[modo] || {};
      r[modo] = {
        items: m.playlist.length,
        congelamientos: sd.stalls || 0,
        recuperaciones: sd.recuperados || 0,
        saltosUsados: (sd.seeks || 0) + "/" + CONFIG.SYNC_MAX_SEEKS,
        readyState: (function () { const v = getPar(modo).activo; return v ? v.readyState : null; })(),
        networkState: (function () { const v = getPar(modo).activo; return v ? v.networkState : null; })(),
        pausado: (function () { const v = getPar(modo).activo; return v ? v.paused : null; })(),
        buscando: (function () { const v = getPar(modo).activo; return v ? v.seeking : null; })(),
        buffer: (function () {
          const v = getPar(modo).activo;
          if (!v) return null;
          try {
            const partes = [];
            for (let i = 0; i < v.buffered.length; i++) {
              partes.push(v.buffered.start(i).toFixed(1) + "-" + v.buffered.end(i).toFixed(1));
            }
            return partes.join(", ") || "vacio";
          } catch (e) { return "?"; }
        })(),
        cicloTotalSeg: pos ? pos.total : null,
        posicionEnCiclo: pos ? (pos.indice + 1) + ' @ ' + pos.offset.toFixed(2) + 's' : null,
        indiceActual: m.indice + 1,
        videoCurrentTime: par.activo ? Number(par.activo.currentTime || 0).toFixed(2) : null,
        desfaseSeg: (pos && par.activo) ? (par.activo.currentTime - pos.offset).toFixed(2) : null,
        playbackRate: par.activo ? par.activo.playbackRate : null
      };
    });
    console.log('=== TIA ADS SYNC ===');
    console.log(JSON.stringify(r, null, 2));
    return r;
  };

  // ============================================================
  // INIT
  // ============================================================
  async function init() {
    await cargarConfig();
    if (!modos.fullscreen.pantallaId && !modos.mini.pantallaId) {
      logError('Sin pantalla_id configurado');
      return;
    }

    // Recuperar el desfase de reloj guardado ANTES del primer fetch, para
    // que la sincronia funcione aunque arranque sin conexion.
    await restaurarOffsetGuardado();

    await cargarPlaylist();
    setInterval(() => cargarPlaylist(), CONFIG.REFRESH_INTERVAL_MS);

    // Corrector de sincronia entre cajas
    iniciarCorrectorDeriva();

    // Watchdog: detecta y recupera videos congelados
    iniciarWatchdog();

    enviarHeartbeat();
    setInterval(enviarHeartbeat, CONFIG.HEARTBEAT_INTERVAL_MS);

    // Detectar estado inicial y setup observers
    let throttleTimer = null;
    let throttleEncuesta = null;
    // ============================================================
    // OBSERVADOR DE CAMBIOS DEL POS
    // ------------------------------------------------------------
    // Antes observaba TODO el subtree incluyendo cambios de 'style', y
    // nuestros propios overlays cambian style constantemente: eso creaba
    // un bucle (cambiamos estilo -> muta -> detecta -> cambia estilo...).
    // Sumado a que la deteccion era caraisima, saturaba el hilo principal
    // y el video se congelaba.
    //
    // Ahora: se ignoran las mutaciones que vienen de nuestros propios
    // elementos, y se respeta un minimo real entre detecciones.
    // ============================================================
    let ultimaDeteccionMs = 0;
    const MIN_ENTRE_DETECCIONES = 500;

    function esNuestroElemento(nodo) {
      try {
        let el = nodo instanceof Element ? nodo : nodo.parentElement;
        while (el) {
          const id = el.id || '';
          if (id.indexOf('tia-') === 0 || id.indexOf('ia-pos') === 0 ||
              id.indexOf('ia-') === 0) return true;
          el = el.parentElement;
        }
      } catch (e) {}
      return false;
    }

    const observer = new MutationObserver((mutaciones) => {
      // Descartar lo que generamos nosotros mismos
      let relevante = false;
      for (let i = 0; i < mutaciones.length; i++) {
        if (!esNuestroElemento(mutaciones[i].target)) { relevante = true; break; }
      }
      if (!relevante) return;

      clearTimeout(throttleEncuesta);
      throttleEncuesta = setTimeout(() => {
        if (estadoActual !== 'encuesta' && (encuestaVisible() || graciasPorCompraVisible())) {
          pasarAModoEncuesta();
        }
      }, 250);

      // Minimo real entre detecciones completas
      const ahora = Date.now();
      if (ahora - ultimaDeteccionMs < MIN_ENTRE_DETECCIONES) return;

      clearTimeout(throttleTimer);
      throttleTimer = setTimeout(() => {
        ultimaDeteccionMs = Date.now();
        detectarEstado();
      }, 300);
    });

    if (document.body) {
      // Sin 'style' en attributeFilter: era la fuente del bucle con
      // nuestros propios overlays.
      observer.observe(document.body, {
        childList: true, subtree: true, characterData: true,
        attributes: true, attributeFilter: ['class']
      });
    }

    setInterval(detectarEstado, CONFIG.SAFETY_CHECK_MS);
    setTimeout(detectarEstado, 800);

    // Cada segundo, asegurar que ambos videos siguen reproduciendo
    // (evita que se pausen por visibility change u otros eventos del navegador)
    setInterval(asegurarReproduccion, 1000);

    // Poll dedicado de encuesta/gracias cada 100ms
    setInterval(() => {
      if (estadoActual !== 'encuesta' && (encuestaVisible() || graciasPorCompraVisible())) {
        pasarAModoEncuesta();
      }
    }, 100);

    log('Sistema iniciado (v4.0). Debug: window.dispatchEvent(new Event("tia_debug"))');
  }

  // Debug
  window.addEventListener('tia_debug', () => {
    console.log('=== TIA ADS DEBUG v4.0 ===');
    console.log('Cadena:', cadena, '| Terminal:', terminal);
    console.log('Estado:', estadoActual, '| Modo activo:', modoPlaylistActivo);
    console.log('--- FULLSCREEN ---');
    console.log('  Pantalla:', modos.fullscreen.pantallaId);
    console.log('  Items:', modos.fullscreen.playlist.length, '| indice:', modos.fullscreen.indice);
    console.log('  Overlay opacity:', getComputedStyle(overlayFullscreen).opacity);
    console.log('  Video activo:', parFS.activo.id, '| src:', parFS.activo.src.substring(parFS.activo.src.lastIndexOf('/') + 1));
    console.log('--- MINI ---');
    console.log('  Pantalla:', modos.mini.pantallaId);
    console.log('  Items:', modos.mini.playlist.length, '| indice:', modos.mini.indice);
    console.log('  Overlay opacity:', getComputedStyle(overlayMini).opacity);
    console.log('  Video activo:', parMini.activo.id, '| src:', parMini.activo.src.substring(parMini.activo.src.lastIndexOf('/') + 1));
  });

  window.addEventListener('tia_refresh', async () => {
    log('Refresco manual');
    await cargarPlaylist();
  });

  init();
})();

    })(); // fin PUBLICIDAD
  }

  // ==========================================================
  // MODULO 3: DATOS DEL CLIENTE EN LA PANTALLA 2
  // ----------------------------------------------------------
  // Muestra por 30 segundos los datos del programa de lealtad que la
  // cajera consulto en la pantalla 1. La tarjeta va ENCIMA del video
  // (z-index por sobre los overlays de publicidad) y el video sigue
  // reproduciendose detras.
  //
  // Comunicacion por chrome.storage: son dos pestanas distintas
  // (localhost:9999 la cajera y localhost:8000 el cliente), asi que no
  // sirve postMessage. La pantalla 1 escribe la clave y aqui se escucha
  // con storage.onChanged.
  // ==========================================================
  if (__esSidecarURL) {
    (function () {
      'use strict';

      var P2_KEY    = "lealtad_p2";
      var P2_TTL_MS = 30000;   // 30 s visible y se limpia sola

      // Marca por cadena, igual que en la pantalla 1
      var MARCAS_P2 = {
        stevens: { nombre: "BE YOU",       logo: "be_you.png",       c1: "#313B79", c2: "#0FA1AB", correoPrimero: false },
        campeon: { nombre: "CAMPEÓN PASS", logo: "campeon_pass.png", c1: "#B64700", c2: "#FE6301", correoPrimero: true  },
        madison: { nombre: "BE YOU",       logo: "be_you.png",       c1: "#313B79", c2: "#0FA1AB", correoPrimero: false }
      };
      var marcaP2 = MARCAS_P2.stevens;

      var panel = null;
      var vista = null;
      var temporizador = null;

      function esc(v) {
        return String(v == null ? "" : v)
          .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
      }

      function colorValido(v, fallback) {
        var c = String(v == null ? "" : v).trim();
        return /^#[0-9a-fA-F]{3,8}$/.test(c) ? c : fallback;
      }

      // Texto legible sobre el color del nivel (hay niveles blancos)
      function textoSobre(hex) {
        var h = String(hex || "").replace(/^#/, "");
        if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
        if (!/^[0-9a-fA-F]{6}$/.test(h)) return "#ffffff";
        var r = parseInt(h.substr(0,2),16), g = parseInt(h.substr(2,2),16), b = parseInt(h.substr(4,2),16);
        return ((0.299*r + 0.587*g + 0.114*b) / 255) > 0.65 ? "#1f2937" : "#ffffff";
      }

      function crearPanel() {
        if (document.getElementById("tia-cli-panel")) return;
        panel = document.createElement("div");
        panel.id = "tia-cli-panel";
        panel.innerHTML =
          '<div class="tia-cli-header">' +
            '<img id="tia-cli-logo" class="tia-cli-logo" src="' +
              chrome.runtime.getURL(marcaP2.logo) + '" onerror="this.style.display=\'none\'">' +
            '<span id="tia-cli-marca" class="tia-cli-marca">' + esc(marcaP2.nombre) + '</span>' +
          '</div>' +
          '<div class="tia-cli-body" id="tia-cli-body"></div>';
        document.body.appendChild(panel);
        vista = document.getElementById("tia-cli-body");
      }

      function ocultar() {
        if (temporizador) { clearTimeout(temporizador); temporizador = null; }
        if (!panel) return;
        panel.classList.remove("visible");
        setTimeout(function () {
          if (panel && !panel.classList.contains("visible") && vista) vista.innerHTML = "";
        }, 400);
      }

      function programarLimpieza(desdeTs) {
        if (temporizador) clearTimeout(temporizador);
        var restante = P2_TTL_MS - (Date.now() - (desdeTs || Date.now()));
        temporizador = setTimeout(ocultar, Math.max(restante, 500));
      }

      function renderCliente(c) {
        var nivel = c.nivel || {};
        var nombre = [c.nombre, c.apellido].filter(Boolean).join(" ") || "Cliente";
        var nombreNivel = nivel.nivelNombre || "—";
        var c1 = colorValido(marcaP2.c1, "#1a2744");
        var c2 = colorValido(marcaP2.c2, c1);
        var colNivel = colorValido(nivel.nivelColor, c1);
        var txtNivel = textoSobre(colNivel);

        var filas = [
          ["Nombres", c.nombre],
          ["Apellidos", c.apellido],
          ["Cédula / Pasaporte", c.numId],
          ["Teléfono", c.telefono],
          ["Correo electrónico", c.email]
        ];
        if (marcaP2.correoPrimero) filas.unshift(filas.pop());

        var cuerpo = filas.map(function (f) {
          return '<div class="tia-cli-row">' +
                   '<span class="tia-cli-k">' + esc(f[0]) + '</span>' +
                   '<span class="tia-cli-v">' + esc(f[1] || "—") + '</span>' +
                 '</div>';
        }).join("");

        return '<div class="tia-cli-titulo">Estos son tus datos en ' + esc(marcaP2.nombre) + '</div>' +
          '<div class="tia-cli-card">' +
            '<div class="tia-cli-card-head" style="background:linear-gradient(135deg,' + c1 + ' 0%,' + c2 + ' 100%);">' +
              '<div class="tia-cli-card-name">' + esc(nombre) + '</div>' +
              '<div class="tia-cli-card-badge">Nivel: ' + esc(nombreNivel) + '</div>' +
            '</div>' +
            '<div class="tia-cli-card-body">' +
              cuerpo +
              '<div class="tia-cli-row">' +
                '<span class="tia-cli-k">Nivel</span>' +
                '<span class="tia-cli-pill" style="background:' + colNivel + ';color:' + txtNivel + ';">' +
                  esc(nombreNivel) +
                '</span>' +
              '</div>' +
            '</div>' +
          '</div>';
      }

      function renderNoRegistrado() {
        return '<div class="tia-cli-titulo">Aún no estás registrado en ' + esc(marcaP2.nombre) + '</div>' +
          '<div class="tia-cli-invita">' +
            '<div class="tia-cli-invita-icon">📱</div>' +
            '<div class="tia-cli-invita-txt">Descarga la app y regístrate para acumular ' +
            'beneficios en tu próxima compra. Nuestra cajera te puede orientar.</div>' +
          '</div>';
      }

      function aplicar(dato) {
        if (!dato || !dato.estado || dato.estado === "limpio") { ocultar(); return; }
        // Si el dato ya vencio (por ejemplo la pantalla se recargo mucho
        // despues), no se resucita.
        if (Date.now() - (dato.ts || 0) > P2_TTL_MS) { ocultar(); return; }

        crearPanel();
        if (!vista) return;

        if (dato.estado === "ok" && dato.cliente) {
          vista.innerHTML = renderCliente(dato.cliente);
        } else if (dato.estado === "no_registrado") {
          vista.innerHTML = renderNoRegistrado();
        } else {
          ocultar();
          return;
        }

        panel.classList.add("visible");
        programarLimpieza(dato.ts);
      }

      // Cargar la marca de la cadena y arrancar
      (async function () {
        try {
          var r = await fetch(chrome.runtime.getURL("config.json"), { cache: "no-store" });
          var cfg = await r.json();
          var cadena = String(cfg.cadena || "").toLowerCase();
          var clave = Object.keys(MARCAS_P2).find(function (k) { return cadena.indexOf(k) === 0; });
          if (clave) marcaP2 = MARCAS_P2[clave];
          var by = cfg.beyou || {};
          if (by.etiqueta) marcaP2.nombre = by.etiqueta;
          if (by.logo) marcaP2.logo = by.logo;
        } catch (e) {}

        crearPanel();

        // Estado inicial: sobrevive a un refresh de esta pantalla
        try {
          chrome.storage.local.get(P2_KEY, function (res) {
            if (chrome.runtime.lastError) return;
            aplicar(res && res[P2_KEY]);
          });
        } catch (e) {}

        // Cambios en vivo
        try {
          chrome.storage.onChanged.addListener(function (cambios, area) {
            if (area !== "local" || !cambios[P2_KEY]) return;
            aplicar(cambios[P2_KEY].newValue);
          });
        } catch (e) {}

        console.log("[TIA Cliente] Pantalla 2 lista para mostrar datos de", marcaP2.nombre);
      })();

    })(); // fin PANTALLA CLIENTE
  }

})(); // fin TIA POS unificado

// ============================================================
// PUENTE DE FOCO  (mundo aislado)
// ------------------------------------------------------------
// touch-control.js corre en world:MAIN sobre la pagina del sidecar y
// ahi no existe chrome.runtime. Este archivo corre en el mundo aislado
// sobre la MISMA pagina, asi que puede recoger su postMessage y
// reenviarlo al service worker, que es quien puede mover el foco entre
// ventanas de Chrome.
//
// Problema que resuelve: al tocar la encuesta, Windows le da el foco a
// la ventana de la pantalla del cliente y la de la cajera deja de
// responder a los clics y al escaner.
// ============================================================
(function puenteFoco() {
  if (!window.location.pathname.includes('/sidecarscreen/')) return;

  window.addEventListener('message', function (ev) {
    const d = ev.data;
    if (!d || d.__tiaFoco !== true) return;
    try {
      chrome.runtime.sendMessage({ action: 'devolverFocoCajera', motivo: d.motivo });
    } catch (e) {
      // El service worker puede estar reciclado; no es critico.
    }
  }, false);
})();
