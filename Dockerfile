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
# Public, inlined into the bundle at build time: the app/marketing host split, the LiveKit SFU
# host, and the realtime-gateway origin. Empty leaves each feature off, as before.
ARG NEXT_PUBLIC_APP_HOST=""
ARG NEXT_PUBLIC_MARKETING_ORIGIN=""
ARG NEXT_PUBLIC_LIVEKIT_URL=""
ARG NEXT_PUBLIC_REALTIME_WS_URL=""
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY \
    CLERK_SECRET_KEY=$CLERK_SECRET_KEY \
    API_GATEWAY_URL=$API_GATEWAY_URL \
    NEXT_PUBLIC_APP_HOST=$NEXT_PUBLIC_APP_HOST \
    NEXT_PUBLIC_MARKETING_ORIGIN=$NEXT_PUBLIC_MARKETING_ORIGIN \
    NEXT_PUBLIC_LIVEKIT_URL=$NEXT_PUBLIC_LIVEKIT_URL \
    NEXT_PUBLIC_REALTIME_WS_URL=$NEXT_PUBLIC_REALTIME_WS_URL \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Mytheus Capture, the Chrome extension in extension/ (its own package and build, outside the
# Next app). Built here so the /capture page can offer the zip for download. The dashboard
# origin it signs in through is baked into the extension at build time.
ARG CAPTURE_DASHBOARD_ORIGIN=https://dashboard.mytheus.cloud
RUN npm ci --prefix extension && \
    MYTHEUS_DASHBOARD_ORIGIN=$CAPTURE_DASHBOARD_ORIGIN npm run build --prefix extension

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
# The standalone bundle already contains only the dependencies the server actually reaches.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
# Served by /api/capture/extension (CAPTURE_EXTENSION_ZIP defaults to this path).
COPY --from=builder --chown=nextjs:nodejs /app/extension/dist/mytheus-capture.zip ./extension/dist/mytheus-capture.zip
USER nextjs
EXPOSE 3000
# No shell form: exec form makes node PID 1 so SIGTERM reaches it and rollouts drain cleanly.
CMD ["node", "server.js"]
