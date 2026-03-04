FROM node:22-alpine

WORKDIR /app

# copiar package files
COPY package*.json ./

# instalar dependencias
RUN npm install

# copiar el resto del proyecto
COPY . .

# compilar typescript
RUN npm run build

# exponer puerto
EXPOSE 3000

# iniciar servidor
CMD ["npm", "run", "start"]