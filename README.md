# BystroBarista / БыстроБариста

A coffee-industry job marketplace for Russia. Baristas find shifts near
metro stations; coffee shops post openings and hire on the spot.

Маркетплейс работы в кофейной индустрии в России. Бариста ищут смены
рядом со станциями метро, кофейни публикуют вакансии и нанимают.

---

## Stack / Стек

| Layer | Technology |
|---|---|
| Mobile app | React Native 0.73 · TypeScript · React Navigation · Zustand · i18next · React Native Reanimated |
| Backend | Supabase (PostgreSQL + PostGIS + Row-Level Security · GoTrue Auth · Realtime · Storage · Edge Functions) |
| Admin / marketing | Next.js 14 (App Router) · Tailwind CSS · Server Actions |
| Auth | Email + password · Apple Sign In · Google Sign In · Yandex OAuth |
| Maps | Yandex Maps SDK · Yandex Geocoder |
| Notifications | APNs · @react-native-community/push-notification-ios |
| Testing | Jest |

---

## Repository layout / Структура

```
coffeeproj/    React Native iOS app (main product surface)
admin/         Next.js admin panel + public marketing site
supabase/      SQL migrations and Edge Functions
infra/         Operational configs for non-Supabase infra (gitignored)
```

---

## Running the mobile app locally

```bash
cd coffeeproj
cp .env.example .env          # fill in SUPABASE_URL / ANON_KEY / OAuth IDs
npm install
npx pod-install ios
npx react-native run-ios
```

Requires Xcode ≥ 15, CocoaPods, Node ≥ 18. iOS-only; Android target is
not currently maintained.

## Running the admin / landing site locally

```bash
cd admin
cp .env.local.example .env.local   # fill in Supabase keys + Yandex Maps key
npm install
npm run dev
```

---

## Tests

```bash
cd coffeeproj && npm test          # unit + integration (Jest, ~290 specs)
cd coffeeproj && npx tsc --noEmit  # type-check
```

---

## License

Source-available, all rights reserved. Not licensed for redistribution
or commercial reuse without prior written agreement.
