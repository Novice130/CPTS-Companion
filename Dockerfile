FROM node:23-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (no native build tools needed — no more sqlite3)
RUN npm install

# Copy app source
COPY . .

# Expose port
EXPOSE 3000

# Run with experimental-strip-types (no build step)
CMD ["node", "--experimental-strip-types", "server.ts"]
