FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY --from=build /app/dist ./dist
COPY db ./db
ARG GIT_COMMIT_SHA=unknown
ENV GIT_COMMIT_SHA=$GIT_COMMIT_SHA
USER node
EXPOSE 3000
CMD ["node", "dist/server.js"]
