import { NextFunction, Request, Response } from "express";
import { NotificationService } from "./notification.service";
import { sseManager } from "../../config/sse";

const svc = new NotificationService();

export class NotificationController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) { res.status(401).json({ message: "Unauthorized" }); return; }
      res.json(await svc.list(req.user.id));
    } catch (e) { next(e); }
  }

  async markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) { res.status(401).json({ message: "Unauthorized" }); return; }
      res.json(await svc.markAsRead(req.params.id as string, req.user.id));
    } catch (e) { next(e); }
  }

  async markAllRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) { res.status(401).json({ message: "Unauthorized" }); return; }
      res.json(await svc.markAllRead(req.user.id));
    } catch (e) { next(e); }
  }

  async deleteAllRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) { res.status(401).json({ message: "Unauthorized" }); return; }
      res.json(await svc.deleteAllRead(req.user.id));
    } catch (e) { next(e); }
  }

  /**
   * GET /notifications/stream
   *
   * Abre uma conexão SSE persistente para o usuário autenticado.
   * O cliente recebe eventos em tempo real sempre que uma nova notificação
   * é criada para ele no banco — sem necessidade de polling.
   *
   * Atenção:
   * - O heartbeat a cada 30s mantém a conexão viva no Render (que fecha idle após ~55s)
   * - O clearInterval no req.on("close") evita intervals zumbi em memória
   * - X-Accel-Buffering: no desativa o buffer do Nginx/proxy intermediário
   */
  stream(req: Request, res: Response): void {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const userId = req.user.id;

    // ── Headers SSE ────────────────────────────────────────────────────────────
    res.setHeader("Content-Type",      "text/event-stream");
    res.setHeader("Cache-Control",     "no-cache");
    res.setHeader("Connection",        "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // desativa buffer do Nginx/Render
    res.flushHeaders();

    // ── Registro da conexão ────────────────────────────────────────────────────
    sseManager.add(userId, res);
    console.log(`[SSE] Usuário ${userId} conectado — total: ${sseManager.activeConnections}`);

    // Confirma conexão ao cliente
    res.write(`event: connected\ndata: ${JSON.stringify({ userId })}\n\n`);

    // ── Heartbeat a cada 30s ───────────────────────────────────────────────────
    // Comentário SSE (linha iniciada com ":") é ignorado pelo cliente
    // mas mantém a conexão TCP viva através de proxies e do Render
    const heartbeat = setInterval(() => {
      try {
        res.write(":heartbeat\n\n");
      } catch {
        clearInterval(heartbeat);
      }
    }, 30_000);

    // ── Cleanup ao desconectar ─────────────────────────────────────────────────
    req.on("close", () => {
      clearInterval(heartbeat);          // ← evita interval zumbi em memória
      sseManager.remove(userId, res);
      console.log(`[SSE] Usuário ${userId} desconectado — total: ${sseManager.activeConnections}`);
    });
  }
}

