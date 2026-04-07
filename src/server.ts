import { app } from "./app";
import { env } from "./config/env";
import https from "https";
import http from "http";

app.listen(env.PORT, () => {
  console.log(`Server running on port ${env.PORT}`);

  // Impede que a instância gratuita do Render durma após 15 minutos de inatividade
  // O Render fornece a variável RENDER_EXTERNAL_URL automaticamente
  const url = process.env.RENDER_EXTERNAL_URL;
  if (url) {
    console.log(`[Keep-Alive] Configurado para "pingar" ${url} a cada 12 minutos.`);
    setInterval(() => {
      const pinger = url.startsWith("https") ? https : http;
      pinger.get(url, (res) => {
        console.log(`[Keep-Alive] Ping em ${url} - Status: ${res.statusCode}`);
      }).on("error", (err) => {
        console.error(`[Keep-Alive] Erro ao pingar: ${err.message}`);
      });
    }, 12 * 60 * 1000); // 12 minutos em milissegundos
  }
});
