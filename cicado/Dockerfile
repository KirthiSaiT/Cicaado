FROM node:20-slim

# Define build arguments
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_PROCESSOR_URL=http://processor:5000

# Bake public env vars at build time (required for Next.js NEXT_PUBLIC_* vars)
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
ENV NEXT_PUBLIC_PROCESSOR_URL=${NEXT_PUBLIC_PROCESSOR_URL}

# Remove global NODE_OPTIONS to let runtime manage memory naturally
# ENV NODE_OPTIONS="--max-old-space-size=4096"

WORKDIR /app

# Copy package files
COPY package*.json ./

# Delete Windows-generated lockfile so npm resolves Linux-native bindings fresh
RUN rm -f package-lock.json && npm install

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