# =========================================================
# Etapa 1: Construcción (Build Stage)
# =========================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Instala dependencias necesarias para compilar Prisma
RUN apk add --no-cache openssl libc6-compat

# Copia manifiestos de dependencias
COPY package.json pnpm-lock.yaml* package-lock.json* ./
COPY prisma ./prisma/

# Instala dependencias completas
RUN npm ci || npm install

# Copia código fuente y configuraciones
COPY tsconfig*.json nest-cli.json ./
COPY src ./src

# Genera cliente Prisma y compila NestJS
RUN npx prisma generate
RUN npm run build

# =========================================================
# Etapa 2: Producción (Production Stage)
# =========================================================
FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache openssl libc6-compat

ENV NODE_ENV=production
ENV PORT=3001

# Usuario sin privilegios por seguridad
USER node

# Copia artefactos compilados y dependencias necesarias
COPY --chown=node:node --from=builder /app/package.json ./
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/prisma ./prisma

EXPOSE 3001

CMD ["node", "dist/src/main"]
