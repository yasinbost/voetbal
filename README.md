# Liga Zaltbommel

Haftalık halısaha maçlarının **kişi bazlı** puan tablosunu tutan küçük bir PWA.

- **Dashboard** herkese açık, şifresiz.
- **Admin paneli** tek bir şifreyle korunuyor (`ADMIN_PASSWORD`).
- Puanlama: **Galibiyet 2 • Beraberlik 1 • Mağlubiyet 0**.
- Tüm istatistikler maç kayıtlarından **anlık hesaplanır** — hiçbir yerde ayrıca
  saklanmaz, dolayısıyla bir maçı silmek/düzenlemek tabloyu kendiliğinden düzeltir.

## Teknoloji

| Katman | Tercih | Neden |
| --- | --- | --- |
| Uygulama | Next.js 15 (App Router, TypeScript) | Tek proje: hem arayüz hem sunucu |
| Veri | Supabase Postgres (`POSTGRES_URL`) | Vercel'de kalıcı veri, düşük kurulum yükü |
| Yazma işlemleri | Server Actions | Şifre ve veri yazma işlemleri tarayıcıya inmez |
| Barındırma | Vercel | GitHub bağlantısıyla otomatik deploy |
| Stil | Elle yazılmış CSS | Ekstra bağımlılık yok |

Toplam üretim bağımlılığı: `next`, `react`, `react-dom`, `pg`, `server-only`.

## Hızlı başlangıç (yerel)

```bash
npm install
cp .env.example .env.local   # ADMIN_PASSWORD'u değiştir
npm run dev                  # http://localhost:3000
```

Localde `POSTGRES_URL` boşsa uygulama `data/local-db.json` kullanır. Dosya yoksa ilk
yazma işleminde otomatik oluşturulur.

## Vercel + Supabase deploy

```bash
git init && git add -A && git commit -m "İlk sürüm"
# GitHub'da boş bir repo aç ve:
git remote add origin git@github.com:<kullanici>/<repo>.git
git push -u origin main
```

1. Vercel'de projeyi GitHub reposundan import et.
2. Vercel Marketplace'ten **Supabase** entegrasyonunu ekle ve projeye bağla.
3. Supabase entegrasyonu `POSTGRES_URL` dahil gerekli env değişkenlerini Vercel'e otomatik
   ekler.
4. Vercel Project Settings → Environment Variables altında `ADMIN_PASSWORD` ekle.
5. Deploy et.

Uygulama ilk açıldığında Supabase içinde `players` ve `matches` tablolarını otomatik
oluşturur. Supabase SQL Editor'da elle tablo oluşturman gerekmez.

Şifreyi değiştirmek için Vercel'de `ADMIN_PASSWORD` değerini güncelleyip yeniden deploy
etmen yeterli. Env tanımlı değilse kod içindeki `FALLBACK_PASSWORD` sabiti kullanılır;
bkz. [src/lib/auth.ts](src/lib/auth.ts).

## Localde Supabase kullanmak

Vercel CLI ile projeyi linkleyip env değişkenlerini çekebilirsin:

```bash
npx vercel link
npx vercel env pull .env.local
npm run dev
```

`POSTGRES_URL` varsa localde de Supabase kullanılır; yoksa local JSON fallback devreye girer.

## Telefona ekleme (PWA)

- **iPhone / Safari:** Paylaş → *Ana Ekrana Ekle*
- **Android / Chrome:** ⋮ → *Uygulamayı yükle*

Manifest ve service worker `public/` altında. Service worker yalnızca üretim derlemesinde
kaydolur; dashboard çevrimdışıyken son görülen haliyle açılır, admin sayfası hiç
önbelleğe alınmaz.

## Proje yapısı

```
src/
  app/
    page.tsx            Dashboard (puan tablosu + ortalama sekmesi)
    admin/page.tsx      Admin: giriş yoksa şifre formu, varsa panel
    actions.ts          Tüm yazma işlemleri (Server Actions)
    globals.css
  components/
    Leaderboard.tsx     İki sekmeli tablo, ilk 3 madalyalı
    AdminPanel.tsx      Maç Ekle / Oyuncular / Geçmiş sekmeleri
    MatchForm.tsx       Maç ekleme + düzenleme
    MatchHistory.tsx    Maç listesi, düzenle/sil
    PlayerManager.tsx   Oyuncu ekle/düzenle/sil
  lib/
    db.ts               Supabase Postgres + yerel JSON fallback veri katmanı
    stats.ts            İstatistik hesabı ve sıralama
    auth.ts             Tek şifreli oturum (httpOnly cookie)
    types.ts            Veri modeli
scripts/
  generate-icons.mjs    PWA ikonlarını üretir (npm run icons)
public/
  manifest.webmanifest, sw.js, icons/
```

## Veri modeli

```ts
players:  { id, name, createdAt }
matches:  { id, date: "2026-08-23", entries: [{ playerId, result: 'win'|'lose'|'draw' }], createdAt }
```

## Sıralama kuralları

- **Toplam Puan:** puan ↓, eşitse galibiyet ↓, sonra oynanan maç ↓, sonra isim.
- **Maç Başına Ortalama:** toplam puan ÷ oynadığı maç. Henüz maçı olmayan oyuncular
  listenin sonunda ayrı gösterilir.
- **Katılım oranı** (`oynadığı maç / toplam maç`) her satırda bilgi amaçlı görünür,
  sıralamayı etkilemez.
