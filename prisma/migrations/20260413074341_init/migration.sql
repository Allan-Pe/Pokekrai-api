-- CreateTable
CREATE TABLE "Pokemon" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Pokemon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Game" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "generation" INTEGER NOT NULL,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Type" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TypeEffectiveness" (
    "attack_type_id" INTEGER NOT NULL,
    "defense_type_id" INTEGER NOT NULL,
    "multiplier" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "TypeEffectiveness_pkey" PRIMARY KEY ("attack_type_id","defense_type_id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PokedexEntry" (
    "id" SERIAL NOT NULL,
    "pokemon_id" INTEGER NOT NULL,
    "game_id" INTEGER NOT NULL,
    "type1_id" INTEGER NOT NULL,
    "type2_id" INTEGER,
    "description" TEXT,
    "location" TEXT,
    "regional_dex_number" INTEGER,

    CONSTRAINT "PokedexEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stats" (
    "id" SERIAL NOT NULL,
    "pokedex_entry_id" INTEGER NOT NULL,
    "hp" INTEGER NOT NULL,
    "attack" INTEGER NOT NULL,
    "defense" INTEGER NOT NULL,
    "sp_attack" INTEGER NOT NULL,
    "sp_defense" INTEGER NOT NULL,
    "speed" INTEGER NOT NULL,

    CONSTRAINT "Stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EV_Yield" (
    "id" SERIAL NOT NULL,
    "pokedex_entry_id" INTEGER NOT NULL,
    "hp" INTEGER NOT NULL,
    "attack" INTEGER NOT NULL,
    "defense" INTEGER NOT NULL,
    "sp_attack" INTEGER NOT NULL,
    "sp_defense" INTEGER NOT NULL,
    "speed" INTEGER NOT NULL,

    CONSTRAINT "EV_Yield_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attack" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type_id" INTEGER NOT NULL,
    "power" INTEGER,
    "accuracy" INTEGER,
    "category" TEXT,
    "description" TEXT,

    CONSTRAINT "Attack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttackMethod" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "AttackMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TM" (
    "id" SERIAL NOT NULL,
    "number" INTEGER NOT NULL,
    "game_id" INTEGER NOT NULL,
    "attack_id" INTEGER NOT NULL,

    CONSTRAINT "TM_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PokemonAttack" (
    "pokedex_entry_id" INTEGER NOT NULL,
    "attack_id" INTEGER NOT NULL,
    "method_id" INTEGER NOT NULL,
    "level_learned" INTEGER,

    CONSTRAINT "PokemonAttack_pkey" PRIMARY KEY ("pokedex_entry_id","attack_id","method_id")
);

-- CreateTable
CREATE TABLE "Ability" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Ability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PokemonAbility" (
    "pokedex_entry_id" INTEGER NOT NULL,
    "ability_id" INTEGER NOT NULL,
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PokemonAbility_pkey" PRIMARY KEY ("pokedex_entry_id","ability_id")
);

-- CreateTable
CREATE TABLE "Evolution" (
    "id" SERIAL NOT NULL,
    "from_entry_id" INTEGER NOT NULL,
    "to_entry_id" INTEGER NOT NULL,
    "game_id" INTEGER,
    "item_id" INTEGER,
    "level_needed" INTEGER,
    "location_needed" TEXT,
    "condition" TEXT,

    CONSTRAINT "Evolution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PokemonForm" (
    "id" SERIAL NOT NULL,
    "pokedex_entry_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "form_type" TEXT NOT NULL,
    "type1_id" INTEGER NOT NULL,
    "type2_id" INTEGER,

    CONSTRAINT "PokemonForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PokemonSprite" (
    "id" SERIAL NOT NULL,
    "pokedex_entry_id" INTEGER NOT NULL,
    "form_id" INTEGER,
    "variant" TEXT NOT NULL,
    "sprite_url" TEXT NOT NULL,

    CONSTRAINT "PokemonSprite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Stats_pokedex_entry_id_key" ON "Stats"("pokedex_entry_id");

-- CreateIndex
CREATE UNIQUE INDEX "EV_Yield_pokedex_entry_id_key" ON "EV_Yield"("pokedex_entry_id");

-- AddForeignKey
ALTER TABLE "TypeEffectiveness" ADD CONSTRAINT "TypeEffectiveness_attack_type_id_fkey" FOREIGN KEY ("attack_type_id") REFERENCES "Type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TypeEffectiveness" ADD CONSTRAINT "TypeEffectiveness_defense_type_id_fkey" FOREIGN KEY ("defense_type_id") REFERENCES "Type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PokedexEntry" ADD CONSTRAINT "PokedexEntry_pokemon_id_fkey" FOREIGN KEY ("pokemon_id") REFERENCES "Pokemon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PokedexEntry" ADD CONSTRAINT "PokedexEntry_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PokedexEntry" ADD CONSTRAINT "PokedexEntry_type1_id_fkey" FOREIGN KEY ("type1_id") REFERENCES "Type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PokedexEntry" ADD CONSTRAINT "PokedexEntry_type2_id_fkey" FOREIGN KEY ("type2_id") REFERENCES "Type"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stats" ADD CONSTRAINT "Stats_pokedex_entry_id_fkey" FOREIGN KEY ("pokedex_entry_id") REFERENCES "PokedexEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EV_Yield" ADD CONSTRAINT "EV_Yield_pokedex_entry_id_fkey" FOREIGN KEY ("pokedex_entry_id") REFERENCES "PokedexEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attack" ADD CONSTRAINT "Attack_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "Type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TM" ADD CONSTRAINT "TM_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TM" ADD CONSTRAINT "TM_attack_id_fkey" FOREIGN KEY ("attack_id") REFERENCES "Attack"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PokemonAttack" ADD CONSTRAINT "PokemonAttack_pokedex_entry_id_fkey" FOREIGN KEY ("pokedex_entry_id") REFERENCES "PokedexEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PokemonAttack" ADD CONSTRAINT "PokemonAttack_attack_id_fkey" FOREIGN KEY ("attack_id") REFERENCES "Attack"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PokemonAttack" ADD CONSTRAINT "PokemonAttack_method_id_fkey" FOREIGN KEY ("method_id") REFERENCES "AttackMethod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PokemonAbility" ADD CONSTRAINT "PokemonAbility_pokedex_entry_id_fkey" FOREIGN KEY ("pokedex_entry_id") REFERENCES "PokedexEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PokemonAbility" ADD CONSTRAINT "PokemonAbility_ability_id_fkey" FOREIGN KEY ("ability_id") REFERENCES "Ability"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evolution" ADD CONSTRAINT "Evolution_from_entry_id_fkey" FOREIGN KEY ("from_entry_id") REFERENCES "PokedexEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evolution" ADD CONSTRAINT "Evolution_to_entry_id_fkey" FOREIGN KEY ("to_entry_id") REFERENCES "PokedexEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evolution" ADD CONSTRAINT "Evolution_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evolution" ADD CONSTRAINT "Evolution_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PokemonForm" ADD CONSTRAINT "PokemonForm_pokedex_entry_id_fkey" FOREIGN KEY ("pokedex_entry_id") REFERENCES "PokedexEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PokemonForm" ADD CONSTRAINT "PokemonForm_type1_id_fkey" FOREIGN KEY ("type1_id") REFERENCES "Type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PokemonForm" ADD CONSTRAINT "PokemonForm_type2_id_fkey" FOREIGN KEY ("type2_id") REFERENCES "Type"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PokemonSprite" ADD CONSTRAINT "PokemonSprite_pokedex_entry_id_fkey" FOREIGN KEY ("pokedex_entry_id") REFERENCES "PokedexEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PokemonSprite" ADD CONSTRAINT "PokemonSprite_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "PokemonForm"("id") ON DELETE SET NULL ON UPDATE CASCADE;
