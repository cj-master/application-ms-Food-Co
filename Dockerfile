# Stage 1: Development dependencies
FROM node:20.16.0-alpine3.19 as dev-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --frozen-lockfile

# Stage 2: Development environment
FROM node:20.16.0-alpine3.19 as dev
WORKDIR /app
COPY package.json package-lock.json ./
COPY . .
RUN npm install
CMD [ "npm", "run", "start" ]

# Stage 3: Build
# FROM node:20.16.0-alpine3.19 as builder
# WORKDIR /app
# COPY --from=dev-deps /app/node_modules ./node_modules
# COPY . .
# RUN npm run build

# Stage 4: Production dependencies
# FROM node:20.16.0-alpine3.19 as prod-deps
# WORKDIR /app
# COPY package.json package-lock.json ./
# RUN npm install --prod --frozen-lockfile

# Stage 5: Production environment
# FROM node:20.16.0-alpine3.19 as prod
# WORKDIR /app
# COPY --from=prod-deps /app/node_modules ./node_modules
# COPY --from=builder /app/dist ./dist
# CMD [ "node", "dist/main.js" ]