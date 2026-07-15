FROM node:20-alpine

WORKDIR /app
COPY . .

ENV NODE_ENV=production
ENV PORT=8080

# Shared workspace, accounts and sessions live here — mount a volume!
VOLUME /app/data
EXPOSE 8080

USER node
CMD ["node", "server.js"]
