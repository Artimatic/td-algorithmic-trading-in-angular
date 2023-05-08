# syntax=docker/dockerfile:1
   
FROM node:18-alpine
WORKDIR /dist/app
COPY . .
RUN npm install && npm run build
CMD ["node", "dist/app.js"]
EXPOSE 9000