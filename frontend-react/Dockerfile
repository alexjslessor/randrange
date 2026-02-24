# Stage 1: Build the application
FROM node:20.18 AS build

ARG VITE_API_OPENAI_URL
ENV VITE_API_OPENAI_URL=${VITE_API_OPENAI_URL}

# Set working directory
WORKDIR /app
# Copy package.json and package-lock.json if available
COPY package.json \
    package-lock.json \
    ./
# Install dependencies
RUN npm ci --legacy-peer-deps
# Copy the rest of the application files
COPY . .
# Build the application
RUN npm run build

# Stage 2: Serve the application
FROM node:20.18-slim AS production
# Set working directory
WORKDIR /app
# Install a lightweight web server for serving static files
RUN npm install -g serve
# Copy build files from the build stage
COPY --from=build /app/dist /app/dist

EXPOSE ${PORT}
# Serve the application
CMD serve -s dist -l ${PORT}