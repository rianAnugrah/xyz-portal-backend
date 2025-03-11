FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application files
COPY . .

# Compile TypeScript (if needed)
RUN npm run build || echo "No build script found, skipping."

# Expose port (sesuaikan dengan konfigurasi Fastify jika perlu)
EXPOSE 3000

# Command to run the application with ts-node
CMD ["npx", "ts-node", "src/server.ts"]
