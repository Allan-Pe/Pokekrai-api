import Fastify from 'fastify'
import cors from '@fastify/cors'
import pokemonRoutes from './routes/pokemon.js'

const server = Fastify({ logger: true })

await server.register(cors, {
  origin: 'http://localhost:5173',
})

await server.register(pokemonRoutes)

server.listen({ port: 3000, host: '0.0.0.0' }, (err) => {
  if (err) {
    server.log.error(err)
    process.exit(1)
  }
})