chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

  if (request.action === "capturarPantalla") {
    chrome.tabs.captureVisibleTab(
      null,
      { format: "png" },
      (dataUrl) => {
        sendResponse({ imagen: dataUrl });
      }
    );
    return true;
  }

  // ============================================================
  // CONSULTA BE YOU / CAMPEON PASS (programa de lealtad, API Clau.io)
  // ------------------------------------------------------------
  // Se hace desde el background y no desde el content script por dos
  // razones: el background no lo bloquea CORS (tiene host_permissions),
  // y asi el apikey nunca entra al contexto de la pagina del POS.
  // ============================================================
  if (request.action === "consultarBeYou") {
    (async () => {
      try {
        // Leer la configuracion (apikey, url, appid) del config.json
        const cfgResp = await fetch(chrome.runtime.getURL("config.json"), { cache: "no-store" });
        const cfg = await cfgResp.json();
        const by = cfg.beyou || {};

        if (!by.api_url) {
          sendResponse({ ok: false, error: "Falta api_url en config.json" });
          return;
        }
        if (!by.apikey || by.apikey.indexOf("PENDIENTE") === 0) {
          sendResponse({ ok: false, error: "sin-apikey" });
          return;
        }

        const headers = {
          "Content-Type": "application/json",
          "apikey": by.apikey
        };
        if (by.origen) headers["origen"] = by.origen;
        if (by.appid)  headers["APPID"]  = String(by.appid);

        const resp = await fetch(by.api_url, {
          method: "POST",
          headers: headers,
          body: JSON.stringify({ cliente: request.cliente || {} })
        });

        const texto = await resp.text();
        let data = null;
        try { data = JSON.parse(texto); } catch (e) {}

        sendResponse({
          ok: resp.ok,
          status: resp.status,
          data: data,
          crudo: data ? null : texto.substring(0, 300)
        });
      } catch (e) {
        sendResponse({ ok: false, error: e.message });
      }
    })();
    return true;
  }

});

// ============================================================
// DEVOLVER EL FOCO A LA VENTANA DE LA CAJERA
// ------------------------------------------------------------
// Lo pide tia-pos.js cuando termina la encuesta. Se busca la ventana de
// Chrome que NO es la del sidecar y se la enfoca.
//
// Es lo unico que puede hacerse desde la extension: Windows mueve el
// foco en el WM_POINTERDOWN, antes de que la pagina vea el evento, asi
// que el foco se RECUPERA, no se previene.
// ============================================================
const TIA_URL_SIDECAR = "/sidecarscreen/";

async function tiaDevolverFocoCajera(windowIdSidecar, motivo) {
  try {
    const ventanas = await chrome.windows.getAll({ populate: true });
    let destino = null;

    for (const w of ventanas) {
      if (w.id === windowIdSidecar) continue;
      const tabs = w.tabs || [];

      // Se prefiere una ventana con una pestana del POS que NO sea el
      // sidecar. Si no aparece ninguna, sirve cualquier otra ventana.
      const esPos = tabs.some(function (t) {
        return t.url &&
               t.url.indexOf(TIA_URL_SIDECAR) === -1 &&
               /^https?:\/\/(localhost|127\.0\.0\.1)/.test(t.url);
      });
      if (esPos) { destino = w; break; }
      if (!destino) destino = w;
    }

    if (!destino) {
      console.warn("[TIA Foco] No encontre la ventana de la cajera");
      return;
    }

    await chrome.windows.update(destino.id, { focused: true });
    console.log("[TIA Foco] Foco devuelto a la ventana " + destino.id +
                " (" + (motivo || "sin motivo") + ")");
  } catch (e) {
    console.warn("[TIA Foco] No pude devolver el foco:", e.message);
  }
}

chrome.runtime.onMessage.addListener(function (request, sender) {
  if (request && request.action === "devolverFocoCajera") {
    tiaDevolverFocoCajera(sender.tab ? sender.tab.windowId : null, request.motivo);
  }
  return false;
});

// ============================================================
// SOLUCIONES: refrescar pantallas y cerrar navegador
// ------------------------------------------------------------
// Lo pide tia-pos.js desde el menu del panel. Va aca porque una pagina
// no puede recargar ni cerrar otra ventana: solo el service worker puede.
// ============================================================

// --- Refrescar las DOS pantallas (cajera + cliente) ---
async function tiaRefrescarTodo() {
  try {
    const tabs = await chrome.tabs.query({});
    let n = 0;
    for (const t of tabs) {
      if (!t.url) continue;
      // Solo las pestanas del POS; no se tocan otras que la cajera tenga abiertas.
      if (!/^https?:\/\/(localhost|127\.0\.0\.1)/.test(t.url)) continue;
      try { await chrome.tabs.reload(t.id, { bypassCache: false }); n++; } catch (e) {}
    }
    console.log("[TIA Soluciones] " + n + " pestana(s) del POS recargada(s)");
  } catch (e) {
    console.warn("[TIA Soluciones] No pude refrescar:", e.message);
  }
}

// --- Cerrar el navegador ---
// ORDEN IMPORTANTE: la ventana desde donde se pulso se cierra AL FINAL.
async function tiaCerrarNavegador(windowIdOrigen) {
  try {
    const ventanas = await chrome.windows.getAll();
    console.log("[TIA Soluciones] Cerrando " + ventanas.length + " ventana(s)");
    for (const w of ventanas) {
      if (w.id === windowIdOrigen) continue;
      try { await chrome.windows.remove(w.id); } catch (e) {}
    }
    if (windowIdOrigen) {
      try { await chrome.windows.remove(windowIdOrigen); } catch (e) {}
    }
  } catch (e) {
    console.warn("[TIA Soluciones] No pude cerrar:", e.message);
  }
}

chrome.runtime.onMessage.addListener(function (request, sender) {
  if (!request) return false;
  if (request.action === "tiaRefrescarTodo") { tiaRefrescarTodo(); return false; }
  if (request.action === "tiaCerrarNavegador") {
    tiaCerrarNavegador(sender.tab ? sender.tab.windowId : null);
    return false;
  }
  return false;
});
