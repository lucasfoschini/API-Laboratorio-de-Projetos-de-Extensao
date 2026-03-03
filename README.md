# 🔬 Laboratório Ativo — API

Backend da plataforma **Laboratório Ativo**, uma plataforma acadêmica para gestão de projetos de extensão universitária.

**Stack:** Node.js · TypeScript · Express · Prisma ORM · PostgreSQL · JWT · Docker

---

## 🔗 Repositórios do Projeto

| Repositório | Descrição | Deploy |
|---|---|---|
| [API-Laboratorio-de-Projetos-de-Extensao](https://github.com/lucasfoschini/API-Laboratorio-de-Projetos-de-Extensao) | Este repositório — Backend REST API | [Render](https://render.com) |
| [Laboratorio-de-Projetos](https://github.com/lucasfoschini/Laboratorio-de-Projetos) | Frontend Next.js | [Vercel](https://vercel.com) |

---

## 🚀 Início Rápido

```bash
cp .env.example .env         # configurar variáveis de ambiente
docker-compose up db -d      # subir PostgreSQL via Docker
npm install                  # instalar dependências
npm run prisma:migrate       # criar tabelas no banco
npm run dev                  # iniciar servidor (porta 3334)
```

> **Sem Docker?** Aponte `DATABASE_URL` no `.env` para uma instância PostgreSQL existente e pule o `docker-compose`.

---

## ⚙️ Variáveis de Ambiente

Copie `.env.example` para `.env` e preencha:

```env
NODE_ENV=development
PORT=3334
DATABASE_URL=postgresql://user:password@localhost:5432/labativo
JWT_SECRET=sua_chave_secreta_forte
JWT_EXPIRES_IN=1h
JWT_REFRESH_IN=7d
CORS_ORIGIN=http://localhost:3000
```

---

## 🗺️ Rotas da API

### Autenticação — `/auth`

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| POST | `/auth/register` | ❌ | Cadastro → `{ accessToken, refreshToken, user }` |
| POST | `/auth/login` | ❌ | Login → `{ accessToken, refreshToken, user }` |
| POST | `/auth/refresh` | ❌ | Renovar tokens com refreshToken |
| GET | `/auth/me` | ✅ | Dados do usuário autenticado |

### Projetos — `/projects`

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/projects` | ❌ | Listar todos os projetos |
| GET | `/projects/:id` | ❌ | Detalhes completos + posts recentes |
| POST | `/projects` | ✅ | Criar projeto |
| PATCH | `/projects/:id` | ✅ | Editar projeto (somente o criador) |
| DELETE | `/projects/:id` | ✅ | Excluir projeto (somente o criador) |
| POST | `/projects/:id/subscribe` | ✅ | Inscrever para receber atualizações |
| DELETE | `/projects/:id/subscribe` | ✅ | Cancelar inscrição |
| GET | `/projects/:id/subscribe` | ✅ | Verificar status da inscrição |
| POST | `/projects/:id/join-request` | ✅ | Solicitar entrada no grupo |
| GET | `/projects/:id/join-requests` | ✅ | Listar solicitações (somente criador) |
| GET | `/projects/:id/posts` | ❌ | Posts/atualizações do projeto (cada item inclui `media` array) |
| POST | `/projects/:id/posts` | ✅ | Publicar atualização (somente membros). `content` livre de limite (antes 512 caracteres). |

### Solicitações de Membros — `/member-requests`

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/member-requests/my` | ✅ | Minhas solicitações enviadas |
| PATCH | `/member-requests/:requestId` | ✅ | Aprovar ou rejeitar (somente criador do projeto) |
| DELETE | `/member-requests/:requestId` | ✅ | Cancelar solicitação (somente o solicitante) |

> Ao aprovar a última vaga disponível, o projeto muda automaticamente para `EM_ANDAMENTO`.

### Posts — `/posts`

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/posts/:postId` | ❌ | Detalhes do post |
| PATCH | `/posts/:postId` | ✅ | Editar post (autor ou dono do projeto); mídia enviada substitui lista existente |
| DELETE | `/posts/:postId` | ✅ | Remover post (autor ou criador do projeto) |

### Publicações — `/publications`

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/publications` | ❌ | Listar todas as publicações |
| GET | `/publications/:id` | ❌ | Detalhes da publicação |
| POST | `/publications` | ✅ | Criar publicação (alunos e professores). `content` ampliado para até 5000 caracteres. |

### Dashboard — `/dashboard`

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/dashboard/stats` | ✅ | Contadores gerais do usuário |
| GET | `/dashboard/projects` | ✅ | Projetos onde sou membro ou criador |
| GET | `/dashboard/requests/mine` | ✅ | Minhas solicitações enviadas |
| GET | `/dashboard/requests/pending` | ✅ | Solicitações recebidas nos meus projetos |
| GET | `/dashboard/subscriptions` | ✅ | Projetos que estou acompanhando |
| GET | `/dashboard/subscribed-activity` | ✅ | Posts e publicações recentes dos projetos acompanhados (últimas 48h) |

### Usuários — `/users`

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/users/search?q=termo` | ✅ | Buscar usuários por nome ou e-mail (máx. 8 resultados) |

---

## 🗄️ Modelos de Dados

### User
Usuário da plataforma. Pode ter papel de `ALUNO` ou `PROFESSOR`.

### Project
Projeto de extensão criado por qualquer usuário autenticado.
- `status`: `ABERTO` → `EM_ANDAMENTO` → `FINALIZADO`
- Muda automaticamente para `EM_ANDAMENTO` quando todas as vagas são preenchidas
- `area`: `HEALTH`, `TECHNOLOGY`, `EDUCATION`, `ENVIRONMENT`, `LAW`, `ARTS`, `ENGINEERING`, `SOCIAL`
- `category`: `MACRO_CAD`, `METROLOGIA`, `OUTRO`

### MemberRequest
Solicitação de entrada no grupo de um projeto.
- Fluxo: `PENDING → APPROVED | REJECTED`
- Aprovação verifica o limite de vagas antes de aceitar

### Subscription
Inscrição para acompanhar atualizações de um projeto sem ser membro.

### Post
Atualização publicada por membros do projeto. Suporta mídia anexada.

### Media
Arquivo ou link vinculado a um post. Tipos: `IMAGE`, `VIDEO`, `ARTICLE_LINK`, `DOCUMENT`

### Publication
Produção acadêmica vinculada a um projeto. Tipos: `ARTICLE`, `REPORT`, `PRESENTATION`, `THESIS`

---

## 🐳 Docker

Para rodar a API completa com banco de dados:

```bash
docker-compose up --build
```

O `docker-compose.yml` sobe tanto o serviço da API quanto o PostgreSQL.

---

## 📁 Estrutura de Pastas

```
src/
├── config/
│   ├── env.ts              # Validação das variáveis de ambiente (Zod)
│   └── prisma.ts           # Instância do Prisma Client
├── middlewares/
│   ├── auth.middleware.ts  # Validação do JWT
│   ├── role.middleware.ts  # Controle de acesso por papel
│   └── validate.middleware.ts  # Validação de schemas Zod
├── modules/
│   ├── auth/
│   ├── dashboard/
│   ├── member-requests/
│   ├── posts/
│   ├── projects/
│   ├── publications/
│   └── users/
├── routes/
│   └── index.ts            # Registro de todas as rotas
└── utils/
    ├── http-error.ts       # Classe de erro HTTP padronizado
    └── jwt.ts              # Helpers de geração e verificação de tokens
prisma/
├── schema.prisma           # Schema do banco de dados
└── seed.ts                 # Seed (banco vazio por padrão)
```

---

## 🔐 Autenticação

A API usa **JWT** com dois tokens:

- **Access Token** — vida curta (padrão: `1h`), enviado no header `Authorization: Bearer <token>`
- **Refresh Token** — vida longa (padrão: `7d`), usado para renovar o access token via `POST /auth/refresh`

---

## 🤝 Contribuindo

1. Crie uma branch: `git checkout -b feat/nome-da-feature`
2. Faça as alterações e commit: `git commit -m "feat: descrição"`
3. Abra um Pull Request para `main`
