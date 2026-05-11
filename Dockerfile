FROM node:20

WORKDIR /app

# dépendances
COPY package*.json ./
COPY prisma ./prisma

RUN npm install

# code
COPY . .

# Prisma client
RUN npx prisma generate

EXPOSE 3000

CMD ["npm", "run", "dev"]