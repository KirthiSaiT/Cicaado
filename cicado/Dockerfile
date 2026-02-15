FROM node:18-slim

# Define build arguments
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_PROCESSOR_URL

# Set environment variables
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
ENV NEXT_PUBLIC_PROCESSOR_URL=${NEXT_PUBLIC_PROCESSOR_URL}

# Remove global NODE_OPTIONS to let runtime manage memory naturally
# ENV NODE_OPTIONS="--max-old-space-size=4096"

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including devDependencies like TypeScript for the build)
# Install dependencies (using npm install because package-lock.json might be missing/outdated)
RUN npm install

# (Sharp installs correctly automatically on Debian-based images)

# Copy application files
COPY . .

# Build the Next.js application (with increased memory)
RUN NODE_OPTIONS="--max-old-space-size=4096" npm run build

# Clean up development dependencies
# Clean up development dependencies
# RUN npm prune --production

EXPOSE 3000

# Start the application
CMD ["npm", "start"]