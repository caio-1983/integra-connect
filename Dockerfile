FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .

# Vite bakes VITE_* vars into the bundle at build time, so they must arrive
# as build args here — setting them only at `docker run` would have no effect.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_PROJECT_ID
# Backend gateway (WhatsApp + AI). Legacy VITE_AI_GATEWAY_* kept as a fallback.
ARG VITE_BACKEND_URL
ARG VITE_BACKEND_KEY
ARG VITE_AI_GATEWAY_URL
ARG VITE_AI_GATEWAY_KEY
ARG VITE_PLATFORM_PHASE
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY \
    VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID \
    VITE_BACKEND_URL=$VITE_BACKEND_URL \
    VITE_BACKEND_KEY=$VITE_BACKEND_KEY \
    VITE_AI_GATEWAY_URL=$VITE_AI_GATEWAY_URL \
    VITE_AI_GATEWAY_KEY=$VITE_AI_GATEWAY_KEY \
    VITE_PLATFORM_PHASE=$VITE_PLATFORM_PHASE
RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
