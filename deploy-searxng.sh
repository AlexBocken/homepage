#!/bin/sh
# Deploy SearXNG custom theme to searx.bocken.org
# CSS is hosted on bocken.org, template override on the SearXNG server
#
# Usage:
#   ./deploy-searxng.sh          Deploy custom theme
#   ./deploy-searxng.sh reset    Restore original SearXNG base.html and remove custom CSS

CSS_SRC=static/other/searxng.css
CSS_DEST=/var/www/static/css/searxng.css

TMPL_SRC=static/other/searxng_base.html
TMPL_DEST=/var/lib/searxng/venv/lib/python3.14/site-packages/searx/templates/simple/base.html
TMPL_BACKUP="${TMPL_DEST}.orig"

if [ "$1" = "reset" ]; then
  echo "Resetting SearXNG to original theme..."
  ssh root@bocken.org "
    if [ -f '$TMPL_BACKUP' ]; then
      mv '$TMPL_BACKUP' '$TMPL_DEST'
      chown searxng:searxng '$TMPL_DEST'
    else
      echo 'No backup found at $TMPL_BACKUP — nothing to restore'
      exit 1
    fi
    rm -f '$CSS_DEST'
    systemctl restart uwsgi@emperor
  "
  echo "Done. Original theme restored."
  exit 0
fi

# Back up original base.html if no backup exists yet
ssh root@bocken.org "
  if [ ! -f '$TMPL_BACKUP' ]; then
    cp '$TMPL_DEST' '$TMPL_BACKUP'
    echo 'Backed up original base.html'
  fi
"

# Deploy CSS to bocken.org static hosting
ssh root@bocken.org "mkdir -p /var/www/static/css"
rsync -av "$CSS_SRC" "root@bocken.org:$CSS_DEST"

# Deploy custom base.html template to SearXNG server
rsync -av "$TMPL_SRC" "root@bocken.org:$TMPL_DEST"
ssh root@bocken.org "chown searxng:searxng '$TMPL_DEST'"

# Restart SearXNG to pick up template changes
ssh root@bocken.org "systemctl restart uwsgi@emperor"

echo "Done. Check https://searx.bocken.org"
echo "To restore original: ./deploy-searxng.sh reset"
