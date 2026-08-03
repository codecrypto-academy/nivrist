// content-script.ts — RELAY. Inyecta inject.js en la página y hace de puente:
//   página (postMessage) ↔ background (chrome.runtime) ↔ eventos → página.
// Sin imports: archivo autocontenido, cargable como content script clásico.

// 1) Inyectar inject.js en el contexto de la página.
try {
  const s = document.createElement("script");
  s.src = chrome.runtime.getURL("inject.js");
  s.onload = () => s.remove();
  (document.head || document.documentElement).appendChild(s);
} catch (e) {
  // eslint-disable-next-line no-console
  console.error("CodeCrypto: no se pudo inyectar inject.js", e);
}

// 2) Página → background: reenviar solicitudes RPC y devolver la respuesta.
window.addEventListener("message", (event: MessageEvent) => {
  const d = event.data;
  if (event.source !== window || !d || d.type !== "CODECRYPTO_REQUEST") return;

  chrome.runtime.sendMessage(
    { type: "CODECRYPTO_RPC", method: d.method, params: d.params },
    (response: { result?: unknown; error?: string } | undefined) => {
      const err = chrome.runtime.lastError?.message;
      window.postMessage(
        {
          type: "CODECRYPTO_RESPONSE",
          id: d.id,
          result: response?.result,
          error: err || response?.error,
        },
        "*"
      );
    }
  );
});

// 3) background → página: reenviar eventos (accountsChanged / chainChanged).
chrome.runtime.onMessage.addListener((message: { type?: string; eventName?: string; data?: unknown }) => {
  if (message?.type === "CODECRYPTO_EVENT") {
    window.postMessage(
      { type: "CODECRYPTO_EVENT", eventName: message.eventName, data: message.data },
      "*"
    );
  }
});
