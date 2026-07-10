#!/usr/bin/env bash
set -euo pipefail

SSH_KEY="${SSH_KEY:-$HOME/kk1}"
SSH_HOST="${SSH_HOST:-root@95.213.154.171}"
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> Sync embed-admin to /opt/embed-orange-admin"
rsync -avz -e "ssh -i $SSH_KEY" \
  "$REPO_DIR/deploy/embed-admin/" \
  "$SSH_HOST:/opt/embed-orange-admin/"

rsync -avz -e "ssh -i $SSH_KEY" \
  "$REPO_DIR/deploy/embed-orange-admin.service" \
  "$REPO_DIR/deploy/nginx-embed-admin-locations.conf" \
  "$SSH_HOST:/opt/embed-orange-admin/deploy/"

echo "==> Install dependencies, systemd, nginx"
ssh -i "$SSH_KEY" "$SSH_HOST" bash -s <<'REMOTE'
set -euo pipefail

install_node() {
  if command -v node >/dev/null 2>&1; then
    return
  fi
  NODE_VER=v20.19.0
  ARCH=linux-x64
  TMP="/tmp/node-${NODE_VER}-${ARCH}.tar.xz"
  curl -fsSL "https://nodejs.org/dist/${NODE_VER}/node-${NODE_VER}-${ARCH}.tar.xz" -o "$TMP"
  tar -xJf "$TMP" -C /usr/local --strip-components=1
  rm -f "$TMP"
}

install_node
cd /opt/embed-orange-admin

npm install --omit=dev

cp -f /opt/embed-orange-admin/deploy/embed-orange-admin.service /etc/systemd/system/embed-orange-admin.service
cp -f /opt/embed-orange-admin/deploy/nginx-embed-admin-locations.conf /etc/nginx/snippets/embed-admin-locations.conf

CONF=/etc/nginx/sites-available/measure.geniusgroup.cc.conf
if [ -f "$CONF" ] && ! grep -q 'embed-admin-locations.conf' "$CONF"; then
  sed -i '/location \/ {/i\    include /etc/nginx/snippets/embed-admin-locations.conf;' "$CONF"
fi

mkdir -p /opt/premium-measure/public/embed/article-attention-demo-orange/archived
mkdir -p /opt/embed-orange-admin/data
chmod 700 /opt/embed-orange-admin/data

systemctl daemon-reload
systemctl enable embed-orange-admin
systemctl restart embed-orange-admin
nginx -t
systemctl reload nginx
systemctl --no-pager status embed-orange-admin | head -5
REMOTE

echo ""
echo "Панель: https://measure.geniusgroup.cc/embed-admin/"
echo "При первом входе задайте пароль администратора."
