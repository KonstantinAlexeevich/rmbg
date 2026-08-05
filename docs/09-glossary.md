# 09. Глоссарий терминов интерфейса

Английский — первоисточник. Русский — перевод. Поле в коде указано, когда UI-термин
расходится с именем в типах (типы не переименовываем в этой ревизии).

## Базовые понятия

| EN | RU | Код / примечание |
| --- | --- | --- |
| subject | объект | субъект сегментации (товар, человек и т.п.) |
| canvas | холст | `Preset.canvas` |
| mask / edge | маска / край | `EdgeSettings` |
| edge refinement | уточнение края | секция панели |
| session | сессия | `SessionRecord` |
| image | изображение | единый термин вместо «картинка» / «файл» |
| export (noun) | экспорт | тип в коде — `Preset` (см. ниже) |
| custom settings | свои настройки | `ItemOverride` («слепок» — только в коде и доках) |

## Export ↔ Preset

В интерфейсе объект называется **export** / «экспорт». В коде остаётся `Preset`,
`presetId`, `exportPresetIds`, `activePresetId`. Причина: объект ведёт себя не как
классический пресет (разовое применение одного из многих), а как строка в списке того,
что уедет в архив — несколько штук работают одновременно, каждая даёт папку в ZIP.

«Вариант вывода» отвергнут как калька: в русском звучит неестественно. «Формат» не
берём — коллизия с полем Format (PNG/JPEG/WebP).

## Padding ↔ fit.margin

| EN | RU | Код |
| --- | --- | --- |
| Padding, % | Отступ, % | `Preset.fit.margin` |

Пространство **внутри** холста вокруг объекта — padding, не margin. Поле в коде
остаётся `margin` до отдельного рефакторинга.

UX: по умолчанию одно поле на все стороны; кнопка-иконка `Link2` / `Link2Off`
переключает «одинаковый со всех сторон» ↔ «каждая сторона отдельно» (как в Figma).
Галку-чекбокс не используем — она не читалась как связь четырёх полей.

## Уточнение края

| EN | RU | Код |
| --- | --- | --- |
| Threshold | Порог | `edge.threshold` |
| Contract, px | Сжатие, px | `edge.erode` (Photoshop Select → Contract) |
| Feather, px | Растушёвка, px | `edge.feather` |
| Reset | Сбросить | — |

Тултипы расшифровывают действие; подпись — профессиональный термин.

## Экспорт (поля)

| EN | RU | Код |
| --- | --- | --- |
| Exports | Экспорты | `presets[]` |
| Name | Название | `Preset.name` |
| Add export | Добавить экспорт | `addPreset` / `duplicatePreset` |
| Export settings | Настройки экспорта | — |
| Delete export | Удалить экспорт | `removePreset` |
| Canvas → Original / Custom | Холст → Как в оригинале / Свой размер | `sizeMode` |
| Width, px / Height, px | Ширина, px / Высота, px | `canvas.*` |
| Vertical alignment | Выравнивание по вертикали | `anchor` |
| Top / Middle / Bottom | По верху / По центру / По низу | `anchor` |
| Zoom to fit | Масштабировать по размеру | `fit.allowZoom` |
| Background | Фон | `background` |
| Transparent / Solid color | Прозрачный / Сплошной цвет | `background.kind` |
| Format / Quality | Формат / Качество | `output.format` / `output.quality` |

## Статусы и действия

| EN | RU |
| --- | --- |
| Queued | В очереди |
| Detecting subject… | Поиск объекта… |
| Rendering… | Отрисовка… |
| Ready | Готово |
| Failed | Ошибка |
| No subject detected | Объект не найден |
| Export ZIP | Экспорт ZIP |
| Clear | Очистить |
| Add images | Добавить изображения |
| Customize this image | Только для этого изображения |
| Reset to export | Вернуть к экспорту |
| Before / After | До / После |
| Back to grid | К сетке |

## Иконки (lucide)

| Значение | Иконка |
| --- | --- |
| переименование текста | `pencil` |
| настройки | `sliders-horizontal` |
| открыть просмотр | `maximize-2` |
| скачать / экспорт ZIP | `download` / `file-archive` |
| удалить | `trash-2` |
| повторить | `rotate-ccw` |
| связать / разъединить отступы | `link-2` / `link-2-off` |
| навигация | `chevron-*`, `arrow-left` |
| закрыть | `x` |
| добавить изображения | `image-plus` / `image-up` |
| предупреждение / ошибка / инфо | `triangle-alert` / `circle-alert` / `info` |
