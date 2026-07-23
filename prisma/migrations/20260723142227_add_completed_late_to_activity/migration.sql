-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "completedLate" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "MemberRequest_userId_status_idx" ON "MemberRequest"("userId", "status");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Post_projectId_createdAt_idx" ON "Post"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "Project_ownerId_idx" ON "Project"("ownerId");

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "Project"("status");

-- CreateIndex
CREATE INDEX "Project_createdAt_idx" ON "Project"("createdAt");

-- CreateIndex
CREATE INDEX "Project_status_createdAt_idx" ON "Project"("status", "createdAt");
