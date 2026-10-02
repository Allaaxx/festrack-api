# syntax=docker/dockerfile:1

FROM oven/bun:1.4.2 AS base
WORKDIR /app

# Install production dependencies
FROM base AS install
RUN mkdir -p /temp/prod
COPY package.json bun.lock /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production --ignore-scripts

# Production runner image
FROM base AS release
COPY --from=install /temp/prod/node_modules node_modules
COPY package.json .
COPY index.ts .
COPY src src
COPY docs/swagger.json docs/swagger.json
COPY drizzle.config.ts .

USER bun
EXPOSE 3000
ENTRYPOINT [ "bun", "run", "index.ts" ]
