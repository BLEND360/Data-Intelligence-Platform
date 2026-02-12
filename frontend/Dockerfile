# CLARITY - Frontend Dockerfile
# React + TypeScript + Vite application with shadcn/ui components

# =============================================================================
# Build Stage
# =============================================================================
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
COPY bun.lockb* ./

# Install dependencies using npm (works with both npm and bun lockfiles)
RUN npm install

# Copy source code
COPY . .

# Build the application with production API URL
# The /api prefix will be handled by the nginx proxy
ENV VITE_API_URL=/api
RUN npm run build

# =============================================================================
# Production Stage
# =============================================================================
FROM node:20-slim

WORKDIR /app

# Install serve globally to serve static files
RUN npm install -g serve

# Copy built assets from builder stage
COPY --from=builder /app/dist ./dist

# Expose port 8080
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Serve the static files in single-page app mode
# -s flag enables SPA mode (redirects all routes to index.html)
CMD ["serve", "-s", "dist", "-l", "8080"]
