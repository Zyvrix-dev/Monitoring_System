FROM node:20

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY public ./public
COPY src ./src

RUN test -f public/index.html

ENV HOST=0.0.0.0

EXPOSE 3000

CMD ["npm", "start"]
