import { MediaType } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { HttpError } from "../../utils/http-error";

interface MediaInput { type: MediaType; url: string; title?: string; caption?: string; }

interface CreatePostInput {
  title:   string;
  content: string;
  media?:  MediaInput[];
}

const POST_INCLUDE = {
  author: { select: { id: true, name: true, avatar: true, department: true } },
  media:  true,
  project: { select: { id: true, title: true, ownerId: true } },
} as const;

export class PostService {
  async create(projectId: string, authorId: string, input: CreatePostInput) {
    // Verifica se o autor é membro do projeto
    const project = await prisma.project.findFirst({
      where: { id: projectId, members: { some: { id: authorId } } },
    });
    if (!project) throw new HttpError(403, "Apenas membros do projeto podem publicar atualizações");

    const data: any = {
      title: input.title,
      content: input.content,
      projectId,
      authorId,
    };
    if (input.media) {
      data.media = { create: input.media };
    }

    const post = await prisma.post.create({
      data,
      include: POST_INCLUDE,
    });

    // Notificar inscritos (futuramente: e-mail/push — aqui só registra)
    const subs = await prisma.subscription.findMany({ where: { projectId }, select: { userId: true } });
    console.log(`📢 Notificando ${subs.length} inscritos sobre novo post: "${post.title}"`);

    return post;
  }

  async listByProject(projectId: string, page = 1, limit = 10) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new HttpError(404, "Projeto não encontrado");

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where: { projectId },
        include: POST_INCLUDE,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.post.count({ where: { projectId } }),
    ]);

    return { posts, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getById(postId: string) {
    const post = await prisma.post.findUnique({ where: { id: postId }, include: POST_INCLUDE });
    if (!post) throw new HttpError(404, "Post não encontrado");
    return post;
  }

  async delete(postId: string, userId: string) {
    const post = await prisma.post.findUnique({
      where: { id: postId }, include: { project: true },
    });
    if (!post) throw new HttpError(404, "Post não encontrado");
    const canDelete = post.authorId === userId || post.project.ownerId === userId;
    if (!canDelete) throw new HttpError(403, "Acesso negado");
    await prisma.post.delete({ where: { id: postId } });
    return { message: "Post removido" };
  }
}
