# Article Attention Demo

Демо-страница «экономика внимания» для встраивания через iframe (Premium Ads).

## Версии

| Путь | Описание |
|------|----------|
| `orange/index.html` | Оранжевая тема (основная рабочая) |
| `orange/versions/index-stable-2026-07-03.html` | Стабильный снимок до адаптивных правок |
| `violet/index.html` | Фиолетовая тема |

## Продакшен

- Orange: https://measure.geniusgroup.cc/embed/article-attention-demo-orange/
- Orange stable: https://measure.geniusgroup.cc/embed/article-attention-demo-orange/versions/index-stable-2026-07-03.html
- Violet: https://measure.geniusgroup.cc/embed/article-attention-demo/

## Деплой на sv01

```bash
rsync -avz -e "ssh -i ~/kk1" orange/ root@95.213.154.171:/opt/premium-measure/public/embed/article-attention-demo-orange/
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
