FROM node:18-alpine

# Install dependencies
COPY package.json .
COPY package-lock.json .
RUN npm ci
COPY . .

# Run
CMD npm start