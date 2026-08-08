# syntax=docker/dockerfile:1
#
# mytheus-ui as a container. Multi-stage so the runtime image carries the compiled app and its
# production dependencies, not the toolchain.
#
# Node is pinned to 20 deliberately. Next 14.2 predates Node 25, and on Node 25 the build
# completes every phase - compile, 57/57 static pages - and then fails writing the standalone
# output because `routes-manifest.json` is never emitted. `engines` in next's package.json says
# only ">=18.17.0", so nothing warns you; the failure surfaces as an ENOENT on a copyfile at the
# very last step. Pinning here is what makes the build reproducible regardless of whatever node
# a developer or runner happens to have.
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# `npm ci` not `npm install`: the lockfile is the contract, and install would silently resolve
# a different tree than the one that was tested.
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Clerk validates its publishable key at BUILD time, and its provider wraps the root layout, so
# prerendering ANY page - the marketing pages included - fails without a real key. It is
# publishable by design and safe in the bundle; the secret key is needed because Server
# Components call Clerk during prerender. Neither is baked into the final image: this is a
# build stage, and the runtime reads its own environment.
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG CLERK_SECRET_KEY
ARG API_GATEWAY_URL
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY \
    CLERK_SECRET_KEY=$CLERK_SECRET_KEY \
    API_GATEWAY_URL=$API_GATEWAY_URL \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
# The standalone bundle already contains only the dependencies the server actually reaches.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
USER nextjs
EXPOSE 3000
# No shell form: exec form makes node PID 1 so SIGTERM reaches it and rollouts drain cleanly.
CMD ["node", "server.js"]
