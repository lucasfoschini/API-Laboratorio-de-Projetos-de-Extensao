# 🔬 Laboratório Ativo — API

Backend da plataforma Laboratório Ativo. Node.js · TypeScript · Express · Prisma · PostgreSQL · JWT · Docker

---

## 🚀 Início Rápido

```bash
cp .env.example .env       # configurar variáveis
docker-compose up db -d    # subir PostgreSQL
npm install
npm run prisma:migrate     # criar tabelas
npm run seed               # popular banco
npm run dev                # iniciar (porta 3334)
```

---

## 🗺️ Rotas

### Auth `/auth`
| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/auth/register` | ❌ | Cadastro → `{ accessToken, refreshToken, user }` |
| POST | `/auth/login`    | ❌ | Login    → `{ accessToken, refreshToken, user }` |
| POST | `/auth/refresh`  | ❌ | Renovar tokens |
| GET  | `/auth/me`       | ✅ | Dados do usuário logado |

### Projetos `/projects`
| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET    | `/projects`              | ❌ | Listar todos |
| GET    | `/projects/:id`          | ❌ | Detalhes + posts recentes |
| POST   | `/projects`              | ✅ | Criar projeto (qualquer usuário) |
| PATCH  | `/projects/:id`          | ✅ | Editar (só o criador) |
| DELETE | `/projects/:id`          | ✅ | Excluir (só o criador) |
| POST   | `/projects/:id/subscribe`   | ✅ | Inscrever para atualizações |
| DELETE | `/projects/:id/subscribe`   | ✅ | Cancelar inscrição |
| GET    | `/projects/:id/subscribe`   | ✅ | Status da inscrição |
| POST   | `/projects/:id/join-request`  | ✅ | Solicitar entrada no grupo |
| GET    | `/projects/:id/join-requests` | ✅ | Listar solicitações (só criador) |
| GET    | `/projects/:id/posts`     | ❌ | Posts do projeto |
| POST   | `/projects/:id/posts`     | ✅ | Criar post (só membros) |

### Solicitações `/member-requests`
| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET    | `/member-requests/my`        | ✅ | Minhas solicitações |
| PATCH  | `/member-requests/:requestId` | ✅ | Aprovar/rejeitar (só criador do projeto) |
| DELETE | `/member-requests/:requestId` | ✅ | Cancelar (só o solicitante) |

### Posts `/posts`
| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET    | `/posts/:postId`  | ❌ | Detalhes do post |
| DELETE | `/posts/:postId`  | ✅ | Remover (autor ou criador do projeto) |

### Dashboard `/dashboard`
| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/dashboard/stats`            | ✅ | Contadores do usuário |
| GET | `/dashboard/projects`         | ✅ | Projetos onde sou membro |
| GET | `/dashboard/requests/mine`    | ✅ | Minhas solicitações enviadas |
| GET | `/dashboard/requests/pending` | ✅ | Solicitações recebidas nos meus projetos |
| GET | `/dashboard/subscriptions`    | ✅ | Projetos que acompanho |

### Publicações `/publications`
| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET  | `/publications`     | ❌ | Listar todas |
| GET  | `/publications/:id` | ❌ | Detalhes |
| POST | `/publications`     | ✅ | Criar publicação |

---

## 🗄️ Modelos Principais

**Project**: criado por qualquer usuário. `status: ABERTO | EM_ANDAMENTO | FINALIZADO`

**MemberRequest**: solicitação de entrada no grupo. Fluxo: `PENDING → APPROVED/REJECTED`

**Subscription**: inscrição para receber atualizações do projeto (sem precisar ser membro)

**Post**: atualização publicada por membros do projeto, com mídia anexada (imagens, vídeos, links)

**Media**: `IMAGE | VIDEO | ARTICLE_LINK | DOCUMENT` vinculada a posts
