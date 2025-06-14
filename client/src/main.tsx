import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
// Temporarily disabled until it works correctly
// import { LanguageProvider } from "./providers/LanguageProvider";

createRoot(document.getElementById("root")!).render(
  // <LanguageProvider>
    <App />
  // </LanguageProvider>
);
