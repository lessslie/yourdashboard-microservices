
FROM node:20-alpine

LABEL maintainer="YourDashboard Team"
LABEL description="Microservicio de gestión de emails con Gmail API"
LABEL version="1.0"

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY . .
RUN npm run build && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 && \
    chown -R nestjs:nodejs /app

USER nestjs

EXPOSE 3002
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
CMD node healthcheck.js || exit 1
CMD ["npm", "run", "start:prod"]