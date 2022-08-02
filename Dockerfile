FROM node:14.15.5

WORKDIR /usr/app

COPY ./rpc-dev/node_modules /usr/app/node_modules/
COPY ./rpc-dev/package.json /usr/app/package.json
COPY ./rpc-dev/hardhat.config.js /usr/app/hardhat.config.js

EXPOSE 8080

CMD [ "npm", "start" ]
