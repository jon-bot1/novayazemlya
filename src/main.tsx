import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Redirect lovable.app visitors to custom domain
if (
  typeof window !== 'undefined' &&
  window.location.hostname.endsWith('.lovable.app') &&
  !window.location.hostname.includes('preview')
) {
  window.location.replace(`https://novaya-zemlya.com${window.location.pathname}${window.location.search}${window.location.hash}`);
} else {
  createRoot(document.getElementById("root")!).render(<App />);
}
