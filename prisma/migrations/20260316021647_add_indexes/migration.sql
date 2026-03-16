-- CreateIndex
CREATE INDEX "Activity_projectId_idx" ON "Activity"("projectId");

-- CreateIndex
CREATE INDEX "MemberRequest_projectId_status_idx" ON "MemberRequest"("projectId", "status");

-- CreateIndex
CREATE INDEX "MemberRequest_userId_idx" ON "MemberRequest"("userId");

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Post_projectId_idx" ON "Post"("projectId");

-- CreateIndex
CREATE INDEX "Post_authorId_idx" ON "Post"("authorId");

-- CreateIndex
CREATE INDEX "Publication_projectId_idx" ON "Publication"("projectId");

-- CreateIndex
CREATE INDEX "Publication_approved_idx" ON "Publication"("approved");

-- CreateIndex
CREATE INDEX "Publication_approved_projectId_idx" ON "Publication"("approved", "projectId");

-- CreateIndex
CREATE INDEX "Publication_userId_idx" ON "Publication"("userId");

-- CreateIndex
CREATE INDEX "Subscription_userId_idx" ON "Subscription"("userId");

-- CreateIndex
CREATE INDEX "Subscription_projectId_idx" ON "Subscription"("projectId");
