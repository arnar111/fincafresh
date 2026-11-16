# Fincafresh: vefverslun og stjórnborð

Ný vefverslun Fincafresh (ávaxtakassar í áskrift eða stakir, netverslun) ásamt stjórnborði þar sem hægt er að gera allt á einum stað: pantanir, áskriftir, sendingar, vörur, ávexti, greiningu og tengingar við WooCommerce, Pikkoló, Repeat, Samskip og PostHog.

Smíðað með Next.js 15, React 19, Prisma, Postgres (Netlify Database) og Tailwind CSS 4. Hýst á Netlify.

## Á Netlify (fincafresh.netlify.app)

Netlify byggir greinina sjálfkrafa við hvert push.
- **Gagnagrunnur:** Netlify Database (Postgres) er búinn til sjálfkrafa og töflurnar ásamt grunngögnum (kassar, vörur, ávextir, næsta sending) eru settar inn úr `netlify/database/migrations/` við hverja útgáfu.
- **Myndir** sem hlaðið er upp í stjórnborðinu eru geymdar í Netlify Blobs.
- **Umhverfisbreytur** (Netlify → Project configuration → Environment variables): `APP_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `NEXT_PUBLIC_SITE_URL`, `PIKKOLO_VENDOR_ID`. Pikkoló umhverfið (staging/production) er valið í stjórnborðinu undir **Tengingar**. Aðra lykla (Pikkoló API-lykil, WooCommerce, PostHog, SMTP) er best að slá inn í stjórnborðinu undir **Tengingar**.
- **Fyrsta innskráning:** farðu á `/admin` og skráðu þig inn með `ADMIN_EMAIL` og `ADMIN_PASSWORD`. Þá er stjórnandinn búinn til. Breyttu lykilorðinu strax undir **Stillingar → Aðgangur**.
- **Sýndargögn** eru ekki sett inn sjálfkrafa á Netlify. Efst á **Yfirliti** í stjórnborðinu er takkinn **Setja inn sýndargögn** sem fyllir kerfið af merktum gögnum (pantanir, áskriftir, fyrirspurnir, atburðir fyrir greiningu og prufuviðskiptavinur fyrir Mínar síður). Sami staður býður upp á að endurstilla þau eða eyða með einum smelli; raunveruleg gögn eru aldrei snert.

## Á eigin vél

Þarf Node.js 20.12 eða nýrra.

```bash
npm install
```

```bash
cp .env.example .env
```

Opnaðu `.env` og settu a.m.k. `APP_SECRET` (langur handahófskenndur strengur) og `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

Ræstu staðbundinn gagnagrunn í sérglugga (sami Postgres og Netlify notar, gögnin eru í `.netlify-db/`):

```bash
npm run db:local
```

```bash
npm run setup
```

```bash
npm run dev
```

- Verslunin: http://localhost:3000
- Stjórnborðið: http://localhost:3000/admin

`npm run setup` býr til stjórnandann og setur inn **prufugögn** (prufupantanir, -viðskiptavini og -áskriftir) svo stjórnborðið sýni eitthvað strax. Sleppa má prufugögnum með `SEED_DEMO=false`.

### Breytingar á gagnagrunni
Ef `prisma/schema.prisma` er breytt þarf nýja migration-skrá í `netlify/database/migrations/` (aldrei breyta skrá sem er þegar komin í loftið). Með `npm run db:local` í gangi býr þessi skipun til muninn á staðbundna gagnagrunninum og skemanu:

```bash
npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script > netlify/database/migrations/20261201120000_lysing.sql
```

## Hvað er hvar

| Slóð | Hvað |
| --- | --- |
| `/` | Forsíða: næsta sending (smelltu á ávöxt), Delúx-ávextir með gullhring, kassaval, sparnaðarreiknir |
| `/kassar`, `/kassar/[slug]` | Kassar og samanburður; áskrift er sjálfgefið valin |
| `/askrift` | Kynning á áskrift |
| `/netverslun`, `/vorur/[slug]` | Netverslun með „Þeir sem keyptu þetta keyptu líka“ |
| `/karfa`, `/greidsla` | Karfa og greiðsluferli með Pikkoló stöðvavali |
| `/minar-sidur` | Viðskiptavinur stjórnar áskrift: sleppa sendingu, gera hlé, breyta, segja upp |
| `/admin` | Stjórnborðið |

### Það sem eykur sölu á áskrift
- Áskrift er sjálfgefið valin á kassasíðum og í kassavali.
- Þegar stakur kassi er valinn birtist gluggi sem sýnir svart á hvítu hvað sparast með áskrift og býður að skipta með einum smelli (hægt að slökkva á og breyta textum í **Stillingar**).
- Í körfu og greiðsluferli er boðið að breyta stökum kassa í áskrift.
- Þegar áskrifandi ætlar að segja upp er fyrst boðið upp á hlé, að sleppa sendingu, minni kassa eða sjaldnar.
- Allt þetta er mælt (sýnt í **Greining**): hversu oft glugginn birtist, hversu margir samþykkja, og hvað kom í veg fyrir uppsögn.

