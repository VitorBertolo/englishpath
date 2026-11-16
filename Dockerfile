FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci
COPY backend backend
COPY frontend frontend
COPY database database
RUN npm run build && npm prune --omit=dev

FROM node:24-bookworm-slim
ENV NODE_ENV=production BIND_HOST=0.0.0.0 PORT=3000
WORKDIR /app/backend
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/backend/package.json ./package.json
COPY --from=build /app/backend/dist ./dist
COPY --from=build /app/database/migrations /app/database/migrations
COPY --from=build /app/frontend/dist /app/frontend/dist
EXPOSE 3000
USER node
CMD ["node", "dist/backend/src/server.js"]
