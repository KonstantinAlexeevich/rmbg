# Лицензии сторонних компонентов

## Модель IS-Net (isnet-general-use)

- Лицензия: Apache-2.0, коммерческое использование разрешено.
- Первоисточник: репозиторий DIS (Dichotomous Image Segmentation),
  Xuebin Qin и др. — https://github.com/xuebinqin/DIS
- ONNX-экспорт: https://huggingface.co/SacredNoir/isnet-general-use-onnx
  (запасное зеркало fp32: https://huggingface.co/x-Liola-x/isnet-general-use-onnx)

Веса модели не входят в пакет расширения: они скачиваются в рантайме с
Hugging Face (пин на коммит) с проверкой SHA-256 и кэшируются локально.

## Рантайм

- onnxruntime-web — MIT, © Microsoft Corporation
- React — MIT, © Meta Platforms
- fflate — MIT
- idb — ISC
- zustand — MIT
- Tailwind CSS — MIT
