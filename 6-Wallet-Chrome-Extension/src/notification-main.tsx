import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Notification from "./Notification.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Notification />
  </StrictMode>
);
