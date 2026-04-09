import { MediaType } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { HttpError } from "../../utils/http-error";
import { resend } from "../../lib/mailer";
import { escapeHtml } from "../../utils/email";
import { sseManager } from "../../config/sse";

interface MediaInput { type: MediaType; url: string; title?: string; caption?: string; }

interface CreatePostInput {
  title:   string;
  content: string;
  media?:  MediaInput[];
}

interface UpdatePostInput {
  title?:   string;
  content?: string;
  media?:   MediaInput[];
}

const POST_INCLUDE = {
  author:  { select: { id: true, name: true, avatar: true, department: true } },
  media:   true,
  project: { select: { id: true, title: true, ownerId: true } },
} as const;

async function sendTopicEmail(to: string, name: string, projectTitle: string, topicTitle: string) {
  try {
    await resend.emails.send({
      from:    "LEXA <no-reply@resend.dev>",
      to,
      subject: `Novo tópico em "${escapeHtml(projectTitle)}"`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <h2 style="color: #1e1e2e; margin-bottom: 8px;">LEXA — Laboratório de Extensão Ativo</h2>
          <p style="color: #555; margin-bottom: 16px;">Olá, ${escapeHtml(name)}.</p>
          <p style="color: #333; margin-bottom: 24px;">
            Um novo tópico foi criado no projeto <strong>"${escapeHtml(projectTitle)}"</strong>:<br/>
            <strong>${escapeHtml(topicTitle)}</strong>
          </p>
          <p style="color: #999; font-size: 13px; margin-top: 24px;">Este é um e-mail automático, não responda.</p>
        </div>
      `,
    });
  } catch {
    // Não bloqueia a operação se e-mail falhar
  }
}

export class PostService {
  async create(projectId: string, authorId: string, input: CreatePostInput) {
    // Busca projeto com membros para enviar e-mails
    const project = await prisma.project.findFirst({
      where:   { id: projectId, members: { some: { id: authorId } } },
      include: { members: { select: { id: true, name: true, email: true } } },
    });
    if (!project) throw new HttpError(403, "Apenas membros do projeto podem publicar atualizações");

    const data: any = {
      title:     input.title,
      content:   input.content,
      projectId,
      authorId,
    };
    if (input.media) {
      data.media = { create: input.media };
    }

    const post = await prisma.post.create({ data, include: POST_INCLUDE });

    // Envia e-mail para todos os membros exceto o autor
    const recipients = project.members.filter((m) => m.id !== authorId && m.email);
    await Promise.all(
      recipients.map((m) =>
        sendTopicEmail(m.email, m.name, project.title, post.title)
      )
    );

    // Notifica instantaneamente todos os visualizadores/membros
    project.members.forEach((m) => {
      sseManager.emit(m.id, "posts_updated", { projectId });
    });

    return post;
  }

  async listByProject(projectId: string, page = 1, limit = 10) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new HttpError(404, "Projeto não encontrado");

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where:   { projectId },
        include: POST_INCLUDE,
        orderBy: { createdAt: "desc" },
        skip:    (page - 1) * limit,
        take:    limit,
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

  async update(postId: string, userId: string, input: UpdatePostInput) {
    const post = await prisma.post.findUnique({
      where:   { id: postId },
      include: { project: { select: { ownerId: true } } },
    });
    if (!post) throw new HttpError(404, "Post não encontrado");
    const canEdit = post.authorId === userId || post.project.ownerId === userId;
    if (!canEdit) throw new HttpError(403, "Acesso negado");

    const data: any = {};
    if (input.title   !== undefined) data.title   = input.title;
    if (input.content !== undefined) data.content = input.content;
    if (input.media   !== undefined) {
      data.media = { deleteMany: {}, create: input.media };
    }

    const updatedPost = await prisma.post.update({ where: { id: postId }, data, include: POST_INCLUDE });

    // Busca os membros para avisar do update
    const project = await prisma.project.findUnique({
      where: { id: updatedPost.projectId },
      include: { members: { select: { id: true } } }
    });
    project?.members.forEach((m) => {
      sseManager.emit(m.id, "posts_updated", { projectId: updatedPost.projectId });
    });

    return updatedPost;
  }

  async delete(postId: string, userId: string) {
    const post = await prisma.post.findUnique({
      where: { id: postId }, include: { project: true },
    });
    if (!post) throw new HttpError(404, "Post não encontrado");
    const canDelete = post.authorId === userId || post.project.ownerId === userId;
    if (!canDelete) throw new HttpError(403, "Acesso negado");
    await prisma.post.delete({ where: { id: postId } });

    // Avisa os membros do projeto sobre a remoção
    const currentProject = await prisma.project.findUnique({
      where: { id: post.projectId },
      include: { members: { select: { id: true } } }
    });
    currentProject?.members.forEach((m) => {
      sseManager.emit(m.id, "posts_updated", { projectId: post.projectId });
    });

    return { message: "Post removido" };
  }
}