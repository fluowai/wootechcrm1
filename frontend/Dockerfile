# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Aceitar variáveis no momento do build
ARG VITE_API_URL
ARG VITE_LIVEKIT_URL
ARG VITE_PANEL_URL
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

# Repassar como variáveis de ambiente para o Vite enxergar durante o build
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_LIVEKIT_URL=$VITE_LIVEKIT_URL
ENV VITE_PANEL_URL=$VITE_PANEL_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

COPY package*.json ./
# Ignorar dependências opcionais que possam quebrar no Alpine
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Serve
FROM nginx:alpine

# Remover a configuração padrão do Nginx
RUN rm /etc/nginx/conf.d/default.conf

# Copiar a configuração customizada
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar os arquivos gerados no Stage 1
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
