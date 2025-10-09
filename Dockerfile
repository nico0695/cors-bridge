# Use official Node.js image
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy files
COPY package.json ./
COPY server.js ./

# Install dependencies
RUN npm install --production

# Expose port
EXPOSE 8080

# Start app
CMD ["npm", "start"]
