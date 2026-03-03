import { prisma } from "../../config/prisma";

export class DashboardService {
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

  // Atividade recente dos projetos que o usuário acompanha (para notificações)
  // Retorna apenas posts/publicações criados APÓS a inscrição do usuário em cada projeto
  async subscribedActivity(userId: string) {
    const subs = await prisma.subscription.findMany({
      where: { userId },
      select: { projectId: true, createdAt: true },
    });
    if (subs.length === 0) return { posts: [], publications: [] };

    // Filtro por projeto: somente conteúdo criado após a data de inscrição
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
        where: { OR: projectFilters },
        include: { project: { select: { id: true, title: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    return { posts, publications };
  }
}
