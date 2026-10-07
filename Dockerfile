# ---- build ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# VITE_* values are baked into the client bundle at build time
ARG VITE_API_URL=https://api.reelzoy.com
ARG VITE_DEMO_MODE=false
ENV VITE_API_URL=$VITE_API_URL \
    VITE_DEMO_MODE=$VITE_DEMO_MODE \
    NITRO_PRESET=node-server
RUN npx vite build

# ---- run ----
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
COPY --from=build /app/.output ./.output
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
