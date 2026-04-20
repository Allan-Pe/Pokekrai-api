import { PrismaClient } from '@prisma/client'
import axios from 'axios'

const prisma = new PrismaClient()
const POKEAPI = 'https://pokeapi.co/api/v2'
const GEN1_VERSION_GROUPS = new Set(['red-blue', 'yellow'])

function normalizeText(value: string) {
  return value.replace(/\f/g, ' ').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()
}

function getVersionGroupIdFromVersion(versionName: string) {
  if (versionName === 'yellow') return 2
  if (versionName === 'red' || versionName === 'blue') return 1
  return null
}

async function seedTypes() {
  console.log('Seeding types...')

  const { data } = await axios.get(`${POKEAPI}/type?limit=100`)

  for (const t of data.results) {
    const { data: typeData } = await axios.get(t.url)

    // shadow and unknown are not real battle types
    if (['shadow', 'unknown'].includes(typeData.name)) continue

    await prisma.type.upsert({
      where: { id: typeData.id },
      update: {},
      create: {
        id: typeData.id,
        name: typeData.name,
      },
    })
  }

  console.log('Types seeded!')
}

async function seedGames() {
  console.log('Seeding games...')

  const versionGroups = [
    { id: 1, name: 'red-blue', generation: 1 },
    { id: 2, name: 'yellow', generation: 1 },
  ]

  for (const group of versionGroups) {
    await prisma.versionGroup.upsert({
      where: { id: group.id },
      update: {},
      create: group,
    })
  }

  const games = [
    { id: 1, name: 'red',    generation: 1, version_group_id: 1 },
    { id: 2, name: 'blue',   generation: 1, version_group_id: 1 },
    { id: 3, name: 'yellow', generation: 1, version_group_id: 2 },
  ]

  for (const game of games) {
    await prisma.game.upsert({
      where: { id: game.id },
      update: {},
      create: game,
    })
  }

  console.log('Games seeded!')
}

async function seedPokemons() {
  console.log('Seeding pokemons...')

  const { data } = await axios.get(`${POKEAPI}/pokemon?limit=151`)

  for (const p of data.results) {
    const { data: pokemonData } = await axios.get(p.url)

    await prisma.pokemon.upsert({
      where: { id: pokemonData.id },
      update: {},
      create: {
        id: pokemonData.id,
        name: pokemonData.name,
      },
    })

    console.log(`Pokemon inserted: ${pokemonData.name}`)
  }

  console.log('Pokemons seeded!')
}

async function seedPokedexEntries() {
  console.log('Seeding pokedex entries...')

  const { data } = await axios.get(`${POKEAPI}/pokemon?limit=151`)

  for (const p of data.results) {
    const { data: pokemon } = await axios.get(p.url)

    // Only inserting entries for Red version for now
    const entry = await prisma.pokedexEntry.upsert({
      where: { pokemon_id: pokemon.id },
      update: {},
      create: {
        id: pokemon.id,
        pokemon_id: pokemon.id,
        type1_id: Number(pokemon.types[0].type.url.split('/').at(-2)),
        type2_id: pokemon.types[1] ? Number(pokemon.types[1].type.url.split('/').at(-2)) : null,
        regional_dex_number: pokemon.id,
      },
    })

    await prisma.stats.upsert({
      where: { pokedex_entry_id: entry.id },
      update: {},
      create: {
        pokedex_entry_id: entry.id,
        hp:         pokemon.stats[0].base_stat,
        attack:     pokemon.stats[1].base_stat,
        defense:    pokemon.stats[2].base_stat,
        sp_attack:  pokemon.stats[3].base_stat,
        sp_defense: pokemon.stats[4].base_stat,
        speed:      pokemon.stats[5].base_stat,
      },
    })

    await prisma.eV_Yield.upsert({
      where: { pokedex_entry_id: entry.id },
      update: {},
      create: {
        pokedex_entry_id: entry.id,
        hp:         pokemon.stats[0].effort,
        attack:     pokemon.stats[1].effort,
        defense:    pokemon.stats[2].effort,
        sp_attack:  pokemon.stats[3].effort,
        sp_defense: pokemon.stats[4].effort,
        speed:      pokemon.stats[5].effort,
      },
    })

    console.log(`Pokedex entry inserted: ${pokemon.name}`)
  }

  console.log('Pokedex entries seeded!')
}

