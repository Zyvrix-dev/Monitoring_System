FROM node:20

WORKDIR /frontend


COPY . .
RUN npm install

RUN test -f public/index.html

ENV HOST=0.0.0.0

EXPOSE 3000

CMD ["npm", "start"]
