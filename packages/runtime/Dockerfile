FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY dist/ ./dist/
COPY src/store/schema.sql ./dist/store/schema.sql

EXPOSE 3001

CMD ["node", "dist/index.js"]
