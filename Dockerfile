# Dockerfile para AramHouse TS - Sistema de Ranking ARAM com MMR
# Multi-stage build para otimização de tamanho e segurança

# Stage 1: Build stage
FROM node:18-alpine AS builder

# Define diretório de trabalho
WORKDIR /app

# Copia arquivos de dependências
COPY package*.json ./
COPY tsconfig.json ./

# Instala dependências
RUN npm ci --only=production && npm cache clean --force

# Copia código fonte
COPY src/ ./src/

# Compila TypeScript para JavaScript
RUN npm run build

# Stage 2: Production stage
FROM node:18-alpine AS production

# Instala dumb-init para gerenciamento adequado de processos
RUN apk add --no-cache dumb-init

# Cria usuário não-root para segurança
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Define diretório de trabalho
WORKDIR /app

# Copia package.json e package-lock.json
COPY package*.json ./

# Instala apenas dependências de produção
RUN npm ci --only=production && npm cache clean --force

# Copia arquivos compilados do stage de build
COPY --from=builder /app/dist ./dist

# Copia arquivo de configuração
COPY src/config.json ./dist/

# Copia banco de dados se existir
COPY *.db ./dist/ 2>/dev/null || true

# Define propriedade do diretório para o usuário nodejs
RUN chown -R nodejs:nodejs /app

# Muda para usuário não-root
USER nodejs

# Expõe porta da aplicação
EXPOSE 3000

# Define variáveis de ambiente
ENV NODE_ENV=production
ENV PORT=3000

# Usa dumb-init para gerenciar o processo Node.js
ENTRYPOINT ["dumb-init", "--"]

# Comando para iniciar a aplicação
CMD ["node", "dist/index.js"]

# Labels para documentação
LABEL maintainer="AramHouse Team"
LABEL description="Sistema de ranking ARAM com MMR robusto e TypeScript"
LABEL version="2.0.0"
LABEL org.opencontainers.image.source="https://github.com/your-org/araminhouse"
