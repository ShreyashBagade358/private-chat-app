FROM node:18-alpine

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm ci --only=production

# Bundle app source
COPY . .

ENV PORT=5000
EXPOSE 5000

CMD ["node", "server.js"]
