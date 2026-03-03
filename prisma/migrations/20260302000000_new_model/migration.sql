-- DropForeignKeys das migrations antigas (seguras se já aplicadas)
-- Esta migration recria o schema do zero para o novo modelo de negócio.
-- Em produção: faça backup antes de executar.

-- Remover tabelas antigas que mudaram de estrutura
DROP TABLE IF EXISTS "_PublicationAuthors" CASCADE;
DROP TABLE IF EXISTS "Application" CASCADE;
DROP TABLE IF EXISTS "Publication" CASCADE;
DROP TABLE IF EXISTS "Project" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;

-- Remover enums antigos
DROP TYPE IF EXISTS "ApplicationStatus";
DROP TYPE IF EXISTS "ProjectStatus";

-- Criar enums novos
CREATE TYPE "Role"               AS ENUM ('ALUNO', 'PROFESSOR');
CREATE TYPE "ProjectCategory"    AS ENUM ('MACRO_CAD', 'METROLOGIA', 'OUTRO');
CREATE TYPE "ProjectStatus"      AS ENUM ('ABERTO', 'EM_ANDAMENTO', 'FINALIZADO');
CREATE TYPE "ProjectArea"        AS ENUM ('TECHNOLOGY', 'HEALTH', 'EDUCATION', 'ENVIRONMENT', 'LAW', 'ARTS', 'ENGINEERING', 'SOCIAL');
CREATE TYPE "MemberRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "PublicationType"    AS ENUM ('ARTICLE', 'REPORT', 'PRESENTATION', 'THESIS');
CREATE TYPE "MediaType"          AS ENUM ('IMAGE', 'VIDEO', 'ARTICLE_LINK', 'DOCUMENT');

-- User
CREATE TABLE "User" (
    "id"          TEXT NOT NULL,
    "name"        TEXT NOT NULL,
    "email"       TEXT NOT NULL,
    "password"    TEXT NOT NULL,
    "role"        "Role" NOT NULL,
    "department"  TEXT,
    "institution" TEXT,
    "avatar"      TEXT,
    "bio"         TEXT,
    "phone"       TEXT,
    "linkedin"    TEXT,
    "github"      TEXT,
    "website"     TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- Project
CREATE TABLE "Project" (
    "id"                  TEXT NOT NULL,
    "title"               TEXT NOT NULL,
    "description"         TEXT NOT NULL,
    "area"                "ProjectArea" NOT NULL DEFAULT 'TECHNOLOGY',
    "category"            "ProjectCategory" NOT NULL,
    "status"              "ProjectStatus" NOT NULL DEFAULT 'ABERTO',
    "vacancies"           INTEGER NOT NULL DEFAULT 5,
    "tags"                TEXT[] NOT NULL DEFAULT '{}',
    "startDate"           TIMESTAMP(3),
    "endDate"             TIMESTAMP(3),
    "applicationDeadline" TIMESTAMP(3),
    "coverImage"          TEXT,
    "tempo"               TEXT NOT NULL,
    "custo"               DOUBLE PRECISION NOT NULL DEFAULT 0,
    "escopo"              TEXT NOT NULL,
    "contactEmail"        TEXT,
    "contactInfo"         TEXT,
    "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ownerId"             TEXT NOT NULL,
    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- MemberRequest
CREATE TABLE "MemberRequest" (
    "id"        TEXT NOT NULL,
    "message"   TEXT NOT NULL,
    "status"    "MemberRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    CONSTRAINT "MemberRequest_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MemberRequest_projectId_userId_key" ON "MemberRequest"("projectId", "userId");

-- Subscription
CREATE TABLE "Subscription" (
    "id"        TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Subscription_projectId_userId_key" ON "Subscription"("projectId", "userId");

-- Post
CREATE TABLE "Post" (
    "id"        TEXT NOT NULL,
    "title"     TEXT NOT NULL,
    "content"   TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT NOT NULL,
    "authorId"  TEXT NOT NULL,
    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- Media
CREATE TABLE "Media" (
    "id"        TEXT NOT NULL,
    "type"      "MediaType" NOT NULL,
    "url"       TEXT NOT NULL,
    "title"     TEXT,
    "caption"   TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "postId"    TEXT NOT NULL,
    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- Publication
CREATE TABLE "Publication" (
    "id"         TEXT NOT NULL,
    "title"      TEXT NOT NULL,
    "abstract"   TEXT NOT NULL,
    "type"       "PublicationType" NOT NULL DEFAULT 'ARTICLE',
    "year"       INTEGER NOT NULL,
    "journal"    TEXT,
    "doi"        TEXT,
    "zenodoLink" TEXT,
    "tags"       TEXT[] NOT NULL DEFAULT '{}',
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId"  TEXT NOT NULL,
    CONSTRAINT "Publication_pkey" PRIMARY KEY ("id")
);

-- Project Members (N:N)
CREATE TABLE "_ProjectMembers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);
CREATE UNIQUE INDEX "_ProjectMembers_AB_unique" ON "_ProjectMembers"("A", "B");
CREATE INDEX "_ProjectMembers_B_index" ON "_ProjectMembers"("B");

-- Publication Authors (N:N)
CREATE TABLE "_PublicationAuthors" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);
CREATE UNIQUE INDEX "_PublicationAuthors_AB_unique" ON "_PublicationAuthors"("A", "B");
CREATE INDEX "_PublicationAuthors_B_index" ON "_PublicationAuthors"("B");

-- Foreign Keys
ALTER TABLE "Project"
  ADD CONSTRAINT "Project_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT;

ALTER TABLE "MemberRequest"
  ADD CONSTRAINT "MemberRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "MemberRequest_userId_fkey"    FOREIGN KEY ("userId")    REFERENCES "User"("id")    ON DELETE CASCADE;

ALTER TABLE "Subscription"
  ADD CONSTRAINT "Subscription_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "Subscription_userId_fkey"    FOREIGN KEY ("userId")    REFERENCES "User"("id")    ON DELETE CASCADE;

ALTER TABLE "Post"
  ADD CONSTRAINT "Post_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "Post_authorId_fkey"  FOREIGN KEY ("authorId")  REFERENCES "User"("id")    ON DELETE CASCADE;

ALTER TABLE "Media"
  ADD CONSTRAINT "Media_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE;

ALTER TABLE "Publication"
  ADD CONSTRAINT "Publication_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE;

ALTER TABLE "_ProjectMembers"
  ADD CONSTRAINT "_ProjectMembers_A_fkey" FOREIGN KEY ("A") REFERENCES "Project"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "_ProjectMembers_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id")    ON DELETE CASCADE;

ALTER TABLE "_PublicationAuthors"
  ADD CONSTRAINT "_PublicationAuthors_A_fkey" FOREIGN KEY ("A") REFERENCES "Publication"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "_PublicationAuthors_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id")        ON DELETE CASCADE;
