# Imagen base de Node.js (¿Por qué? Porque NestJS corre en Node)
FROM node:18-alpine

# Directorio de trabajo dentro del contenedor (¿Por qué? Organización)
WORKDIR /app

# Copiar archivos de dependencias PRIMERO (¿Por qué? Para cache de Docker)
COPY package*.json ./

# Instalar TODAS las dependencias (¿Por qué? Necesitamos devDeps para build)
RUN npm ci && npm cache clean --force

# Copiar el código fuente (¿Por qué al final? Para aprovechar cache)
COPY . .

# Compilar TypeScript a JavaScript (¿Por qué? Producción necesita JS)
RUN npm run build

# Limpiar dependencias de desarrollo después del build (¿Por qué? Imagen más ligera)
RUN npm ci --only=production && npm cache clean --force

# Exponer puerto (¿Por qué 3002? Es nuestro puerto configurado)
EXPOSE 3002

# Crear usuario no-root (¿Por qué? Seguridad)
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001
USER nestjs

# Comando para iniciar la aplicación (¿Por qué start:prod? Es la versión compilada)
CMD ["npm", "run", "start:prod"]