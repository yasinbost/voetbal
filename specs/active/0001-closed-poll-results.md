# Spec 0001 — Kapanan anketin oy dağılımı

- Status: In progress
- Mode: lite
- Plan: `specs/plans/0001-plan.md`

## Intent
Maçın Adamı anketi açıkken oy veren herkes oy dağılımını görüyor; anket kapanınca ana sayfada
yalnızca kazananın adı kalıyor ve dağılım kayboluyor. Oyuncular kapanıştan sonra da kimin kaç oy
aldığını görmek istiyor. Kapanmış anket kartında dağılım, varsayılan olarak kapalı duran
açılır-kapanır bir listede gösterilmeye devam edecek. Eski maçların anketlerini listelemek bu işin
kapsamında değil — yalnızca ana sayfada gösterilen (en son kaydedilen) maçın anketi.

## Requirements
- Anket kapandıktan sonra Maçın Adamı kartında kazanan bilgisi eskisi gibi görünür.
- Kartın altında "Oy dağılımı" başlıklı, varsayılan olarak kapalı, tıklanınca açılan bir bölüm bulunur.
- Açılınca maçta oynayan her oyuncu aldığı oy sayısı ve oran çubuğuyla, en çok oy alandan en aza
  sıralı listelenir; en çok oyu alan(lar) vurgulanır; toplam oy sayısı yazar.
- Oy dağılımı, oy vermemiş biri dahil herkese görünür (anket kapandığı için gizlilik gerekmez).
- Hiç oy kullanılmadıysa açılır bölüm gösterilmez; mevcut "oy kullanılmadı" mesajı kalır.
- Maç sonradan düzenlenip çıkarılan oyuncuya gelen oylar listede ve toplamda yer almaz (kazanan
  hesabıyla tutarlı).
- Açık anketin davranışı değişmez.

## Constraints & out of scope
- Geçmiş maçların anket arşivi yok.
- Puan hesabı değişmez.

## Acceptance criteria
- [ ] AC-1 — Kapanmış ve oy almış ankette kartta kapalı bir "Oy dağılımı" bölümü vardır; açılınca her katılımcı oy sayısıyla görünür.
- [ ] AC-2 — Satırlar oya göre azalan sıralıdır; en yüksek oyu alan(lar) vurgulanır (eşitlikte hepsi).
- [ ] AC-3 — Toplam oy ve oranlar yalnızca maçta oynayan oyuncuların oylarından hesaplanır.
- [ ] AC-4 — Hiç oy yoksa açılır bölüm görünmez, "oy kullanılmadı" mesajı görünür.
- [ ] AC-5 — Oy vermemiş bir tarayıcı da kapanmış ankette dağılımı görebilir.
- [ ] AC-6 — Açık anketin görünümü ve oy verme akışı aynı kalır.

## Definition of Done
- [ ] Every acceptance criterion mapped to proof (test or reproducible observation)
- [ ] `scripts/check` green
- [ ] Independent review done; real findings fixed, noise rejected with written rationale
- [ ] Docs / ADRs updated if behavior or architecture changed
- [ ] Spec moved to `specs/done/` (it becomes immutable there)

## Scorecard (fill at ship — honest numbers make the process improvable)
| Metric | Value |
|---|---|
| Spec revisions | |
| Fix rounds | |
| Review findings: real / noise | |
| Regressions introduced | |
| Bugs escaped to production | |
