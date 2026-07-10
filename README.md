# Article Attention Demo

Демо «экономика внимания» для iframe (Premium Ads).

## Ссылки

| | URL |
|---|-----|
| **Live (orange)** | https://measure.geniusgroup.cc/embed/article-attention-demo-orange/ |
| **Панель загрузки** | https://measure.geniusgroup.cc/embed-admin/ |
| **Violet** | https://measure.geniusgroup.cc/embed/article-attention-demo/ |

## Для коллег

Полная инструкция: **[docs/COLLABORATOR_GUIDE.md](docs/COLLABORATOR_GUIDE.md)**

Кратко:
- **Git:** правки в `orange/index.html` → `git push` в `main` → автодеплой
- **Без Git:** загрузка `.html` в https://measure.geniusgroup.cc/embed-admin/

## Структура

```text
orange/index.html              — рабочая страница (деплоится на сервер)
orange/versions/               — локальные снимки
violet/index.html              — фиолетовая тема
deploy/embed-admin/            — панель загрузки для админов
deploy/install-embed-admin.sh  — установка панели на сервер
.github/workflows/deploy-orange.yml — CI/CD
docs/COLLABORATOR_GUIDE.md     — инструкция для команды
```

## Первичная настройка (владелец)

### 1. GitHub Secrets для автодеплоя

`Settings → Secrets → Actions`:

- `DEPLOY_HOST` = `95.213.154.171`
- `DEPLOY_USER` = `root`
- `DEPLOY_SSH_KEY` = приватный ключ SSH

### 2. Панель загрузки на сервере

```bash
chmod +x deploy/install-embed-admin.sh
./deploy/install-embed-admin.sh
```

Откройте https://measure.geniusgroup.cc/embed-admin/ и задайте пароль при первом входе.

### 3. Добавить коллег в репозиторий

GitHub → **Settings → Collaborators** → пригласить по email/username.

## Ручной деплой

```bash
./deploy/remote-deploy-orange.sh orange/index.html
# или
rsync -avz -e "ssh -i ~/kk1" orange/index.html \
  root@95.213.154.171:/opt/premium-measure/public/embed/article-attention-demo-orange/
```

## iframe

```html
<iframe
  src="https://measure.geniusgroup.cc/embed/article-attention-demo-orange/"
  title="Premium Ads — демо внимания"
  style="width:100%;border:0;min-height:800px"
  loading="lazy"
></iframe>
```
