/*
  Warnings:

  - You are about to drop the column `game_id` on the `PokedexEntry` table. All the data in the column will be lost.
  - The primary key for the `PokemonAttack` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[pokemon_id]` on the table `PokedexEntry` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `game_id` to the `PokemonAttack` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "PokedexEntry" DROP CONSTRAINT "PokedexEntry_game_id_fkey";

-- AlterTable
ALTER TABLE "PokedexEntry" DROP COLUMN "game_id";

-- AlterTable
ALTER TABLE "PokemonAttack" DROP CONSTRAINT "PokemonAttack_pkey",
ADD COLUMN     "game_id" INTEGER NOT NULL,
ADD CONSTRAINT "PokemonAttack_pkey" PRIMARY KEY ("pokedex_entry_id", "attack_id", "method_id", "game_id");

-- CreateIndex
CREATE UNIQUE INDEX "PokedexEntry_pokemon_id_key" ON "PokedexEntry"("pokemon_id");

-- AddForeignKey
ALTER TABLE "PokemonAttack" ADD CONSTRAINT "PokemonAttack_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
