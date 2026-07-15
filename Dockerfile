FROM node:20-alpine

WORKDIR /app
COPY . .

ENV NODE_ENV=production
ENV PORT=8080

# Persistent data (accounts, sessions) — attach a Railway Volume mounted at /app/data
EXPOSE 8080

USER node
CMD ["node", "server.js"]
