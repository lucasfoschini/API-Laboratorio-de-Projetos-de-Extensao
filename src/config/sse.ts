import type { Response } from "express";

/**
 * Gerenciador de conexões SSE em memória.
 *
 * Usa Set<Response> por userId para suportar múltiplas abas/dispositivos
 * simultaneamente — cada aba abre sua própria conexão EventSource.
 *
 * ⚠️  Single-instance only: funciona corretamente enquanto o backend
 * rodar em uma única instância (Render free tier). Se escalar para múltiplas
 * instâncias no futuro, substituir pelo Redis Pub/Sub.
 */
class SseManager {
  private connections = new Map<string, Set<Response>>();

  /** Registra uma nova conexão SSE para o usuário. */
  add(userId: string, res: Response): void {
    if (!this.connections.has(userId)) {
      this.connections.set(userId, new Set());
    }
    this.connections.get(userId)!.add(res);
  }

  /** Remove a conexão ao desconectar — limpa o Map se não restar mais nenhuma. */
  remove(userId: string, res: Response): void {
    const set = this.connections.get(userId);
    if (!set) return;
    set.delete(res);
    if (set.size === 0) this.connections.delete(userId);
  }

  /**
   * Emite um evento SSE para todas as conexões abertas de um usuário.
   * Se o usuário não estiver conectado, não faz nada (notificação fica no banco).
   */
  emit(userId: string, event: string, data: unknown): void {
    const set = this.connections.get(userId);
    if (!set || set.size === 0) return;

    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

    for (const res of set) {
      try {
        res.write(payload);
      } catch {
        // A conexão foi encerrada mas o cleanup ainda não rodou — ignora silenciosamente
      }
    }
  }

  /**
   * Emite um evento SSE global para TODAS as abas e usuários conectados.
   */
  broadcast(event: string, data: unknown): void {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const set of this.connections.values()) {
      for (const res of set) {
        try {
          res.write(payload);
        } catch {
          // ignora falhas individuais
        }
      }
    }
  }

  /** Retorna o número de conexões ativas (útil para logging/debug). */
  get activeConnections(): number {
    let total = 0;
    for (const set of this.connections.values()) total += set.size;
    return total;
  }
}

export const sseManager = new SseManager();
