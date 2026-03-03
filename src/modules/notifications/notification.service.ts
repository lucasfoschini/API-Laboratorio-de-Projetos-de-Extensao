import { prisma } from "../../config/prisma";
import { HttpError } from "../../utils/http-error";

export class NotificationService {
  async list(userId: string) {
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

  /** Helper estático para criar notificações a partir de outros services */
  static async create(data: { userId: string; type: string; message: string; projectId?: string }) {
    return prisma.notification.create({ data });
  }
}
