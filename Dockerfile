# Multi-stage Dockerfile for building and running the app
# 1) Builder: installs deps (including dev), builds client and server
# 2) Runner: installs only production deps and runs the built server

# ---- Builder stage ----
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install dependencies
# Copy only package manifests first to maximize layer caching
COPY package.json package-lock.json ./
# Install all deps including optional to ensure native binaries for rollup/esbuild are available on Alpine (musl)
RUN npm ci

# Copy the rest of the project files
COPY . .

# Build client (Vite) and server (esbuild)
RUN npm run build

# ---- Production runner ----
FROM node:20-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app

# Install only production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy the built artifacts from the builder
COPY --from=builder /app/dist ./dist

# The server listens on PORT (default 5000)
ENV PORT=5000
EXPOSE 5000

# Start the server
CMD ["node", "dist/index.js"]
