-- CreateEnum
CREATE TYPE "ProjectArea" AS ENUM ('TECHNOLOGY', 'HEALTH', 'EDUCATION', 'ENVIRONMENT', 'LAW', 'ARTS', 'ENGINEERING', 'SOCIAL');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PublicationType" AS ENUM ('ARTICLE', 'REPORT', 'PRESENTATION', 'THESIS');

-- AlterTable: User — novos campos opcionais
ALTER TABLE "User" ADD COLUMN "department"  TEXT;
ALTER TABLE "User" ADD COLUMN "institution" TEXT;
ALTER TABLE "User" ADD COLUMN "avatar"      TEXT;

-- AlterTable: Project — novos campos
ALTER TABLE "Project"
  ADD COLUMN "area"                "ProjectArea" NOT NULL DEFAULT 'TECHNOLOGY',
  ADD COLUMN "vacancies"           INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN "tags"                TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN "startDate"           TIMESTAMP(3),
  ADD COLUMN "endDate"             TIMESTAMP(3),
  ADD COLUMN "applicationDeadline" TIMESTAMP(3);

-- AlterTable: Publication — novos campos
ALTER TABLE "Publication"
  ADD COLUMN "type"      "PublicationType" NOT NULL DEFAULT 'ARTICLE',
  ADD COLUMN "journal"   TEXT,
  ADD COLUMN "tags"      TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable: Application
CREATE TABLE "Application" (
    "id"        TEXT NOT NULL,
    "message"   TEXT NOT NULL,
    "status"    "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Publication <-> User (autores)
CREATE TABLE "_PublicationAuthors" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Application_projectId_studentId_key" ON "Application"("projectId", "studentId");
CREATE UNIQUE INDEX "_PublicationAuthors_AB_unique" ON "_PublicationAuthors"("A", "B");
CREATE INDEX "_PublicationAuthors_B_index" ON "_PublicationAuthors"("B");

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Application" ADD CONSTRAINT "Application_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "_PublicationAuthors" ADD CONSTRAINT "_PublicationAuthors_A_fkey"
  FOREIGN KEY ("A") REFERENCES "Publication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "_PublicationAuthors" ADD CONSTRAINT "_PublicationAuthors_B_fkey"
  FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
