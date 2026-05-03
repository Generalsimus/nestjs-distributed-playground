FROM node:20-alpine
WORKDIR /app


COPY ./gateway/ ./

EXPOSE 3000

RUN npm ci 
RUN npm run build
# CMD ["tail", "-f", "/dev/null"]

CMD ["sh", "-c", " npx tsc --watch & node --watch --watch-preserve-output ./dist/src/main.js"]
