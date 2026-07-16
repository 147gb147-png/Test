FROM node:20-alpine

WORKDIR /app
COPY . .

ENV NODE_ENV=production
ENV PORT=8080

# Persistent data (workspace, accounts, sessions) — attach a volume at /app/data.
# The container deliberately runs as root: platform volumes (Railway, Fly) are
# mounted owned by root, and a non-root user cannot write them, which
# crash-loops the server on boot with "EACCES: permission denied, mkdir '/app/data'".
RUN mkdir -p /app/data
EXPOSE 8080

CMD ["node", "server.js"]
