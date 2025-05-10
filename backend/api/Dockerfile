# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with specific flags to reduce space
RUN npm ci --no-audit --no-fund --prefer-offline

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only with specific flags
RUN npm ci --only=production --no-audit --no-fund --prefer-offline && \
    npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy environment file
COPY .env* ./

# Clean up any unnecessary files
RUN rm -rf /app/node_modules/.cache && \
    rm -rf /app/node_modules/@types

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["npm", "run", "start:prod"] 