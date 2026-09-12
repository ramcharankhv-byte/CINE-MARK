/*
  Warnings:

  - You are about to drop the column `imdbId` on the `Movie` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[imdbID]` on the table `Movie` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `imdbID` to the `Movie` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Movie_imdbId_key";

-- AlterTable
ALTER TABLE "Movie" DROP COLUMN "imdbId",
ADD COLUMN     "imdbID" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Movie_imdbID_key" ON "Movie"("imdbID");
