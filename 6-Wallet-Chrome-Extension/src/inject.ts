// inject.ts — corre en el CONTEXTO DE LA PÁGINA. Crea window.codecrypto (EIP-1193) y anuncia
// el provider por EIP-6963. Se comunica con content-script.ts vía window.postMessage.
// Sin imports: se compila a un archivo autocontenido cargable como script clásico.

type Handler = (...args: unknown[]) => void;

(function () {
  const CODECRYPTO_ICON =
    "data:image/svg+xml;base64," +
    btoa(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#6C4CF0"/><path d="M32 12l14 8v14c0 10-6 15-14 18-8-3-14-8-14-18V20z" fill="#8CF5C6"/></svg>'
    );

  let requestId = 0;
  const listeners: Record<string, Handler[]> = {};

  const provider = {
    isCodeCrypto: true,
    isMetaMask: false,

    request(args: { method: string; params?: unknown[] }): Promise<unknown> {
      const id = ++requestId;
      window.postMessage(
        { type: "CODECRYPTO_REQUEST", id, method: args.method, params: args.params || [] },
        "*"
      );
      return new Promise((resolve, reject) => {
        const handler = (event: MessageEvent) => {
          const d = event.data;
          if (d && d.type === "CODECRYPTO_RESPONSE" && d.id === id) {
            window.removeEventListener("message", handler);
            d.error ? reject(new Error(d.error)) : resolve(d.result);
          }
        };
        window.addEventListener("message", handler);
        setTimeout(() => {
          window.removeEventListener("message", handler);
          reject(new Error("CodeCrypto: request timeout"));
        }, 60000);
      });
    },

    on(eventName: string, callback: Handler) {
      (listeners[eventName] ||= []).push(callback);
    },
    removeListener(eventName: string, callback: Handler) {
      const arr = listeners[eventName];
      if (!arr) return;
      const i = arr.indexOf(callback);
      if (i > -1) arr.splice(i, 1);
    },
  };

  (window as unknown as { codecrypto: typeof provider }).codecrypto = provider;

  // Eventos que llegan desde el background (accountsChanged / chainChanged).
  window.addEventListener("message", (event) => {
    const d = event.data;
    if (d && d.type === "CODECRYPTO_EVENT") {
      (listeners[d.eventName] || []).forEach((cb) => {
        try {
          cb(d.data);
        } catch {
          /* listener error */
        }
      });
    }
  });

  // EIP-6963: Multi Injected Provider Discovery.
  const info = {
    uuid: "b4f2c1a0-1e2d-4a6b-9c3d-codecrypto001",
    name: "CodeCrypto",
    icon: CODECRYPTO_ICON,
    rdns: "io.codecrypto.wallet",
  };
  function announce() {
    window.dispatchEvent(
      new CustomEvent("eip6963:announceProvider", { detail: Object.freeze({ info, provider }) })
    );
  }
  window.addEventListener("eip6963:requestProvider", announce);
  announce();

  // eslint-disable-next-line no-console
  console.log("🚀 CodeCrypto provider inyectado (window.codecrypto)");
})();
