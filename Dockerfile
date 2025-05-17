# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy only package files and install dependencies
COPY package.json ./
RUN npm install

# Copy source files
COPY . .

# Build the application
RUN npm run build

# Final stage
FROM nginx:alpine


# Add image metadata
LABEL org.opencontainers.image.description="A front-end only client for NovelAI's image generation, built with TailwindCSS, and Alpine.js." \
      org.opencontainers.image.source="https://github.com/Nya-Foundation/NyaNovel" \
      org.opencontainers.image.licenses="MIT"

COPY nginx.conf /etc/nginx/nginx.conf

# Copy built static files and set ownership in one step
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy and set permissions for custom entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]