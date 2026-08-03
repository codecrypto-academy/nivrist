// Manifest V3 tipado — se genera dist/manifest.json en el build (plugin en vite.config.ts).
// Typed Manifest V3 — dist/manifest.json is generated at build time.

interface ManifestV3 {
  manifest_version: 3;
  name: string;
  version: string;
  description: string;
  permissions: string[];
  host_permissions: string[];
  action: { default_popup: string; default_icon: Record<string, string> };
  background: { service_worker: string; type: "module" };
  content_scripts: Array<{ matches: string[]; js: string[]; run_at: string; all_frames: boolean }>;
  web_accessible_resources: Array<{ resources: string[]; matches: string[] }>;
  icons: Record<string, string>;
}

const manifest: ManifestV3 = {
  manifest_version: 3,
  name: "CodeCrypto Wallet",
  version: "1.0.0",
  description: "Ethereum wallet extension with EIP-1193, EIP-712, EIP-1559 and EIP-6963 support",
  permissions: ["storage", "activeTab", "tabs", "notifications"],
  host_permissions: ["http://localhost:8545/*", "http://127.0.0.1:8545/*", "https://rpc.sepolia.org/*"],
  action: {
    default_popup: "index.html",
    default_icon: { "16": "vite.svg", "48": "vite.svg", "128": "vite.svg" },
  },
  background: { service_worker: "background.js", type: "module" },
  content_scripts: [
    { matches: ["<all_urls>"], js: ["content-script.js"], run_at: "document_start", all_frames: true },
  ],
  web_accessible_resources: [{ resources: ["inject.js"], matches: ["<all_urls>"] }],
  icons: { "16": "vite.svg", "48": "vite.svg", "128": "vite.svg" },
};

export default manifest;
