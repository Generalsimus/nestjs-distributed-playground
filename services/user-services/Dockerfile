FROM node:20-alpine
WORKDIR /app

COPY ./services/user-services/ ./

RUN npm ci
RUN npm run build

EXPOSE 5001
CMD ["npm", "run", "start:dev"]
# # Install deps first for layer caching
# COPY services/user-services/package*.json ./services/user-services/
# RUN cd services/user-services && npm ci

# # Copy source in project-root layout so rootDir: "../.." resolves correctly
# COPY services/user-services/tsconfig*.json  ./services/user-services/
# COPY services/user-services/nest-cli.json   ./services/user-services/
# COPY services/user-services/src             ./services/user-services/src

# RUN cd services/user-services && npx nest build

# # ── Dev image (used by docker compose watch) ────────────────────────
# FROM node:20-alpine AS dev
# WORKDIR /app
# COPY proto ./proto
# COPY services/user-services/package*.json ./services/user-services/
# RUN cd services/user-services && npm ci
# COPY services/user-services/tsconfig*.json  ./services/user-services/
# COPY services/user-services/nest-cli.json   ./services/user-services/
# COPY services/user-services/src             ./services/user-services/src
# CMD ["sh", "-c", "cd services/user-services && npx nest build && node /app/dist/services/user-services/src/main"]

# # ── Production image ────────────────────────────────────────────────
# FROM node:20-alpine
# WORKDIR /app

# ENV NODE_ENV=production
# ENV PROTO_DIR=/app/proto

# COPY --from=builder /app/proto                        ./proto
# COPY --from=builder /app/services/user-services/dist  ./dist
# COPY --from=builder /app/services/user-services/package*.json ./
# RUN npm ci --omit=dev

# EXPOSE 5001
# CMD ["node", "dist/services/user-services/src/main"]
