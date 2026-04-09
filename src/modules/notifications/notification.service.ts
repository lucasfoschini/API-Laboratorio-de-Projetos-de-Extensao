import { prisma } from "../../config/prisma";
import { HttpError } from "../../utils/http-error";
import { sseManager } from "../../config/sse";

export class NotificationService {
  async list(userId: string) {
    // Autolimpeza: remove notificações lidas mais velhas que 7 dias
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    await prisma.notification.deleteMany({
      where: {
        userId,
        read: true,
        createdAt: { lt: sevenDaysAgo }
      }
    }).catch(e => console.error("Erro na autolimpeza de notificações:", e));

    return prisma.notification.findMany({
      where: { userId },
      include: {
        project: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async markAsRead(notificationId: string, userId: string) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });
    if (!notification) throw new HttpError(404, "Notificação não encontrada");
    if (notification.userId !== userId) throw new HttpError(403, "Acesso negado");

    return prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });
  }

  async markAllRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, read: false },
      data:  { read: true },
    });
  }

  async deleteAllRead(userId: string) {
    return prisma.notification.deleteMany({
      where: { userId, read: true },
    });
  }

  /** Helper estático para criar notificações a partir de outros services */
  static async create(data: { userId: string; type: string; message: string; projectId?: string }) {
    const notification = await prisma.notification.create({ data });

    // Emite evento SSE em tempo real para o usuário destinatário (se conectado)
    sseManager.emit(data.userId, "notification", {
      id:        notification.id,
      type:      notification.type,
      message:   notification.message,
      projectId: notification.projectId ?? null,
      createdAt: notification.createdAt,
    });

    return notification;
  }
}

