FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++ git

COPY package*.json ./

RUN npm install --omit=dev

COPY . .

RUN mkdir -p uploads sessions

EXPOSE 3001

CMD ["node", "src/server.js"]
