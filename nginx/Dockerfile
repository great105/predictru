# Stage 1: Build Mini App frontend
FROM node:20-alpine AS miniapp-build
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# Stage 2: Build web frontend
FROM node:20-alpine AS web-build
WORKDIR /app
COPY web/package.json web/package-lock.json* ./
RUN npm ci
COPY web/ .
RUN npm run build

# Stage 3: Nginx with both frontends
FROM nginx:1.25-alpine
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY --from=miniapp-build /app/dist/ /usr/share/nginx/html/
COPY --from=web-build /app/dist/ /usr/share/nginx/web/
