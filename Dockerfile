FROM node:22-bookworm-slim AS build

ENV NODE_ENV=production
WORKDIR /app

# Native deps needed to compile canvas & better-sqlite3
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    build-essential \
    python3 \
    pkg-config \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg62-turbo-dev \
    libgif-dev \
    librsvg2-dev \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

FROM node:22-bookworm-slim AS runner

ENV NODE_ENV=production \
    PORT=8080
WORKDIR /app

# Runtime libs for canvas bindings
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    libcairo2 \
    libpango-1.0-0 \
    libjpeg62-turbo \
    libgif7 \
    librsvg2-2 \
  && rm -rf /var/lib/apt/lists/*

COPY --from=build /app /app

EXPOSE 8080

# Persist poster output / seen cache outside the container if desired
VOLUME ["/app/out", "/app/data"]

CMD ["node", "src/server.js"]
