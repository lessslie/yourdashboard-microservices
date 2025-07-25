
FROM node:20-alpine


LABEL maintainer="YourDashboard Team"
LABEL description="Orchestrator BFF - Coordina microservicios y cache Redis"
LABEL version="1.0"


# ¿Por qué curl? Para hacer health checks a otros microservicios
# ¿Por qué en Alpine? Necesitamos instalarlo manualmente
RUN apk add --no-cache curl

WORKDIR /app

#  Copiar package files primero para cache optimization
COPY package*.json ./

# Instalar dependencias y limpiar cache
RUN npm ci --only=production && npm cache clean --force

COPY . .

# Compilar TypeScript + Crear usuario seguro
RUN npm run build && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 && \
    chown -R nestjs:nodejs /app

# Cambiar a usuario no-root
USER nestjs

EXPOSE 3003

# Verificar que el orchestrator está vivo Y puede conectar a Redis
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
CMD node healthcheck.js || exit 1
CMD ["npm", "run", "start:prod"]