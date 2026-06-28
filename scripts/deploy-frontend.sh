#!/bin/sh
# Deploy the frontend build to the nginx server and restore the runtime env-config.js.
# The build bakes a placeholder URL into env-config.js; the server-side startup script
# at /docker-entrypoint.d/40-env-config.sh overwrites it with the real URL.
# Never put the real backend URL in .env.production — it is a public repo.

set -e

cd "$(dirname "$0")/.."

echo "Building..."
npm run build

echo "Packaging..."
tar -czf /tmp/frontend-build.tar.gz -C build .

echo "Deploying..."
cat /tmp/frontend-build.tar.gz | ssh -p 22222 service_h1l9issn2isa@germany-fz5xja.sliplane.app \
  'cat > /tmp/fb.tar.gz &&
   cd /usr/share/nginx/html &&
   tar -xzf /tmp/fb.tar.gz &&
   sh /docker-entrypoint.d/40-env-config.sh &&
   nginx -s reload &&
   echo "deployed"'

echo "Done."