async function seedPokedexVersionData() {
  console.log('Seeding pokedex version data...')

  const { data } = await axios.get(`${POKEAPI}/pokemon?limit=151`)

  for (const p of data.results) {
    const { data: pokemon } = await axios.get(p.url)
    const { data: species } = await axios.get(pokemon.species.url)

    const entry = await prisma.pokedexEntry.findUnique({
      where: { pokemon_id: pokemon.id },
    })
    if (!entry) continue

    const descriptionsByGroup = new Map<number, string>()
    for (const flavor of species.flavor_text_entries) {
      if (flavor.language.name !== 'en') continue
      const groupId = getVersionGroupIdFromVersion(flavor.version.name)
      if (!groupId) continue
      if (descriptionsByGroup.has(groupId)) continue
      descriptionsByGroup.set(groupId, normalizeText(flavor.flavor_text))
    }

    const locationsByGroup = new Map<number, Set<string>>()
    for (const groupId of [1, 2]) locationsByGroup.set(groupId, new Set())
    const { data: encounters } = await axios.get(pokemon.location_area_encounters)
    for (const encounter of encounters) {
      const location = encounter.location_area?.name
      if (!location) continue
      for (const versionDetail of encounter.version_details) {
        const groupId = getVersionGroupIdFromVersion(versionDetail.version.name)
        if (!groupId) continue
        locationsByGroup.get(groupId)?.add(location)
      }
    }

    for (const group of [
      { id: 1, name: 'red-blue' },
      { id: 2, name: 'yellow' },
    ]) {
      if (!GEN1_VERSION_GROUPS.has(group.name)) continue
      const locationNames = [...(locationsByGroup.get(group.id) ?? new Set())]
        .sort((a, b) => a.localeCompare(b))
        .join(', ')

      await prisma.pokedexEntryVersion.upsert({
        where: {
          pokedex_entry_id_version_group_id: {
            pokedex_entry_id: entry.id,
            version_group_id: group.id,
          },
        },
        update: {
          description: descriptionsByGroup.get(group.id) ?? null,
          location: locationNames || null,
        },
        create: {
          pokedex_entry_id: entry.id,
          version_group_id: group.id,
          description: descriptionsByGroup.get(group.id) ?? null,
          location: locationNames || null,
        },
      })
    }

    console.log(`Pokedex version data seeded: ${pokemon.name}`)
  }

  console.log('Pokedex version data seeded!')
}

