import { prisma } from "../../config/prisma";
import { cached, invalidateByPrefix } from "../../config/cache";

export class DashboardService {
  async overview(userId: string) {
    // Cache por usuário — 30 segundos
    return cached(`dashboard:overview:${userId}`, 30, async () => {
      const [stats, projects, requests, pendingRequests, subscriptions] = await Promise.all([
        this.stats(userId),
        this.myProjects(userId),
        this.myRequests(userId),
        this.pendingRequests(userId),
        this.mySubscriptions(userId),
      ]);
      return { stats, projects, requests, pendingRequests, subscriptions };
    });
  }

  async notificationSummary(userId: string) {
    // Cache por usuário — 60 segundos
    return cached(`dashboard:notif:${userId}`, 60, async () => {
      const [pendingRequests, subscriptions, systemNotifications] = await Promise.all([
        prisma.memberRequest.findMany({
          where: { project: { ownerId: userId }, status: "PENDING" },
          include: {
            user:    { select: { id: true, name: true, avatar: true } },
            project: { select: { id: true, title: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
        prisma.subscription.findMany({
          where: { userId },
          select: { projectId: true, createdAt: true },
        }),
        prisma.notification.findMany({
          where: { userId, read: false },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
      ]);

      let posts: any[]        = [];
      let publications: any[] = [];

      if (subscriptions.length > 0) {
        const projectFilters = subscriptions.map((s) => ({
          projectId: s.projectId,
          createdAt: { gte: s.createdAt },
        }));

        [posts, publications] = await Promise.all([
          prisma.post.findMany({
            where: { OR: projectFilters },
            include: { project: { select: { id: true, title: true } } },
            orderBy: { createdAt: "desc" },
            take: 20,
          }),
          prisma.publication.findMany({
            where: { OR: projectFilters.map(f => ({ ...f, approved: true })) },
            include: { project: { select: { id: true, title: true } } },
            orderBy: { createdAt: "desc" },
            take: 10,
          }),
        ]);
      }

      return {
        pendingRequests,
        subscriptions,
        activity: { posts, publications },
        systemNotifications,
      };
    });
  }

  // Invalida o cache do usuário quando dados mudam
  static invalidateUser(userId: string) {
    invalidateByPrefix(`dashboard:overview:${userId}`);
    invalidateByPrefix(`dashboard:notif:${userId}`);
  }

  async stats(userId: string) {
    const [ownedCount, memberCount, subsCount, pendingRequests, postsCount] = await Promise.all([
      prisma.project.count({ where: { ownerId: userId } }),
      prisma.project.count({ where: { members: { some: { id: userId } }, ownerId: { not: userId } } }),
      prisma.subscription.count({ where: { userId } }),
      prisma.memberRequest.count({ where: { project: { ownerId: userId }, status: "PENDING" } }),
      prisma.post.count({ where: { authorId: userId } }),
    ]);
    return { ownedCount, memberCount, subsCount, pendingRequests, postsCount };
  }

  async myProjects(userId: string) {
    const projects = await prisma.project.findMany({
      where: { members: { some: { id: userId } } },
      include: {
        owner:   { select: { id: true, name: true, avatar: true } },
        members: { select: { id: true, name: true, avatar: true } },
        _count:  { select: { members: true, subscriptions: true, posts: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    });
    return projects.map(({ _count, ...p }) => ({
      ...p, enrolled: _count.members, subscribersCount: _count.subscriptions, postsCount: _count.posts,
      isOwner: p.ownerId === userId,
    }));
  }

  async myRequests(userId: string) {
    return prisma.memberRequest.findMany({
      where: { userId },
      include: { project: { select: { id: true, title: true, area: true, status: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async pendingRequests(userId: string) {
    return prisma.memberRequest.findMany({
      where: { project: { ownerId: userId }, status: "PENDING" },
      include: {
        user:    { select: { id: true, name: true, email: true, avatar: true, department: true } },
        project: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async mySubscriptions(userId: string) {
    return prisma.subscription.findMany({
      where: { userId },
      include: {
        project: {
          include: {
            owner:  { select: { id: true, name: true, avatar: true } },
            _count: { select: { members: true, posts: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async subscribedActivity(userId: string) {
    const subs = await prisma.subscription.findMany({
      where: { userId },
      select: { projectId: true, createdAt: true },
    });
    if (subs.length === 0) return { posts: [], publications: [] };

    const projectFilters = subs.map((s) => ({
      projectId: s.projectId,
      createdAt: { gte: s.createdAt },
    }));

    const [posts, publications] = await Promise.all([
      prisma.post.findMany({
        where: { OR: projectFilters },
        include: {
          project: { select: { id: true, title: true } },
          author:  { select: { id: true, name: true, avatar: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.publication.findMany({
        where: { OR: projectFilters.map(f => ({ ...f, approved: true })) },
        include: { project: { select: { id: true, title: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    return { posts, publications };
  }
}