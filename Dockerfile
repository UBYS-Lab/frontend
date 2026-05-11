# Stage 1: Build
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:22-alpine AS production
WORKDIR /app
COPY --from=builder /app/dist ./dist
EXPOSE 4000
ENV PORT=4000
CMD ["node", "dist/ubys-frontend/server/server.mjs"]