async function seedAttackMethods() {
    console.log('Seeding attack methods...')
  
    const methods = [
      { id: 1, name: 'level-up' },
      { id: 2, name: 'machine'  },
      { id: 3, name: 'egg'      },
      { id: 4, name: 'tutor'    },
    ]
  
    for (const method of methods) {
      await prisma.attackMethod.upsert({
        where: { id: method.id },
        update: {},
        create: method,
      })
    }
  
    console.log('Attack methods seeded!')
  }

  async function seedAttacksAndPokemonAttacks() {
    console.log('Seeding attacks and pokemon attacks...')
  
    const { data } = await axios.get(`${POKEAPI}/pokemon?limit=151`)
  
    for (const p of data.results) {
      const { data: pokemon } = await axios.get(p.url)
  
      // On filtre uniquement les attaques apprises dans Rouge/Bleu/Jaune
      const gen1Moves = pokemon.moves.filter((m: any) =>
        m.version_group_details.some((v: any) =>
          ['red-blue', 'yellow'].includes(v.version_group.name)
        )
      )
  
      for (const move of gen1Moves) {
        // Fetch les détails de l'attaque
        const { data: moveData } = await axios.get(move.move.url)
  
        // Insère l'attaque si elle n'existe pas
        await prisma.attack.upsert({
          where: { id: moveData.id },
          update: {},
          create: {
            id:          moveData.id,
            name:        moveData.name,
            type_id:     Number(moveData.type.url.split('/').at(-2)),
            power:       moveData.power    ?? null,
            accuracy:    moveData.accuracy ?? null,
            category:    moveData.damage_class?.name ?? null,
            description: moveData.effect_entries.find((e: any) => e.language.name === 'en')?.short_effect ?? null,
          },
        })
  
        // Pour chaque version Gen 1 où cette attaque est apprise
        const gen1Details = move.version_group_details.filter((v: any) =>
          ['red-blue', 'yellow'].includes(v.version_group.name)
        )
  
        for (const detail of gen1Details) {
          const versionGroupId = detail.version_group.name === 'yellow' ? 2 : 1
          const methodName = detail.move_learn_method.name
          const method = await prisma.attackMethod.findFirst({
            where: { name: methodName },
          })
  
          if (!method) continue
  
          // Trouve la PokedexEntry correspondante
          const entry = await prisma.pokedexEntry.findFirst({
            where: { pokemon_id: pokemon.id },
          })
  
          if (!entry) continue
  
          await prisma.pokemonAttack.upsert({
            where: {
              pokedex_entry_id_attack_id_method_id_version_group_id: {
                pokedex_entry_id: entry.id,
                attack_id:        moveData.id,
                method_id:        method.id,
                version_group_id: versionGroupId,
              },
            },
            update: {},
            create: {
              pokedex_entry_id: entry.id,
              attack_id:        moveData.id,
              method_id:        method.id,
              version_group_id: versionGroupId,
              level_learned:    detail.level_learned_at ?? null,
            },
          })
        }
      }
  
      console.log(`Attacks seeded for: ${pokemon.name}`)
    }
  
    console.log('Attacks and pokemon attacks seeded!')
  }

  async function seedTypeEffectiveness() {
    console.log('Seeding type effectiveness...')
  
    const { data } = await axios.get(`${POKEAPI}/type?limit=100`)
  
    for (const t of data.results) {
      const { data: typeData } = await axios.get(t.url)
  
      if (['shadow', 'unknown'].includes(typeData.name)) continue
  
      const attackTypeId = typeData.id
  
      // Super effective (x2)
      for (const target of typeData.damage_relations.double_damage_to) {
        const defenseTypeId = Number(target.url.split('/').at(-2))
        await prisma.typeEffectiveness.upsert({
          where: { attack_type_id_defense_type_id: { attack_type_id: attackTypeId, defense_type_id: defenseTypeId } },
          update: {},
          create: { attack_type_id: attackTypeId, defense_type_id: defenseTypeId, multiplier: 2.0 },
        })
      }
  
      // Not very effective (x0.5)
      for (const target of typeData.damage_relations.half_damage_to) {
        const defenseTypeId = Number(target.url.split('/').at(-2))
        await prisma.typeEffectiveness.upsert({
          where: { attack_type_id_defense_type_id: { attack_type_id: attackTypeId, defense_type_id: defenseTypeId } },
          update: {},
          create: { attack_type_id: attackTypeId, defense_type_id: defenseTypeId, multiplier: 0.5 },
        })
      }
  
      // No effect (x0)
      for (const target of typeData.damage_relations.no_damage_to) {
        const defenseTypeId = Number(target.url.split('/').at(-2))
        await prisma.typeEffectiveness.upsert({
          where: { attack_type_id_defense_type_id: { attack_type_id: attackTypeId, defense_type_id: defenseTypeId } },
          update: {},
          create: { attack_type_id: attackTypeId, defense_type_id: defenseTypeId, multiplier: 0.0 },
        })
      }
  
      console.log(`Type effectiveness seeded for: ${typeData.name}`)
    }
  
    console.log('Type effectiveness seeded!')
  }

  async function seedItems() {
    console.log('Seeding items...')
  
    const evolutionItems = [
      { id: 1,  name: 'fire-stone'      },
      { id: 2,  name: 'water-stone'     },
      { id: 3,  name: 'thunder-stone'   },
      { id: 4,  name: 'leaf-stone'      },
      { id: 5,  name: 'moon-stone'      },
      { id: 6,  name: 'linking-cord'    },
    ]
  
    for (const item of evolutionItems) {
      await prisma.item.upsert({
        where: { id: item.id },
        update: {},
        create: item,
      })
    }
  
    console.log('Items seeded!')
  }
  
  async function seedAbilities() {
    // Abilities do not exist in Gen 1, introduced in Gen 3
    console.log('Abilities skipped — not available in Gen 1')
  }
  
  async function seedTMs() {
    console.log('Seeding TMs...')
  
    const { data } = await axios.get(`${POKEAPI}/machine?limit=100`)
  
    for (const m of data.results) {
      const { data: machineData } = await axios.get(m.url)
  
      // Only Gen 1 TMs (red-blue and yellow)
      if (!['red-blue', 'yellow'].includes(machineData.version_group.name)) continue
  
      const attackId = Number(machineData.move.url.split('/').at(-2))
      const gameId   = machineData.version_group.name === 'yellow' ? 3 : 1
  
      // Check attack exists in our DB
      const attack = await prisma.attack.findUnique({ where: { id: attackId } })
      if (!attack) continue
  
      await prisma.tM.upsert({
        where: { id: machineData.id },
        update: {},
        create: {
          id:        machineData.id,
          number: Number(machineData.item.url.split('/').at(-2)),
          game_id:   gameId,
          attack_id: attackId,
        },
      })
    }
  
    console.log('TMs seeded!')
  }
  
  async function seedEvolutions() {
    console.log('Seeding evolutions...')
  
    const { data } = await axios.get(`${POKEAPI}/evolution-chain?limit=100`)
  
    for (const e of data.results) {
      const { data: chain } = await axios.get(e.url)
  
      await processEvolutionChain(chain.chain)
    }
  
    console.log('Evolutions seeded!')
  }
  
  async function processEvolutionChain(chain: any) {
    for (const evolution of chain.evolves_to) {
      const fromSpeciesId = Number(chain.species.url.split('/').at(-2))
      const toSpeciesId   = Number(evolution.species.url.split('/').at(-2))
  
      // Only Gen 1 pokemon (id 1-151)
      if (fromSpeciesId > 151 || toSpeciesId > 151) continue
  
      const fromEntry = await prisma.pokedexEntry.findFirst({
        where: { pokemon_id: fromSpeciesId },
      })
      const toEntry = await prisma.pokedexEntry.findFirst({
        where: { pokemon_id: toSpeciesId },
      })
  
      if (!fromEntry || !toEntry) continue
  
      const detail      = evolution.evolution_details[0]
      const levelNeeded = detail?.min_level ?? null
      const itemName    = detail?.item?.name ?? null
  
      let itemId: number | null = null
      if (itemName) {
        const item = await prisma.item.findFirst({ where: { name: itemName } })
        itemId = item?.id ?? null
      }
  
      await prisma.evolution.upsert({
        where: { id: fromSpeciesId * 1000 + toSpeciesId },
        update: {},
        create: {
          id:             fromSpeciesId * 1000 + toSpeciesId,
          from_entry_id:  fromEntry.id,
          to_entry_id:    toEntry.id,
          game_id:        1,
          item_id:        itemId,
          level_needed:   levelNeeded,
          condition:      detail?.trigger?.name ?? null,
        },
      })
  
      // Recursive — handle chains like Bulbasaur -> Ivysaur -> Venusaur
      await processEvolutionChain(evolution)
    }
  }
  
  async function seedSprites() {
    console.log('Seeding sprites...')
  
    const { data } = await axios.get(`${POKEAPI}/pokemon?limit=151`)
  
    for (const p of data.results) {
      const { data: pokemon } = await axios.get(p.url)
  
      const entry = await prisma.pokedexEntry.findFirst({
        where: { pokemon_id: pokemon.id },
      })
  
      if (!entry) continue
  
      const sprites = [
        { variant: 'normal',       url: pokemon.sprites.front_default       },
        { variant: 'shiny',        url: pokemon.sprites.front_shiny         },
        { variant: 'back',         url: pokemon.sprites.back_default        },
        { variant: 'female',       url: pokemon.sprites.front_female        },
      ]
  
      for (const sprite of sprites) {
        if (!sprite.url) continue
  
        await prisma.pokemonSprite.upsert({
          where: {
            id: pokemon.id * 10 + sprites.indexOf(sprite),
          },
          update: {},
          create: {
            id:               pokemon.id * 10 + sprites.indexOf(sprite),
            pokedex_entry_id: entry.id,
            form_id:          null,
            variant:          sprite.variant,
            sprite_url:       sprite.url,
          },
        })
      }
  
      console.log(`Sprites seeded for: ${pokemon.name}`)
    }
  
    console.log('Sprites seeded!')
  }

  async function main() {
    console.log('Starting seed...')
  
    await seedTypes()
    await seedGames()
    await seedAttackMethods()
    await seedPokemons()
    await seedPokedexEntries()
    await seedPokedexVersionData()
    await seedAttacksAndPokemonAttacks()
    await seedTypeEffectiveness()
    await seedItems()
    await seedAbilities()
    await seedTMs()
    await seedEvolutions()
    await seedSprites()
  
    console.log('Seed completed!')
  }

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())