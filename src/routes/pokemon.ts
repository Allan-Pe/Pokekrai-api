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

    const pokemon = await prisma.pokemon.findUnique({
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
    })

    if (!pokemon) {
      return reply.status(404).send({ error: 'Pokemon not found' })
    }

    const entry = pokemon.entries[0]

    const sprites = Object.fromEntries(
      entry?.sprites.map(s => [s.variant, s.sprite_url]) ?? []
    )

    return {
      id:    pokemon.id,
      name:  pokemon.name,
      type1: entry?.type1.name ?? null,
      type2: entry?.type2?.name ?? null,
      stats: {
        hp:         entry?.stats?.hp,
        attack:     entry?.stats?.attack,
        defense:    entry?.stats?.defense,
        sp_attack:  entry?.stats?.sp_attack,
        sp_defense: entry?.stats?.sp_defense,
        speed:      entry?.stats?.speed,
      },
      ev_yield: {
        hp:         entry?.evYield?.hp,
        attack:     entry?.evYield?.attack,
        defense:    entry?.evYield?.defense,
        sp_attack:  entry?.evYield?.sp_attack,
        sp_defense: entry?.evYield?.sp_defense,
        speed:      entry?.evYield?.speed,
      },
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