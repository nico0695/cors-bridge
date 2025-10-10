# build stage
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# production stage
FROM node:22-alpine
WORKDIR /app
COPY --from=build /app/package*.json ./
RUN npm install --production
COPY --from=build /app/dist ./dist
# Copy static assets (public) from build stage so the runtime image
# contains /app/public and express can serve index.html
COPY --from=build /app/public ./public
EXPOSE 8080
CMD [ "npm", "start" ]