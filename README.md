# Premjer Složaja Drveta 🌲

Terenski PWA alat za brzu procjenu obima složaja drveta pomoću kamere na mobitelu.

> ⚠️ **Napomena:** Ova aplikacija daje operativnu procjenu, ne službeni geodetski premjer. Za zvanične potrebe obavezno potvrditi klasičnim mjerenjem.

---

## 🚀 Pokretanje lokalno

```bash
# 1. Kloniraj repozitorij
git clone https://github.com/TVOJ_USERNAME/NAZIV_REPA.git
cd NAZIV_REPA

# 2. Instaliraj zavisnosti
npm install

# 3. Pokreni razvojni server
npm run dev

# Otvori http://localhost:5173 u browseru
```

## 🔧 Promjena naziva repozitorija

Otvori `vite.config.ts` i promijeni:
```ts
const REPO_NAME = 'premjer-slozaja'  // ← promijeni ovo u naziv svog GitHub repoa
```

---

## 📤 Deploy na GitHub Pages

### Korak 1: Pripremi repozitorij

1. Napravi novi repozitorij na GitHub (npr. `premjer-slozaja`)
2. Promijeni `REPO_NAME` u `vite.config.ts` na naziv svog repoa
3. Postavi `git remote`:
```bash
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/TVOJ_USERNAME/NAZIV_REPA.git
git push -u origin main
```

### Korak 2: Uključi GitHub Pages

1. Idi na `Settings → Pages` u svom repozitoriju
2. Pod **Source** odaberi **GitHub Actions**
3. Sačekaj da se workflow izvrši (1–2 minute)
4. App je dostupna na: `https://TVOJ_USERNAME.github.io/NAZIV_REPA/`

### Korak 3: Automatski deploy

Svaki `git push` na `main` branch automatski deploya novu verziju.

```bash
git add .
git commit -m "opis promjena"
git push
```

---

## 📱 Korištenje na mobitelu

1. Otvori GitHub Pages link u **Chrome** (Android) ili **Safari** (iOS)
2. Aplikacija se ponaša kao nativna mobilna app

### Dodavanje na početni ekran (PWA instalacija)

**Android (Chrome):**
1. Otvori app u Chromeu
2. Tapni na `⋮` meni (tri tačke gore desno)
3. Odaberi **"Dodaj na početni ekran"** ili **"Instaliraj aplikaciju"**
4. Tapni **Dodaj** u dijalogu

**iPhone/iPad (Safari):**
1. Otvori app u Safariju
2. Tapni na **Share** dugme (kvadrat sa strelicom gore)
3. Skrolaj i odaberi **"Dodaj na početni ekran"**
4. Tapni **Dodaj**

---

## 📸 Kako pravilno snimiti složaj

1. Stani **frontalno** ispred složaja
2. Drži kameru **što ravnije** (horizontalno)
3. Obuhvati **cijeli složaj** u kadar
4. Koristi **referentni marker** (letvu 1 m) za foto-kalibraciju
5. **Provjeri ručno** vrijednosti prije spremanja

---

## 🔢 Formula izračuna

```
Zapremina = Dužina × Širina × Visina × Koeficijent popunjenosti
```

| Parametar | Opis |
|-----------|------|
| Dužina | Dužina složaja u metrima |
| Širina | Širina/dubina složaja u metrima |
| Visina | Visina složaja u metrima |
| Koeficijent | Popunjenost (standardno 0,65 za okruglo drvo) |

---

## 📊 CSV Export

Export uključuje kolone:
`Datum; Vrijeme; Lokacija; Vrsta drveta; Dužina; Širina; Visina; Koeficijent; Zapremina; GPS Lat; GPS Lng; GPS Tačnost; Status; Napomena`

---

## 🛠 Tehnologije

- **React 18** + **TypeScript**
- **Vite** (build tool)
- **Tailwind CSS** (stilizacija)
- **vite-plugin-pwa** (PWA support)
- **IndexedDB** via `idb` (lokalna pohrana)
- **Browser Camera API** (kamera)
- **Geolocation API** (GPS)

---

## 📁 Struktura projekta

```
src/
├── components/       # UI komponente
│   ├── Layout.tsx
│   ├── MarkerOverlay.tsx    # Drag marker za označavanje složaja
│   ├── MeasurementCard.tsx
│   ├── DisclaimerBanner.tsx
│   └── FormField.tsx
├── pages/            # Ekrani aplikacije
│   ├── HomePage.tsx
│   ├── NewMeasurementPage.tsx
│   ├── HistoryPage.tsx
│   └── MeasurementDetailPage.tsx
├── hooks/            # React hookovi
│   ├── useCamera.ts
│   ├── useGps.ts
│   ├── useMeasurements.ts
│   ├── useDarkMode.ts
│   └── useOnlineStatus.ts
├── utils/            # Utility funkcije
│   ├── calculations.ts    # Formula, kalibracija, validacija
│   ├── calculations.test.ts
│   ├── db.ts              # IndexedDB operacije
│   ├── export.ts          # CSV export
│   ├── format.ts          # Formatiranje, konstante
│   └── imageUtils.ts      # Kompresija slike
└── types/
    └── index.ts      # TypeScript tipovi
```

---

## ⚡ Offline rad

App radi offline nakon prvog učitavanja zahvaljujući Service Workeru.
Sva mjerenja se čuvaju lokalno u IndexedDB — nema potrebe za serverom ili internetom.

---

*Razvijeno za terenske šumarske operacije u BiH.*
