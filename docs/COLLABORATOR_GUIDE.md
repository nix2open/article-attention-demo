# Инструкция для коллег: обновление orange-демо

Демо-страница: **https://measure.geniusgroup.cc/embed/article-attention-demo-orange/**

Есть **два способа** обновить страницу. Выберите любой.

---

## Способ 1 — через GitHub (рекомендуется для правок в коде)

### Что нужно один раз

1. Доступ к репозиторию: https://github.com/nix2open/article-attention-demo  
   (владелец репозитория добавляет вас в **Collaborators**)
2. Git на компьютере

### Как обновить страницу

1. Клонируйте репозиторий (если ещё не клонировали):

```bash
git clone https://github.com/nix2open/article-attention-demo.git
cd article-attention-demo
```

2. Отредактируйте файл:

```text
orange/index.html
```

3. Закоммитьте и отправьте в `main`:

```bash
git add orange/index.html
git commit -m "Обновление демо-страницы"
git push origin main
```

4. GitHub Actions автоматически:
   - сохранит текущую версию в `archived/index-archived-<UTC>.html` на сервере;
   - зальёт новый `index.html` на сервер.

5. Проверьте деплой:
   - вкладка **Actions** в репозитории — workflow **Deploy orange demo**;
   - откройте live-страницу (обновите с Ctrl+F5 / Cmd+Shift+R).

### Важно

- Деплой срабатывает только при изменениях в папке `orange/`.
- Старая версия **не удаляется** — она попадает в `archived/` на сервере.

---

## Способ 2 — через веб-панель (загрузка готового HTML-файла)

Подходит, если у вас уже есть готовый `index.html` и не нужен Git.

### Адрес панели

**https://measure.geniusgroup.cc/embed-admin/**

### Первый вход (только владелец)

1. Откройте панель.
2. Задайте пароль администратора (минимум 8 символов).
3. Передайте пароль коллегам по защищённому каналу.

### Как загрузить новую версию

1. Войдите по паролю.
2. Выберите файл `.html` на компьютере.
3. Нажмите **«Загрузить и опубликовать»**.
4. Текущая страница автоматически переименуется, например:

```text
archived/index-archived-2026-07-10T08-15-30-123Z.html
```

5. По адресу https://measure.geniusgroup.cc/embed/article-attention-demo-orange/ сразу доступна новая версия.

---

## Настройка автодеплоя (только для владельца, один раз)

В репозитории GitHub → **Settings → Secrets and variables → Actions** добавьте:

| Secret | Значение |
|--------|----------|
| `DEPLOY_HOST` | `95.213.154.171` |
| `DEPLOY_USER` | `root` |
| `DEPLOY_SSH_KEY` | приватный SSH-ключ для доступа к серверу |

После этого push в `main` будет автоматически раскатывать страницу.

---

## Установка веб-панели на сервере (один раз, владелец)

С Mac, где есть SSH-ключ к серверу:

```bash
cd article-attention-demo
chmod +x deploy/install-embed-admin.sh
./deploy/install-embed-admin.sh
```

Затем откройте https://measure.geniusgroup.cc/embed-admin/ и задайте пароль.

---

## Откат на предыдущую версию

1. На сервере в папке `archived/` лежат старые файлы.
2. Скопируйте нужный архив обратно в `index.html`  
   **или** загрузите архивный файл через панель `/embed-admin/`.

При необходимости попросите владельца сервера выполнить откат.

---

## Контакты и ссылки

| Ресурс | URL |
|--------|-----|
| Live-демо | https://measure.geniusgroup.cc/embed/article-attention-demo-orange/ |
| Панель загрузки | https://measure.geniusgroup.cc/embed-admin/ |
| Репозиторий | https://github.com/nix2open/article-attention-demo |

Логику метрик (JavaScript) меняйте только если это осознанная задача — иначе достаточно правок в CSS/HTML.
