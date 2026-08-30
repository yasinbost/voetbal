# Liga Zaltbommel

Haftalık halısaha maçlarının **kişi bazlı** puan tablosunu tutan küçük bir PWA.

- **Dashboard** herkese açık, şifresiz.
- **Admin paneli** tek bir şifreyle korunuyor (`ADMIN_PASSWORD`).
- Puanlama: maça **katılan herkese +1**, üstüne sonuç puanı (**galibiyet +1 • beraberlik +0 • mağlubiyet +0**).
  Net karşılık: **galibiyet 2 • beraberlik 1 • mağlubiyet 1**.
- **Maçın adamı** anketini kazanan ayrıca **+1** alır.
- Tüm istatistikler maç kayıtlarından **anlık hesaplanır** — hiçbir yerde ayrıca
  saklanmaz, dolayısıyla bir maçı silmek/düzenlemek tabloyu kendiliğinden düzeltir.

## Maçın adamı anketi

Bir maç kaydedildiği anda ana ekranda o maçın oyuncuları için anket açılır.

- Anket, maç **kaydedildikten 3 saat** sonra kapanır (`POLL_WINDOW_MS`). Maçın tarihi değil,
  kaydın oluşturulma zamanı esastır; anket maçı da her zaman **en son kaydedilen** maçtır.
- **Tarayıcı başına bir oy.** Tarayıcıda `localStorage` içinde bir kimlik üretilir, oy onunla
  atılır; asıl kilit veritabanındaki `votes(match_id, voter_id)` birincil anahtarıdır.
  Tarayıcı verisini temizleyen ya da gizli sekme açan tekrar oy verebilir — arkadaş ligi için
  bilinçli tercih, kimlik doğrulama yok.
- Oy sayıları yalnızca **oyunu kullanmış** tarayıcıya (anket kapandıysa herkese) görünür;
  dağılım sayfa HTML'ine gömülmez.
- Anket kapanınca en çok oyu alan **+1 puan** alır. **Eşitlikte hepsi** kazanır ve her biri +1 alır;
  hiç oy yoksa maçın adamı seçilmez. Puan yalnızca anket kapandıktan sonra işlenir, oylama
  sürerken tablo oynamaz.
- Kapanan anketin sonucu **yeni bir maç kaydedilene kadar** dashboard'da durur.

## Teknoloji

| Katman | Tercih | Neden |
| --- | --- | --- |
| Uygulama | Next.js 15 (App Router, TypeScript) | Tek proje: hem arayüz hem sunucu |
| Veri | Vercel Storage üzerinden Postgres (Neon/Supabase) | Vercel'de kalıcı veri, düşük kurulum yükü |
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
2. Vercel → Storage'tan bir Postgres (Neon ya da Supabase) veritabanı oluştur ve projeye bağla.
3. Entegrasyon `POSTGRES_URL` / `DATABASE_URL` gibi env değişkenlerini otomatik ekler.
   Veritabanını bir **önekle** oluşturduysan (ör. `Voetball_POSTGRES_URL`) sorun değil:
   [src/lib/db.ts](src/lib/db.ts) önekli isimleri de tanır ve `postgres://` ile başlamayan
   boş/yer tutucu değerleri atlar.
4. Vercel Project Settings → Environment Variables altında `ADMIN_PASSWORD` ekle.
5. Deploy et. **Env değişkenlerini sonradan eklediysen yeniden deploy şart** — eski
   deployment yeni env'leri almaz.

Uygulama ilk açıldığında `players` ve `matches` tablolarını otomatik oluşturur; SQL
Editor'da elle tablo açman gerekmez.

Vercel'de geçerli bir bağlantı bulunamazsa uygulama yerel JSON dosyasına düşmez (sunucunun
dosya sistemi salt okunur); bunun yerine hangi env değişkeninin eksik olduğunu söyleyen
açık bir hata gösterir.

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

Geçerli bir bağlantı dizesi varsa localde de Postgres kullanılır; yoksa local JSON fallback devreye girer.

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
    MotmPoll.tsx        Maçın adamı anketi (oy formu + dağılım)
    MatchHistory.tsx    Maç listesi, düzenle/sil
    PlayerManager.tsx   Oyuncu ekle/düzenle/sil
  lib/
    db.ts               Postgres + yerel JSON fallback veri katmanı
    motm.ts             Maçın adamı: anket penceresi ve kazanan hesabı
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
