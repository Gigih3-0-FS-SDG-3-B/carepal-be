FROM node:20.8.0-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

COPY .env ./

# Install app dependencies
RUN npm install

# Copy Prisma schema
COPY prisma ./prisma/

# Install Prisma CLI and Generate Prisma client
RUN npx prisma db pull && npx prisma generate

# Bundle the rest of the app's source code inside the Docker image
COPY . .

# Your app binds to a port, so use the EXPOSE instruction to have it mapped by the docker daemon
EXPOSE 5000

# Define the command to run your app using CMD
CMD [ "node", "index.js" ]
