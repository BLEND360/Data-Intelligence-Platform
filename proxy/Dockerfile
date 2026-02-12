# CLARITY - Nginx Proxy Dockerfile
# This container acts as a reverse proxy, routing traffic to frontend and backend

FROM nginx:alpine

# Required build arguments for service URLs (used at runtime via envsubst)
ARG FRONTEND_SERVICE
ARG BACKEND_SERVICE

# Install bash for envsubst command
RUN apk update && apk add bash

# Expose proxy port (public endpoint)
EXPOSE 8000

# Copy nginx configuration template
COPY nginx.conf.template /nginx.conf.template

# Start nginx with environment variable substitution
# This replaces $FRONTEND_SERVICE and $BACKEND_SERVICE in the template
CMD ["/bin/sh", "-c", "envsubst '$FRONTEND_SERVICE $BACKEND_SERVICE' < /nginx.conf.template > /etc/nginx/nginx.conf && exec nginx -g 'daemon off;'"]
