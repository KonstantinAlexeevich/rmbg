# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json .npmrc ./
# canvas нужен только тестам; для web-сборки достаточно пакета без native build
RUN npm ci --ignore-scripts

COPY . .

ARG VITE_SITE_ORIGIN=
ENV VITE_SITE_ORIGIN=$VITE_SITE_ORIGIN

RUN npm run build:web

FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist-web /usr/share/nginx/html
EXPOSE 8080
