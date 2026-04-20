/*
  Warnings:

  - You are about to drop the column `description` on the `PokedexEntry` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `PokedexEntry` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "PokedexEntry" DROP COLUMN "description",
DROP COLUMN "location";

-- CreateTable
CREATE TABLE "PokedexEntryVersion" (
    "id" SERIAL NOT NULL,
    "pokedex_entry_id" INTEGER NOT NULL,
    "version_group_id" INTEGER NOT NULL,
    "description" TEXT,
    "location" TEXT,

    CONSTRAINT "PokedexEntryVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PokedexEntryVersion_pokedex_entry_id_version_group_id_key" ON "PokedexEntryVersion"("pokedex_entry_id", "version_group_id");

-- AddForeignKey
ALTER TABLE "PokedexEntryVersion" ADD CONSTRAINT "PokedexEntryVersion_pokedex_entry_id_fkey" FOREIGN KEY ("pokedex_entry_id") REFERENCES "PokedexEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PokedexEntryVersion" ADD CONSTRAINT "PokedexEntryVersion_version_group_id_fkey" FOREIGN KEY ("version_group_id") REFERENCES "VersionGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
