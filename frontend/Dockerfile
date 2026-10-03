# ==============================================================================
# WeatherGPT Frontend Multi-Stage Dockerfile (Node 20 + Nginx Alpine)
# ==============================================================================

# Stage 1: Build the React + Vite frontend
FROM node:20-alpine AS build

WORKDIR /app

# Cache package dependencies
COPY package*.json ./
RUN npm ci

# Copy frontend source and build assets
COPY . .
RUN npm run build

# Stage 2: Serve production bundle with Nginx
FROM nginx:alpine

# Copy built assets from builder stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
