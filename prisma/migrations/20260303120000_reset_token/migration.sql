-- AlterTable
ALTER TABLE "User" ADD COLUMN "resetToken" VARCHAR(255),
                   ADD COLUMN "resetTokenExpiry" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "User_resetToken_key" ON "User"("resetToken");
