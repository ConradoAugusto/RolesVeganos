import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";

// Só no "npm run dev": recebe o estado do painel e grava em src/data/dados.json.
// Antes de gravar, guarda uma cópia do arquivo anterior em backups/.
function salvarDados() {
  return {
    name: "salvar-dados",
    apply: "serve",
    // Quando o dados.json muda, recarrega a página inteira (o hot reload parcial quebraria o estado do app)
    handleHotUpdate({ file, server }) {
      if (file.replace(/\\/g, "/").endsWith("/src/data/dados.json")) {
        server.ws.send({ type: "full-reload" });
        return [];
      }
    },
    configureServer(server) {
      server.middlewares.use("/__salvar-dados", (req, res) => {
        const responder = (status, corpo) => {
          res.statusCode = status;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(corpo));
        };
        if (req.method !== "POST") return responder(405, { ok: false, erro: "use POST" });
        let corpo = "";
        req.on("data", (c) => (corpo += c));
        req.on("end", () => {
          try {
            const dados = JSON.parse(corpo);
            if (!Array.isArray(dados.places) || !Array.isArray(dados.users) || !dados.users.some((u) => u.role === "admin" && u.senhaHash)) {
              throw new Error("formato inválido");
            }
            const raiz = server.config.root;
            const arq = path.join(raiz, "src/data/dados.json");
            const pastaBackup = path.join(raiz, "backups");
            fs.mkdirSync(pastaBackup, { recursive: true });
            fs.copyFileSync(arq, path.join(pastaBackup, `dados-${new Date().toISOString().replace(/[:.]/g, "-")}.json`));
            fs.writeFileSync(arq, JSON.stringify(dados, null, 2) + "\n");
            responder(200, { ok: true });
          } catch (e) {
            responder(400, { ok: false, erro: e.message });
          }
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), salvarDados()],
});
