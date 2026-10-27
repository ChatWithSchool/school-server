#!/usr/bin/env bash
# One-time setup of the ChatWithSchool (cws) dev and stage environments on the EC2 instance (Ubuntu).
# Run it as root from the deploy/ folder of this repo. It is safe to run again.
#   sudo ./setup-ec2.sh /path/to/cws-deploy.pub
# It creates the "deploy" user, the folders under /srv/cws, and adds the nginx config. It never touches your other sites:
# if the nginx test fails, the new config is removed again and nginx is not reloaded.
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "run this with sudo" >&2
  exit 1
fi
PUBKEY_FILE="${1:?usage: sudo ./setup-ec2.sh <path to the deploy public key (.pub)>}"
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="${CWS_ROOT:-/srv/cws}"

command -v docker > /dev/null || { echo "docker is not installed" >&2; exit 1; }
command -v nginx > /dev/null || { echo "nginx is not installed" >&2; exit 1; }

# 1. the deploy user. Note: a member of the docker group can control the whole machine,
#    so only the GitHub Actions key may log in as this user.
if ! id deploy > /dev/null 2>&1; then adduser --disabled-password --gecos "" deploy; fi
usermod -aG docker deploy
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
KEY="$(cat "$PUBKEY_FILE")"
AUTH=/home/deploy/.ssh/authorized_keys
touch "$AUTH"
if ! grep -qF "$KEY" "$AUTH"; then
  echo "no-agent-forwarding,no-port-forwarding,no-X11-forwarding,no-pty $KEY" >> "$AUTH"
fi
chown deploy:deploy "$AUTH"
chmod 600 "$AUTH"

# 2. folders for each environment (server.env is written by the deploy workflow from GitHub secrets)
for ENV_NAME in dev stage; do
  install -d -m 755 -o deploy -g deploy "$ROOT/$ENV_NAME" "$ROOT/$ENV_NAME/client/releases/initial"
  if [ ! -f "$ROOT/$ENV_NAME/client/releases/initial/index.html" ]; then
    echo "<!doctype html><meta charset=utf-8><title>cws-$ENV_NAME</title><p>cws-$ENV_NAME: no version has been deployed yet.</p>" \
      > "$ROOT/$ENV_NAME/client/releases/initial/index.html"
  fi
  if [ ! -e "$ROOT/$ENV_NAME/client/current" ]; then
    ln -sfn releases/initial "$ROOT/$ENV_NAME/client/current"
  fi
  chown -R deploy:deploy "$ROOT/$ENV_NAME"
done

# 3. make sure the two local ports are free (the containers listen on 127.0.0.1:4101 and :4102)
for PORT in 4101 4102; do
  if ss -ltn "sport = :$PORT" | grep -q LISTEN && ! docker ps --format '{{.Ports}}' | grep -q "127.0.0.1:$PORT->"; then
    echo "port $PORT is used by something else: change HOST_PORT in deploy-server.sh and the port in nginx/cws.conf" >&2
    exit 1
  fi
done

# 4. nginx: add the config, test it, and only then reload
install -m 644 "$HERE/nginx/cws.conf" /etc/nginx/sites-available/cws.conf
ln -sfn /etc/nginx/sites-available/cws.conf /etc/nginx/sites-enabled/cws.conf
if nginx -t; then
  systemctl reload nginx
  echo "nginx reloaded"
else
  rm -f /etc/nginx/sites-enabled/cws.conf
  echo "the nginx test failed, so the new config was removed and nginx was not reloaded" >&2
  exit 1
fi

echo
echo "Done. Next: create the DNS records and run certbot, then add the GitHub secrets (see docs/deploy-aws.md)."
