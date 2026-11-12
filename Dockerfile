# Production image (for an EC2 instance). Build: docker build -t school-server .
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig*.json ./
COPY src ./src
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
# do not run as root inside the container
USER node
EXPOSE 4000
CMD ["node", "dist/server.js"]