## Tengingar: staða

| Kerfi | Staða | Athugasemd |
| --- | --- | --- |
| **Pikkoló** | Útfært | Stöðvaleit, stofna/sækja/afturkalla pöntun, samkvæmt skjölun frá Pikkoló og opinbera SDK-inu. Sjálfgefið í `staging` (prófunarumhverfi Pikkoló). Skiptu í `production` undir Tengingar þegar allt er tilbúið. |
| **WooCommerce** | Útfært | Innflutningur á vörum, flokkum, viðskiptavinum og pöntunum (REST API v3) og webhook fyrir rauntímauppfærslur. Stórum innflutningi er skipt í skammta: ýtt er aftur á takkann til að halda áfram. Slóð og lyklar sett inn undir Tengingar. |
| **PostHog** | Útfært | Atburðir úr vafranum (aðeins með samþykki fyrir vafrakökum) og frá netþjóni; greining í stjórnborði með HogQL. |
| **Repeat** | Bíður | Repeat birtir ekki opinbera API-skjölun. Þangað til eru áskriftir stjórnaðar hér og hægt að flytja inn CSV. Útfært um leið og skjölun berst (`src/lib/integrations/repeat.ts`). |
| **Samskip** | Bíður | Sótt hefur verið um API-aðgang. Þangað til býr stjórnborðið til sendingarlista (CSV) og hægt er að skrá rakningarnúmer. |
| **Greiðslugátt** | Prófunarhamur | Engin greiðsla er tekin. Það þarf að ákveða hvaða gátt á að nota og tengja hana (`src/lib/integrations/payments.ts`). |
| **Tölvupóstur** | Útfært | Sendir með SMTP ef það er stillt; annars eru póstar vistaðir í **Fyrirspurnir → Útsendur póstur**. |

Lyklar sem eru slegnir inn í stjórnborðinu eru dulkóðaðir (AES-256-GCM) í gagnagrunninum. Gildi í `.env` ganga framar.

> **Öryggi:** Pikkoló API-lykillinn var sendur í PDF-skjali. Hann er hvergi geymdur í kóðanum. Settu hann inn undir Tengingar (eða í `.env`) og íhugaðu að biðja Pikkoló um nýjan lykil þar sem skjalið hefur farið á milli manna.

## Vörumerki
- Litir eru teknir beint úr brand-bókinni: Green `#425442`, Off white `#F5EBD9`, Burgundy `#6A2833`, Watermelon pink `#EE9AC2`, Fresh orange `#F26A23`, Lemon `#F9C214`.
- Lógóin (orðmerki, sítrónulógó og sítrónan) eru vektorar teknir úr brand-bókinni: `public/brand/`.
- Brand-bókin notar letrin **Monarcha** og **Minion Pro** sem eru leyfisskyld. Vefurinn notar í staðinn ókeypis letrin Fraunces (fyrirsagnir) og Fira Sans (texti), eins og í mockup-inu. Ef þið eigið Adobe Fonts leyfi má setja kit-auðkenni í `NEXT_PUBLIC_ADOBE_FONTS_KIT`.
- Ávaxtateikningarnar eru teiknaðar fyrir verkefnið í sama flata stíl og sítrónan í brand-bókinni.

## Myndir
Ljósmyndir koma úr brand-bókinni (kassi, mangó, apríkósur, ferskjur) og úr mockup-inu (vörumyndir af núverandi fincafresh.is). Vörumyndirnar úr mockup-inu eru í lágri upplausn; þær verða skipt út fyrir upprunalegu myndirnar þegar vörur eru fluttar inn úr WooCommerce, eða með því að hlaða upp nýjum myndum í **Vörur**.

## Áður en vefurinn fer í loftið
Stjórnborðið sýnir þennan lista líka undir **Yfirlit → Gátlisti fyrir opnun**.

- [ ] Tengja raunverulega greiðslugátt
- [ ] Staðfesta sendingarverð (Stillingar)
- [ ] Staðfesta áskriftarafslátt hvers kassa. Mockup-ið sagði „5–10%“ almennt og „15%“ fyrir Delúx; skiptingin Classic 5% / Grande 10% er ágiskun sem þarf að staðfesta (Vörur)
- [ ] Yfirfara texta um ávextina (merktir „ekki yfirfarið“ í Ávextir)
- [ ] Yfirfara skilmála og persónuverndarstefnu (drög)
- [ ] Setja inn Pikkoló API-lykil og skipta í `production`
- [ ] Tengja WooCommerce og flytja inn vörur, viðskiptavini og pantanir
- [ ] Tengja PostHog
- [ ] Setja upp SMTP fyrir tölvupóst
- [ ] Breyta lykilorði stjórnanda eftir fyrstu innskráningu
