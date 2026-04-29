import type { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function pokemonRoutes(server: FastifyInstance) {

  // GET /pokemon — simple list of pokemon 
  server.get('/pokemon', async (request, reply) => {
    const pokemons = await prisma.pokemon.findMany({
      orderBy: { id: 'asc' },
      include: {
        entries: {
          take: 1,
          include: {
            type1: true,
            type2: true,
            sprites: {
              where: { variant: 'normal' },
              take: 1,
            },
          },
        },
      },
    })

    return pokemons.map(p => {
      const entry = p.entries[0]
      return {
        pokedex_id: p.id,
        name: {
          fr: p.name,
          en: p.name,
          jp: null,
        },
        sprites: {
          regular: entry?.sprites[0]?.sprite_url ?? null,
        },
        types: [
          { name: entry?.type1.name ?? null },
          entry?.type2 ? { name: entry.type2.name } : null,
        ].filter(Boolean),
      }
    })
  })

  // GET /gen/:gen — list of generation
  server.get('/gen/:gen', async (request, reply) => {
    const { gen } = request.params as { gen: string }
  
    const versionGroups = await prisma.versionGroup.findMany({
      where: { generation: Number(gen) },
      select: { id: true },
    })
  
    if (!versionGroups.length) {
      return reply.status(404).send({ error: 'Generation not found' })
    }
  
    const versionGroupIds = versionGroups.map(vg => vg.id)
  
    const entryVersions = await prisma.pokedexEntryVersion.findMany({
      where: { version_group_id: { in: versionGroupIds } },
      distinct: ['pokedex_entry_id'],
      include: {
        pokedexEntry: {
          include: {
            pokemon: true,
            type1:   true,
            type2:   true,
            sprites: {
              where: { variant: 'normal' },
              take: 1,
            },
          },
        },
      },
      orderBy: { pokedex_entry_id: 'asc' },
    })
  
    return entryVersions.map(ev => {
      const e = ev.pokedexEntry
      return {
        pokedex_id: e.pokemon_id,
        name: {
          fr: e.pokemon.name,
          en: e.pokemon.name,
          jp: null,
        },
        sprites: {
          regular: e.sprites[0]?.sprite_url ?? null,
        },
        types: [
          { name: e.type1.name },
          e.type2 ? { name: e.type2.name } : null,
        ].filter(Boolean),
      }
    })
  })

  // GET /pokemon/:id — details without atk
  server.get('/pokemon/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    async function getFullEvolutionChain(
      entryId: number,
      direction: 'next' | 'pre'
    ): Promise<{ pokedex_id: number; name: string; condition: string | null }[]> {
      const results: { pokedex_id: number; name: string; condition: string | null }[] = []

      const evolutions = direction === 'next'
        ? await prisma.evolution.findMany({
            where: { from_entry_id: entryId },
            include: {
              toEntry: { include: { pokemon: true } },
              item: true,
            },
          })
        : await prisma.evolution.findMany({
            where: { to_entry_id: entryId },
            include: {
              fromEntry: { include: { pokemon: true } },
              item: true,
            },
          })

      for (const e of evolutions) {
        const targetEntry = direction === 'next'
          ? (e as any).toEntry
          : (e as any).fromEntry

        const condition = e.level_needed
          ? `Niveau ${e.level_needed}`
          : e.item?.name
            ? `Pierre ${e.item.name}`
            : e.condition ?? null

        const deeper = await getFullEvolutionChain(targetEntry.id, direction)

        if (direction === 'pre') {
          results.push(...deeper)
          results.push({ pokedex_id: targetEntry.pokemon_id, name: targetEntry.pokemon.name, condition })
        } else {
          results.push({ pokedex_id: targetEntry.pokemon_id, name: targetEntry.pokemon.name, condition })
          results.push(...deeper)
        }
      }

      return results
    }

    const [pokemon, entry] = await Promise.all([
      prisma.pokemon.findUnique({
        where: { id: Number(id) },
        include: {
          entries: {
            take: 1,
            include: {
              type1:   true,
              type2:   true,
              stats:   true,
              evYield: true,
              sprites: true,
            },
          },
        },
      }),
      prisma.pokedexEntry.findFirst({
        where: { pokemon_id: Number(id) },
      }),
    ])

    if (!pokemon || !entry) {
      return reply.status(404).send({ error: 'Pokemon not found' })
    }

    const mainEntry = pokemon.entries[0]

    const typeIds = [mainEntry?.type1_id, mainEntry?.type2_id].filter(Boolean) as number[]

    const [effectiveness, allTypes, pre, next] = await Promise.all([
      prisma.typeEffectiveness.findMany({
        where: { defense_type_id: { in: typeIds } },
        include: { attackType: true },
      }),
      prisma.type.findMany(),
      getFullEvolutionChain(entry.id, 'pre'),
      getFullEvolutionChain(entry.id, 'next'),
    ])

    const multiplierMap = new Map<string, number>()
    for (const t of allTypes) {
      multiplierMap.set(t.name, 1)
    }
    for (const e of effectiveness) {
      const typeName = e.attackType.name
      const current  = multiplierMap.get(typeName) ?? 1
      multiplierMap.set(typeName, current * e.multiplier)
    }

    const resistances = Array.from(multiplierMap.entries())
      .filter(([name]) => name !== 'stellar')
      .map(([name, multiplier]) => ({ name, multiplier }))
      .sort((a, b) => b.multiplier - a.multiplier)

    const sprites = {
      regular: mainEntry?.sprites.find(s => s.variant === 'normal')?.sprite_url ?? null,
      shiny:   mainEntry?.sprites.find(s => s.variant === 'shiny')?.sprite_url ?? null,
    }

    const types = [
      { name: mainEntry?.type1.name },
      mainEntry?.type2 ? { name: mainEntry.type2.name } : null,
    ].filter(Boolean)

    const evolution = {
      pre:  pre.length  ? pre  : null,
      next: next.length ? next : null,
      mega: null,
    }

    return {
      pokedex_id: pokemon.id,
      name: {
        fr: pokemon.name,
        en: pokemon.name,
        jp: null,
      },
      sprites,
      types,
      stats: {
        hp:      mainEntry?.stats?.hp,
        atk:     mainEntry?.stats?.attack,
        def:     mainEntry?.stats?.defense,
        spe_atk: mainEntry?.stats?.sp_attack,
        spe_def: mainEntry?.stats?.sp_defense,
        vit:     mainEntry?.stats?.speed,
      },
      ev_yield: {
        hp:      mainEntry?.evYield?.hp,
        atk:     mainEntry?.evYield?.attack,
        def:     mainEntry?.evYield?.defense,
        spe_atk: mainEntry?.evYield?.sp_attack,
        spe_def: mainEntry?.evYield?.sp_defense,
        vit:     mainEntry?.evYield?.speed,
      },
      resistances,
      evolution,
      height: mainEntry?.height,
      weight: mainEntry?.weight,
      category: mainEntry?.category,
      capture_rate: mainEntry?.capture_rate,
      sexe: {
        male: mainEntry?.male,
        female: mainEntry?.female,
      }
    }
  })

  // GET /pokemon/:id/moves — List of attaques per pokemon id and separate with CT/CS
  server.get('/pokemon/:id/moves', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { version_group } = request.query as { version_group?: 'red-blue' | 'yellow' }
    const selectedVersionGroup = version_group ?? 'red-blue'
    const versionGroupId = selectedVersionGroup === 'yellow' ? 2 : 1
    const gameIdsForTMs = versionGroupId === 2 ? [3] : [1, 2]

    const [entry, tms] = await Promise.all([
      prisma.pokedexEntry.findFirst({
        where: { pokemon_id: Number(id) },
        include: {
          attacks: {
            where: { version_group_id: versionGroupId },
            include: {
              attack: { include: { type: true } },
              method: true,
            },
            orderBy: { level_learned: 'asc' },
          },
        },
      }),
      prisma.tM.findMany({
        where: { game_id: { in: gameIdsForTMs } },
        select: { attack_id: true, number: true },
      }),
    ])

    if (!entry) {
      return reply.status(404).send({ error: 'Pokemon not found' })
    }

    const tmMap = new Map(tms.map(tm => [tm.attack_id, tm.number]))

    const seenMoves = new Set<string>()
    const moves = entry.attacks
      .filter(a => {
        const key = `${a.attack.name}-${a.method.name}`
        if (seenMoves.has(key)) return false
        seenMoves.add(key)
        return true
      })
      .map(a => {
        const tmNumber    = tmMap.get(a.attack_id) ?? null
        const machineType = tmNumber
          ? tmNumber <= 50 ? 'CT' : 'CS'
          : null

        return {
          name:           a.attack.name,
          type:           a.attack.type.name,
          power:          a.attack.power,
          accuracy:       a.attack.accuracy,
          category:       a.attack.category,
          description:    a.attack.description,
          method:         a.method.name,
          machine_type:   machineType,
          machine_number: tmNumber,
          level:          a.level_learned,
        }
      })

    return { moves }
  })
}