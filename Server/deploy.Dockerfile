FROM --platform=linux/amd64 node:18 as build

WORKDIR /usr/local/apps

# COPY
COPY . .

# INSTALL
RUN npm run install-all

# BUILD
RUN npm run build

# FIX bcrypt and deasync
RUN npm rebuild bcrypt --build-from-source && npm rebuild deasync --build-from-source

# The final stage, which copies built files and prepares the run environment
# Using a slim image to reduce the final image size
FROM --platform=linux/amd64 node:18-slim
COPY --from=build /usr/local/apps /usr/local/apps

WORKDIR /usr/local/apps

EXPOSE ${PORT}

CMD ["npm", "run", "start-docker-cloud"]
