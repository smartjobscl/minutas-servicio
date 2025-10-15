import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

function ErrorBoundary({ children }) {
  const [err, setErr] = React.useState(null);

  React.useEffect(() => {
    const onError = (event) => setErr(event.error || new Error(event.message));
    const onRejection = (e) => setErr(e.reason);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  if (err) {
    return (
      <div style={{ padding: 16, fontFamily: "sans-serif" }}>
        <h2>Ocurrió un error en la aplicación</h2>
        <p style={{ color: "#b00020" }}>{String(err?.message || err)}</p>
        <pre style={{ background: "#f6f8fa", padding: 12, overflow: "auto" }}>
{String(err?.stack || "")}
        </pre>
        <p>Abre la consola del navegador (F12 → Console) para más detalles.</p>
      </div>
    );
  }

  return children;
}

const container = document.getElementById("root");
createRoot(container).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

