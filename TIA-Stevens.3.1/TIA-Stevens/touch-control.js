// ============================================================
// TOUCH CONTROL - Bloqueo tactil Pantalla 2 (cliente)
// TOVA POS - Grupo Tova
// ============================================================
// Controla el driver tactil de la Pantalla 2 via helper HTTP local
// (control-driver-touch.ps1 en el puerto 9876).
//
//   Estado normal  -> touch BLOQUEADO (driver desactivado)
//   Encuesta visible -> touch HABILITADO (cliente responde)
//   Encuesta cerrada -> touch BLOQUEADO de nuevo
//
// Detecta el fin de venta / encuesta por:
//   - onReceiptPrint (WebSocket / postMessage) - llega primero
//   - userPrompt (encuesta) - respaldo
//   - DOM (respaldo final)
//
// Este archivo corre en world:MAIN para poder ver los mensajes
// internos del POS (WebSocket y postMessage).
//
// NOTA: Este modulo es el UNICO responsable del control del touch.
// No contiene nada de la ruleta promocional (ese modulo fue retirado).
// sidecar-ads.js NO controla el touch: su notificarTouchHelper() es no-op.
// ============================================================

(function() {
  'use strict';

  // Solo ejecutar en la pantalla del cliente
  if (!window.location.pathname.includes('/sidecarscreen/')) {
    return;
  }

  const CONFIG = {
    TOUCH_HELPER_URL: 'http://localhost:9876',
    PING_INTERVAL_MS: 3000,
    TOUCH_TIMEOUT_SEG: 60,       // Watchdog encuesta: re-bloquear si no se cerro antes
    TOUCH_TIMEOUT_FIRMA_SEG: 180, // Watchdog firma: mas margen (el cliente tarda mas)
    TIMEOUT_SIN_ENCUESTA_SEG: 45, // Re-bloquear si nunca aparecio la encuesta
    LOG_PREFIX: '[TIA Touch]'
  };

  function log(...args) { console.log(CONFIG.LOG_PREFIX, ...args); }
  function logError(...args) { console.error(CONFIG.LOG_PREFIX, ...args); }

  // ============================================================
  // ESTADO
  // ============================================================
  let touchActivado = false;
  let touchPingTimer = null;
  let touchWatchdogTimer = null;

  // ============================================================
  // CONTROL DEL DRIVER VIA HELPER HTTP
  // ============================================================
  // ============================================================
  // VENTANA DE LA ENCUESTA SEGUN EL PROPIO POS
  // ------------------------------------------------------------
  // El mensaje userPrompt trae "expiry" con el instante exacto en que
  // la encuesta expira (en produccion: 20s despues de createdOn).
  // Usar ese dato es mucho mas confiable que deducir por el DOM si la
  // encuesta sigue en pantalla, que es lo que fallaba de forma
  // intermitente y dejaba al cliente sin poder tocar la carita.
  // ============================================================
  let expiraEncuestaMs = 0;   // 0 = sin dato

  // Referencia al monitor de cierre en curso.
  // ------------------------------------------------------------
  // Antes el id del intervalo era una variable LOCAL de
  // iniciarMonitorCierre, asi que nadie podia cancelarlo desde afuera.
  // Si dos ventas se encadenaban rapido quedaban DOS monitores vivos: el
  // viejo ya habia visto la encuesta anterior, y al no ver ninguna en la
  // ventana nueva mandaba a bloquear, matandola a los pocos segundos.
  // Era el 15% de fallas que se veia en produccion, siempre en ventanas
  // que arrancaban pocos segundos despues del cierre anterior.
  let monitorCierreId = null;

  function detenerMonitorCierre() {
    if (monitorCierreId !== null) {
      clearInterval(monitorCierreId);
      monitorCierreId = null;
    }
  }

  function registrarExpiry(dato) {
    try {
      if (!dato) return;
      let exp = null;
      if (typeof dato === 'string') {
        const m = dato.match(/"expiry"\s*:\s*"([^"]+)"/);
        if (m) exp = m[1];
      } else if (typeof dato === 'object' && dato.expiry) {
        exp = dato.expiry;
      }
      if (!exp) return;
      const ms = new Date(exp).getTime();
      if (isFinite(ms) && ms > Date.now()) {
        expiraEncuestaMs = ms;
        const seg = ((ms - Date.now()) / 1000).toFixed(1);
        log(`El POS informa que la encuesta expira en ${seg}s: mantengo el touch hasta entonces`);
      }
    } catch (e) {}
  }

  // ============================================================
  // LLAMADAS AL HELPER, VERIFICADAS
  // ------------------------------------------------------------
  // Antes: fetch(..., { mode: 'no-cors' }).catch(() => {})
  // Con no-cors la respuesta es opaca y con el catch vacio el error se
  // descarta: la pagina nunca sabia si el driver quedo habilitado, y no
  // reintentaba. Si el helper estaba caido, la encuesta se perdia en
  // silencio.
  //
  // El servicio TiaTouch 4.0 responde en el puerto 9876 con
  // Access-Control-Allow-Origin: *, y solo contesta ok-on cuando el
  // dispositivo esta REALMENTE operativo. Vale la pena leer eso.
  // ============================================================
  const REINTENTOS_HELPER = 3;

  async function helper(ruta) {
    for (let intento = 1; intento <= REINTENTOS_HELPER; intento++) {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 4000);
      try {
        const res = await fetch(`${CONFIG.TOUCH_HELPER_URL}${ruta}`,
                                { method: 'GET', cache: 'no-store', signal: ctrl.signal });
        clearTimeout(t);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return (await res.text()).trim();
      } catch (e) {
        clearTimeout(t);
        if (intento === REINTENTOS_HELPER) {
          logError(`El helper no respondio a ${ruta} tras ${intento} intentos: ${e.message}`);
          return null;
        }
        await new Promise(r => setTimeout(r, 400 * intento));
      }
    }
    return null;
  }

  function activarTouch(motivo) {
    // Nueva venta: se descarta el expiry de la encuesta anterior
    if (!touchActivado) expiraEncuestaMs = 0;
    if (touchActivado) return;
    touchActivado = true;
    log('TOUCH ACTIVADO (' + motivo + ')');

    // El motivo viaja al servicio para que quede en su log: permite
    // auditar en produccion sin abrir la consola de Chrome.
    helper(`/encuesta-on?motivo=${encodeURIComponent(motivo)}`).then(r => {
      if (r === null) {
        logError('No pude confirmar el encendido del driver. La encuesta puede no responder.');
      } else if (/warn-on|error/.test(r)) {
        logError('El servicio informa un problema al habilitar: ' + r);
      } else {
        log('Driver confirmado: ' + r);
      }
    });

    // Pings para mantener vivo el estado en el helper
    clearInterval(touchPingTimer);
    touchPingTimer = setInterval(() => { helper('/ping'); }, CONFIG.PING_INTERVAL_MS);

    // Watchdog: re-bloquear si no se cerro antes.
    // La firma da mas margen porque el cliente tarda mas en firmar.
    const esFirma = (motivo === 'firma' || motivo === 'firma-WS');
    const timeoutSeg = esFirma ? CONFIG.TOUCH_TIMEOUT_FIRMA_SEG : CONFIG.TOUCH_TIMEOUT_SEG;
    clearTimeout(touchWatchdogTimer);
    touchWatchdogTimer = setTimeout(() => {
      log('Watchdog: timeout de touch, re-bloqueando');
      desactivarTouch();
    }, timeoutSeg * 1000);

    // Cancelar cualquier monitor anterior ANTES de crear el nuevo.
    // Sin esto quedaban monitores solapados que se bloqueaban entre si.
    detenerMonitorCierre();

    // Monitorear DOM para saber cuando se cierra la encuesta o firma.
    // Pasamos esFirma para manejar el hueco firma->encuesta en devoluciones.
    iniciarMonitorCierre(esFirma);
  }

  // ============================================================
  // DEVOLVER EL FOCO A LA VENTANA DE LA CAJERA
  // ------------------------------------------------------------
  // Al tocar la encuesta, Windows le da el foco a la ventana de Chrome
  // de la pantalla del cliente. La ventana de la cajera queda sin foco y
  // deja de responder a los clics y al escaner hasta que alguien la
  // vuelve a seleccionar.
  //
  // Este archivo corre en world:MAIN y ahi no existe chrome.runtime, asi
  // que se avisa por postMessage. Quien lo recoge es tia-pos.js, que
  // corre en el mundo aislado sobre esta misma pagina y si tiene acceso
  // a la extension.
  // ============================================================
  function devolverFocoCajera(motivo) {
    try {
      window.postMessage({ __tiaFoco: true, motivo: motivo || 'cierre' }, '*');
      log('Solicitado devolver el foco a la cajera (' + (motivo || 'cierre') + ')');
    } catch (e) {}
  }

  function desactivarTouch() {
    if (!touchActivado) return;
    touchActivado = false;
    log('TOUCH DESACTIVADO (re-bloqueado)');
    devolverFocoCajera('fin-encuesta');
    helper('/encuesta-off?motivo=cierre-encuesta');
    clearInterval(touchPingTimer);
    clearTimeout(touchWatchdogTimer);
    // Detener el monitor: sin esto quedaba vivo y podia interferir con la
    // siguiente ventana si dos ventas se encadenaban rapido.
    detenerMonitorCierre();
  }

  // Monitorear DOM para saber cuando se cierra la encuesta O la firma.
  // Caso especial devolucion: firma -> (hueco) -> encuesta. Cuando el touch
  // se activo por firma, al cerrarse la firma NO re-bloqueamos de inmediato:
  // damos una ventana de gracia para que aparezca la encuesta. Si aparece,
  // seguimos con el touch activo (sin re-activar el driver). Si no aparece
  // en esa ventana, ahi si re-bloqueamos.
  function iniciarMonitorCierre(esFirma) {
    let firmaFueVisible = false;
    let encuestaFueVisible = false;
    let checks = 0;
    let desapariciones = 0;          // lecturas seguidas sin ver la encuesta
    // 3 lecturas * 500ms = 1.5s de confirmacion antes de dar por cerrada
    // la encuesta. Antes bastaba UNA y de ahi venia la intermitencia.
    const DESAPARICIONES_PARA_CERRAR = 3;
    // Margen tras la expiracion informada por el POS, para forzar el
    // bloqueo si el DOM nunca reporta el cierre.
    const MARGEN_TRAS_EXPIRY_MS = 3000;
    let checksTrasCerrarFirma = 0; // cuenta desde que la firma desaparece
    // Ventana de gracia para que la encuesta aparezca tras cerrar la firma.
    // 20 checks * 500ms = 10s de margen (la encuesta suele salir en <6s).
    const GRACIA_ENCUESTA_CHECKS = 20;

    let intervalId = null;
    intervalId = setInterval(() => {
      // Si este monitor ya no es el vigente (arranco otra ventana), se
      // apaga sin tocar nada: no debe bloquear una ventana que no es suya.
      if (intervalId !== monitorCierreId) { clearInterval(intervalId); return; }
      if (!touchActivado) { clearInterval(intervalId); return; }

      checks++;
      const t = (document.body?.innerText || '').toLowerCase();
      const hayEncuesta = t.includes('experiencia') ||
                          t.includes('opinión') || t.includes('opinion');
      // OJO: 'firme' a secas tambien coincide con 'CONFIRME', 'confirmed',
      // etc. Cualquier aviso del POS con esa palabra marcaba firmaFueVisible
      // y alteraba la logica de cierre. Se exige la frase completa o la
      // palabra aislada.
      const hayFirma = t.includes('firme aquí') || t.includes('firme aqui') ||
                       /\bfirme\b/.test(t);
      // Un modal solo cuenta como encuesta/firma si de verdad lo parece.
      // Antes bastaba CUALQUIER modal: un aviso transitorio del POS entre
      // ventas marcaba "la encuesta aparecio", y al desaparecer el monitor
      // bloqueaba el touch a los 2-6 segundos. Era el 15% de fallas que se
      // veia en produccion, siempre en ventanas que arrancaban poco
      // despues del cierre anterior.
      let hayModal = false;
      try {
        const modales = document.querySelectorAll('.modal.show, .modal[style*="display: block"]');
        for (const m of modales) {
          const r = m.getBoundingClientRect();
          if (r.width < 2 || r.height < 2) continue;
          const tm = (m.textContent || '').toLowerCase();
          // Tiene el texto de la encuesta o de la firma
          const esEncuesta = tm.includes('experiencia') || tm.includes('opinión') ||
                             tm.includes('opinion') || /\bfirme\b/.test(tm);
          // O es grande de verdad (la encuesta ocupa casi toda la pantalla)
          const esGrande = r.width > window.innerWidth * 0.5 &&
                           r.height > window.innerHeight * 0.4;
          if (esEncuesta || esGrande) { hayModal = true; break; }
        }
      } catch (e) {}

      if (hayFirma) firmaFueVisible = true;
      if (hayEncuesta || hayModal) encuestaFueVisible = true;

      const algoVisible = hayEncuesta || hayFirma || hayModal;

      // --- Caso devolucion: activado por firma ---
      // Si la firma ya se vio y ya no esta, esperamos la encuesta antes de cerrar.
      if (esFirma && firmaFueVisible && !hayFirma && !encuestaFueVisible) {
        checksTrasCerrarFirma++;
        // Aun dentro de la ventana de gracia: mantener touch, esperar encuesta
        if (checksTrasCerrarFirma <= GRACIA_ENCUESTA_CHECKS) {
          return;
        }
        // Paso la ventana y nunca aparecio la encuesta -> re-bloquear
        log('Firma cerrada y no aparecio encuesta -> re-bloqueando');
        desactivarTouch();
        clearInterval(intervalId);
        return;
      }

      // --- Cierre normal: algo fue visible (encuesta/firma) y ya desaparecio ---
      const yaAparecioAlgo = encuestaFueVisible || firmaFueVisible;

      if (yaAparecioAlgo && !algoVisible) {
        // Si venimos de firma pero aun no vimos encuesta, lo maneja el bloque de arriba.
        if (esFirma && !encuestaFueVisible) return;

        // ── CONFIRMACION POR VARIAS LECTURAS ──
        // La encuesta se cierra sola en dos casos: el cliente toca la
        // carita (se cierra al instante) o se agota la barra de tiempo.
        // En ambos hay que bloquear enseguida, asi que NO se puede esperar
        // hasta la expiracion: eso dejaria el touch abierto de mas cuando
        // el cliente responde rapido.
        //
        // Pero tampoco se puede bloquear con UNA sola lectura: un
        // re-render de TopManage o la animacion de la barra hacen que
        // innerText no traiga el texto por un instante, y ahi se bloqueaba
        // con la carita en pantalla. Era la causa de la intermitencia.
        //
        // Solucion: exigir varias lecturas seguidas. Si el cliente
        // responde, se bloquea 1.5s despues (imperceptible). Si es un
        // fallo de lectura, la siguiente lectura reinicia el contador.
        desapariciones++;
        if (desapariciones < DESAPARICIONES_PARA_CERRAR) {
          return;
        }

        log(`Encuesta/firma cerrada (${desapariciones} lecturas seguidas sin verla)`);
        desactivarTouch();
        clearInterval(intervalId);
        return;
      }

      // Volvio a verse: se reinicia el contador de desapariciones
      if (algoVisible && desapariciones > 0) {
        log(`Falsa alarma: la encuesta sigue visible (se habian contado ${desapariciones} lecturas)`);
        desapariciones = 0;
      }

      // ── RED DE SEGURIDAD CON EL EXPIRY DEL POS ──
      // Si el DOM nunca reporta el cierre (por ejemplo porque el texto
      // quedo en la pagina), se fuerza el bloqueo pasada la expiracion
      // que informo el POS mas un margen. Asi el touch no queda abierto
      // indefinidamente.
      if (expiraEncuestaMs && Date.now() > (expiraEncuestaMs + MARGEN_TRAS_EXPIRY_MS)) {
        log('Paso la expiracion que informo el POS: re-bloqueando por seguridad');
        desactivarTouch();
        clearInterval(intervalId);
        return;
      }

      // Re-bloquear si nunca aparecio nada (venta cancelada, etc.)
      if (!yaAparecioAlgo && checks > (CONFIG.TIMEOUT_SIN_ENCUESTA_SEG * 2)) {
        log('No aparecio encuesta/firma, re-bloqueando');
        desactivarTouch();
        clearInterval(intervalId);
      }
    }, 500);
    monitorCierreId = intervalId;
  }

  // ============================================================
  // DETECCION POR postMessage (encuesta / firma / fin de venta)
  // El POS envia mensajes por postMessage con eventName "userPrompt":
  //   - questionType "rating"    -> encuesta de satisfaccion
  //   - questionType "signature" -> firma de devolucion (dura mas)
  // Orden temporal al terminar una venta:
  //   1. GETRECEIPTINFORMATIONFORSALESSCREEN (con pago completo) -> el MAS temprano
  //   2. onReceiptPrint (al imprimir recibo) -> ~1-2s antes de la encuesta
  //   3. userPrompt + rating (encuesta ya visible) -> respaldo
  // Activamos en el paso 1 para dar al driver HID (~3s) tiempo de estar
  // listo ANTES de que aparezca la encuesta.
  // ============================================================

  // Detecta el fin de venta real (pago completo) para pre-activar el touch
  // lo antes posible. Requiere un pago con status "1" o "5" para no activarse
  // en simples actualizaciones de ticket.
  function esFinDeVentaConPagoTexto(str) {
    if (str.indexOf('GETRECEIPTINFORMATIONFORSALESSCREEN') === -1) return false;
    try {
      const data = JSON.parse(str);
      const payItems = data.payItems || [];
      if (payItems.length === 0) return false;
      return payItems.some(p => p && (p.status === '1' || p.status === '5'));
    } catch (e) {
      return false;
    }
  }

  // Version para objetos: accede a payItems directo, sin parsear nada
  function esFinDeVentaConPagoObj(d) {
    const items = d && d.payItems;
    if (!Array.isArray(items) || items.length === 0) return false;
    return items.some(p => p && (p.status === '1' || p.status === '5'));
  }

  // ============================================================
  // RENDIMIENTO: no serializar los mensajes del POS
  // ------------------------------------------------------------
  // Antes se hacia JSON.stringify(data) en CADA mensaje. El POS envia
  // objetos grandes (receiptStore, userStore), y eso bloqueaba el hilo
  // principal cientos de milisegundos ("'message' handler took 458ms"),
  // retrasando justamente la deteccion que debe ser inmediata.
  // Ahora se revisan solo los campos de primer nivel que son texto.
  // ============================================================
  const CAMPOS_CLAVE = [
    'eventName', 'event', 'type', 'name', 'command', 'action',
    'questionType', 'promptType', 'id', 'questionId'
  ];

  // Busca una aguja en los campos de texto de primer nivel (barato)
  function objContiene(d, aguja) {
    for (let i = 0; i < CAMPOS_CLAVE.length; i++) {
      const v = d[CAMPOS_CLAVE[i]];
      if (typeof v === 'string' && v.indexOf(aguja) !== -1) return true;
    }
    // Recorrido de primer nivel, solo valores primitivos: no toca los
    // objetos anidados grandes, asi que sigue siendo barato.
    for (const k in d) {
      const v = d[k];
      if (typeof v === 'string' && v.indexOf(aguja) !== -1) return true;
    }
    return false;
  }

  window.addEventListener('message', (event) => {
    try {
      const data = event.data;
      if (!data) return;

      const esTexto = (typeof data === 'string');
      if (!esTexto && typeof data !== 'object') return;

      // --- Trigger: FIRMA de devolucion ---
      const hayUserPrompt = esTexto ? (data.indexOf('userPrompt') !== -1)
                                    : objContiene(data, 'userPrompt');
      const haySignature  = esTexto ? (data.indexOf('signature') !== -1)
                                    : objContiene(data, 'signature');
      if (hayUserPrompt && haySignature) {
        if (!touchActivado) activarTouch('firma');
        return;
      }

      // --- Trigger 0 (EL MAS TEMPRANO): fin de venta con pago completo ---
      const finVenta = esTexto ? esFinDeVentaConPagoTexto(data)
                               : esFinDeVentaConPagoObj(data);
      if (finVenta) {
        if (!touchActivado) activarTouch('pago-completo');
        return;
      }

      // --- Trigger: onReceiptPrint ---
      const hayReceiptPrint = esTexto ? (data.indexOf('onReceiptPrint') !== -1)
                                      : objContiene(data, 'onReceiptPrint');
      if (hayReceiptPrint) {
        if (!touchActivado) activarTouch('onReceiptPrint');
        return;
      }

      // Aprovechar el dato de expiracion que trae el propio mensaje
      if (hayUserPrompt) registrarExpiry(data);

      // --- Trigger: encuesta (rating) ---
      if (hayUserPrompt) {
        const hayRating = esTexto ? (data.indexOf('rating') !== -1)
                                  : objContiene(data, 'rating');
        if (hayRating || (!esTexto && typeof data.questionType === 'string')) {
          if (!touchActivado) activarTouch('userPrompt');
        }
      }
    } catch (e) {}
  }, true);

  // ============================================================
  // DETECCION POR WEBSOCKET (respaldo, mismo canal del POS)
  // ============================================================
  function instalarInterceptorWebSocket() {
    const OriginalWebSocket = window.WebSocket;

    window.WebSocket = function(url, protocols) {
      const ws = new OriginalWebSocket(url, protocols);

      ws.addEventListener('message', (event) => {
        try {
          const data = event.data;
          if (typeof data !== 'string') return;
          // Firma de devolucion por WebSocket
          if (data.indexOf('userPrompt') !== -1) registrarExpiry(data);
          if (data.includes('userPrompt') && data.includes('signature')) {
            if (!touchActivado) activarTouch('firma-WS');
            return;
          }
          // Trigger mas temprano: fin de venta con pago completo (~3s de margen)
          if (esFinDeVentaConPagoTexto(data)) {
            if (!touchActivado) activarTouch('pago-completo-WS');
            return;
          }
          if (data.includes('onReceiptPrint')) {
            if (!touchActivado) activarTouch('onReceiptPrint-WS');
          }
        } catch (err) {}
      });

      return ws;
    };

    // Copiar propiedades estaticas del WebSocket original
    Object.setPrototypeOf(window.WebSocket, OriginalWebSocket);
    Object.setPrototypeOf(window.WebSocket.prototype, OriginalWebSocket.prototype);
    for (const key of Object.keys(OriginalWebSocket)) {
      try { window.WebSocket[key] = OriginalWebSocket[key]; } catch (e) {}
    }
  }
  instalarInterceptorWebSocket();

  // ============================================================
  // COMANDOS DE DEBUG
  // ============================================================
  window.addEventListener('tia_touch_debug', () => {
    console.log('=== TIA TOUCH DEBUG ===');
    console.log('Touch activado:', touchActivado);
    console.log('Helper URL:', CONFIG.TOUCH_HELPER_URL);
  });
  window.addEventListener('tia_touch_test_on', () => activarTouch('test-manual'));
  window.addEventListener('tia_touch_test_off', () => desactivarTouch());

  log('Modulo de control tactil iniciado (unico controlador del touch)');
})();
