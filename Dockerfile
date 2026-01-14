# =============================================================================
# Stage 1: Builder
# =============================================================================
# This stage installs all dependencies and compiles TypeScript to JavaScript.
# The compiled output and node_modules are used in the production stage.
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files first for better layer caching
# These files change less frequently than source code
COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies for TypeScript compilation)
RUN npm ci

# Copy TypeScript configuration and source code
COPY tsconfig.json ./
COPY src/ ./src/

# Compile TypeScript to JavaScript
# Output goes to ./dist directory as configured in tsconfig.json
RUN npm run build

# =============================================================================
# Stage 2: Production
# =============================================================================
# This stage creates the final lightweight production image.
# It only includes compiled JavaScript and production dependencies.
FROM node:20-alpine AS production

# Set environment to production
# This affects npm behavior and application configuration
ENV NODE_ENV=production

# Create non-root user for security
# Running as root in containers is a security risk
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Copy package files for production dependency installation
COPY package.json package-lock.json* ./

# Install only production dependencies
# --omit=dev excludes devDependencies (TypeScript, testing tools, etc.)
# --ignore-scripts prevents running postinstall scripts that might need dev tools
RUN npm ci --omit=dev --ignore-scripts && \
    npm cache clean --force

# Copy compiled JavaScript from builder stage
COPY --from=builder /app/dist ./dist

# Change ownership to non-root user
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose the application port
# This documents which port the container listens on
EXPOSE 3000

# Health check to verify the container is running correctly
# Used by Docker and orchestrators to determine container health
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start the application
# Use node directly (not npm) for proper signal handling
CMD ["node", "dist/server.js"]
