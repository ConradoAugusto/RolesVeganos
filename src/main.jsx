import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AppProvider } from "./store/AppContext";
import { CidadeProvider } from "./store/CidadeContext";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppProvider>
        <CidadeProvider>
          <App />
        </CidadeProvider>
      </AppProvider>
    </BrowserRouter>
  </React.StrictMode>
);

// Avisa a animação de abertura (index.html) que o app já está na tela
requestAnimationFrame(() => window.__rvPronto?.());
