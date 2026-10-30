# --- Build stage ---
FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Console and exercise targets are configurable at build time.
ARG PUBLIC_RHYDB_DEFAULT_SERVER=https://gs-staging-1.int.genspectrum.org/open/v2/silo
ARG PUBLIC_RHYDB_EXERCISE_SERVER=https://gs-staging-1.int.genspectrum.org/open/v2/silo
ENV PUBLIC_RHYDB_DEFAULT_SERVER=$PUBLIC_RHYDB_DEFAULT_SERVER
ENV PUBLIC_RHYDB_EXERCISE_SERVER=$PUBLIC_RHYDB_EXERCISE_SERVER
ENV PUBLIC_RHYDB_WASM_ENABLED=true
RUN npm run build
# Precompress text and WASM assets (the RhyDB WASM shrinks from ~20 MB to ~4 MB); nginx serves them via gzip_static.
RUN find dist -type f \( -name '*.html' -o -name '*.js' -o -name '*.mjs' -o -name '*.css' -o -name '*.json' \
    -o -name '*.svg' -o -name '*.txt' -o -name '*.xml' -o -name '*.yaml' -o -name '*.wasm' \) -exec gzip -9 -k {} +

# --- Serve stage ---
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 5001
