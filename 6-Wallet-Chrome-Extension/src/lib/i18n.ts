// i18n bilingüe ligero (ES/EN) compartido por popup, connect y notification.
import { useCallback, useState } from "react";

export type Lang = "es" | "en";

const DICT: Record<string, { es: string; en: string }> = {
  title: { es: "CodeCrypto Wallet", en: "CodeCrypto Wallet" },
  loadWallet: { es: "Cargar wallet", en: "Load wallet" },
  enterMnemonic: { es: "Frase de recuperación (12 palabras)", en: "Recovery phrase (12 words)" },
  useTest: { es: "Usar frase de prueba", en: "Use test phrase" },
  account: { es: "Cuenta", en: "Account" },
  network: { es: "Red", en: "Network" },
  balance: { es: "Balance", en: "Balance" },
  transfer: { es: "Transferir", en: "Transfer" },
  to: { es: "Para", en: "To" },
  amount: { es: "Cantidad (ETH)", en: "Amount (ETH)" },
  send: { es: "Enviar", en: "Send" },
  logs: { es: "Registro", en: "Logs" },
  reset: { es: "Reiniciar wallet", en: "Reset wallet" },
  copy: { es: "Copiar", en: "Copy" },
  copied: { es: "¡Copiado!", en: "Copied!" },
  invalidMnemonic: { es: "Frase inválida", en: "Invalid phrase" },
  loading: { es: "Cargando…", en: "Loading…" },
  // connect
  connectRequest: { es: "Solicitud de conexión", en: "Connection request" },
  chooseAccount: { es: "Elige la cuenta a compartir", en: "Choose the account to share" },
  connect: { es: "Conectar", en: "Connect" },
  cancel: { es: "Cancelar", en: "Cancel" },
  // notification
  confirmTx: { es: "Confirmar transacción", en: "Confirm transaction" },
  confirmSign: { es: "Confirmar firma", en: "Confirm signature" },
  approve: { es: "Aprobar", en: "Approve" },
  reject: { es: "Rechazar", en: "Reject" },
  value: { es: "Valor", en: "Value" },
  data: { es: "Datos", en: "Data" },
  message: { es: "Mensaje", en: "Message" },
  noRequest: { es: "Sin solicitud pendiente", en: "No pending request" },
};

export function useI18n() {
  const [lang, setLangState] = useState<Lang>(
    (typeof localStorage !== "undefined" && (localStorage.getItem("cc_lang") as Lang)) || "es"
  );
  const setLang = useCallback((l: Lang) => {
    localStorage.setItem("cc_lang", l);
    setLangState(l);
  }, []);
  const toggle = useCallback(() => setLang(lang === "es" ? "en" : "es"), [lang, setLang]);
  const t = useCallback((k: keyof typeof DICT) => DICT[k]?.[lang] ?? String(k), [lang]);
  return { lang, setLang, toggle, t };
}
