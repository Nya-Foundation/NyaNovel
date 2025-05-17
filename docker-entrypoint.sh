#!/bin/sh
set -e

echo "
╔═══════════════════════════════════════════════════════════════╗
║                     NyaNovel Web Server                       ║
║                                                               ║
║  Static content server powered by Nginx                       ║
║  Version: $(nginx -v 2>&1 | cut -d '/' -f 2)                                     ║
║                                                               ║
║  Server started successfully!                                 ║
║  $(date)                                      ║
╚═══════════════════════════════════════════════════════════════╝
"

# Execute original entrypoint with all arguments
exec /docker-entrypoint.sh "$@"