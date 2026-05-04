/*
  Warnings:

  - The primary key for the `PokemonAttack` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `game_id` on the `PokemonAttack` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name]` on the table `Game` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `version_group_id` to the `Game` table without a default value. This is not possible if the table is not empty.
  - Added the required column `version_group_id` to the `PokemonAttack` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "PokemonAttack" DROP CONSTRAINT "PokemonAttack_game_id_fkey";

-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "version_group_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "PokemonAttack" DROP CONSTRAINT "PokemonAttack_pkey",
DROP COLUMN "game_id",
ADD COLUMN     "version_group_id" INTEGER NOT NULL,
ADD CONSTRAINT "PokemonAttack_pkey" PRIMARY KEY ("pokedex_entry_id", "attack_id", "method_id", "version_group_id");

-- CreateTable
CREATE TABLE "VersionGroup" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "generation" INTEGER NOT NULL,

    CONSTRAINT "VersionGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VersionGroup_name_key" ON "VersionGroup"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Game_name_key" ON "Game"("name");

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_version_group_id_fkey" FOREIGN KEY ("version_group_id") REFERENCES "VersionGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PokemonAttack" ADD CONSTRAINT "PokemonAttack_version_group_id_fkey" FOREIGN KEY ("version_group_id") REFERENCES "VersionGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
