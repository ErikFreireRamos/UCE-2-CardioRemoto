# ---- Builder: instala deps, gera o Prisma Client e compila o TypeScript ----
FROM node:22-alpine AS builder
WORKDIR /app

# Prisma no Alpine precisa da OpenSSL/libssl para os engines.
RUN apk add --no-cache openssl

# Dependências (inclui devDeps para compilar)
COPY package.json package-lock.json* ./
RUN npm install

# Código-fonte
COPY tsconfig*.json ./
COPY prisma ./prisma
COPY src ./src

RUN npx prisma generate
RUN npm run build

# ---- Runtime: imagem final ----
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# OpenSSL também no runtime (migrate deploy + seed + client usam os engines do Prisma).
RUN apk add --no-cache openssl

# Copia node_modules (com Prisma Client gerado e tsx p/ o seed), build, fontes e schema/migrations.
# `src` é necessário porque o seed roda via tsx e importa o domínio clínico de ../src.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src ./src
COPY --from=builder /app/prisma ./prisma
COPY tsconfig*.json ./
COPY package.json ./

EXPOSE 3000

# O comando real (migrate + seed + start) vem do docker-compose.yml.
CMD ["node", "dist/server.js"]
