# Use Node.js LTS version
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application source
COPY . .

# Expose the port
EXPOSE 5000

# Set environment variable
ENV NODE_ENV=production

# Start the server
CMD ["node", "server.js"]