FROM node:20-alpine

# wget is used by the container healthcheck below
RUN apk add --no-cache wget

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY . .

# Don't run the API as root. The node image already ships an unprivileged "node" user.
RUN chown -R node:node /app
USER node

ENV NODE_ENV=production
EXPOSE 5000

# /api/health pings the master database, so an unhealthy mark means MySQL is really gone
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- http://127.0.0.1:5000/api/health || exit 1

CMD ["node", "server.js"]
