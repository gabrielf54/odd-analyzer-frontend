# Front Next (UI só-leitura sobre a API REST do backend). Sem segredo — só fala REST.
FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# NEXT_PUBLIC_* é inlined no BUILD. Vem como build-arg do docker-compose; o navegador roda na
# máquina do dono, então localhost:5926 resolve no container do backend (porta mapeada).
ARG NEXT_PUBLIC_API_URL=http://localhost:5926
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

EXPOSE 5927

CMD ["npm", "start"]
