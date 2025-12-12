FROM nginx:alpine

# Copy everything into the default nginx web root.
# This is a tiny static site, so no build step is required.
COPY . /usr/share/nginx/html