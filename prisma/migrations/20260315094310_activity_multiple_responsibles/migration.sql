/*
  Warnings:

  - You are about to drop the column `responsibleId` on the `Activity` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Activity" DROP CONSTRAINT "Activity_responsibleId_fkey";

-- AlterTable
ALTER TABLE "Activity" DROP COLUMN "responsibleId";

-- CreateTable
CREATE TABLE "_ActivityResponsibles" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_ActivityResponsibles_AB_unique" ON "_ActivityResponsibles"("A", "B");

-- CreateIndex
CREATE INDEX "_ActivityResponsibles_B_index" ON "_ActivityResponsibles"("B");

-- AddForeignKey
ALTER TABLE "_ActivityResponsibles" ADD CONSTRAINT "_ActivityResponsibles_A_fkey" FOREIGN KEY ("A") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ActivityResponsibles" ADD CONSTRAINT "_ActivityResponsibles_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
