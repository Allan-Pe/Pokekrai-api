import Fastify from 'fastify'
import pokemonRoutes from './routes/pokemon.ts'

const server = Fastify({ logger: true })

server.register(pokemonRoutes)

server.listen({ port: 3000, host: '0.0.0.0' }, (err) => {
  if (err) {
    server.log.error(err)
    process.exit(1)
  }
})