import type { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function pokemonRoutes(server: FastifyInstance) {

  // GET /pokemon — liste légère
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
        id:     p.id,
        name:   p.name,
        type1:  entry?.type1.name ?? null,
        type2:  entry?.type2?.name ?? null,
        sprite: entry?.sprites[0]?.sprite_url ?? null,
      }
    })
  })

  // GET /pokemon/:id — détail sans attaques
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
  
        results.push({
          pokedex_id: targetEntry.pokemon_id,
          name:       targetEntry.pokemon.name,
          condition,
        })
  
        const deeper = await getFullEvolutionChain(targetEntry.id, direction)
        results.push(...deeper)
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
  
    const type_effectiveness = Array.from(multiplierMap.entries())
      .map(([name, multiplier]) => ({ name, multiplier }))
      .sort((a, b) => b.multiplier - a.multiplier)
  
    const sprites = Object.fromEntries(
      mainEntry?.sprites.map(s => [s.variant, s.sprite_url]) ?? []
    )
  
    const evolutions = {
      pre:  pre.length  ? pre  : null,
      next: next.length ? next : null,
      mega: null,
    }

    const types = [
      { name: mainEntry?.type1.name },
      mainEntry?.type2 ? { name: mainEntry.type2.name } : null,
    ].filter(Boolean)
  
    return {
      id:    pokemon.id,
      name:  pokemon.name,
      types: types,
      stats: {
        hp:         mainEntry?.stats?.hp,
        atk:     mainEntry?.stats?.attack,
        def:    mainEntry?.stats?.defense,
        spe_atk:  mainEntry?.stats?.sp_attack,
        spe_def: mainEntry?.stats?.sp_defense,
        speed:      mainEntry?.stats?.speed,
      },
      ev_yield: {
        hp:         mainEntry?.evYield?.hp,
        atk:     mainEntry?.evYield?.attack,
        def:    mainEntry?.evYield?.defense,
        spe_atk:  mainEntry?.evYield?.sp_attack,
        spe_def: mainEntry?.evYield?.sp_defense,
        speed:      mainEntry?.evYield?.speed,
      },
      type_effectiveness,
      evolutions,
      sprites,
    }
  })

  // GET /pokemon/:id/moves — attaques séparées avec CT/CS
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