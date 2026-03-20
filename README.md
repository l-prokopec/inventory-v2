# Klobásovník

Klobásovník je jednoduchá mobilní webová aplikace pro sdílený rodinný inventář. Běží čistě jako statický frontend na GitHub Pages a položky ukládá do jednoho JSON souboru v GitHub Gistu.

## Co aplikace umí

- přidat položku s názvem a počátečním množstvím
- zvýšit nebo snížit množství položky
- potvrdit smazání položky
- potvrdit odstranění položky při snížení z `1` na `0`
- filtrovat položky
- řadit podle názvu nebo množství
- zvýraznit nízký stav
- sdílet jeden inventář mezi více lidmi přes GitHub Gist
- zamknout zobrazení jednoduchým frontend heslem

## Jak to funguje

- frontend běží na GitHub Pages
- data se nenačítají z `localStorage`
- při odemknutí aplikace se inventář načte z jednoho Gistu přes GitHub API
- při každé změně se celý inventář zapíše zpět do stejného Gistu

## Důležité omezení

Tohle řešení je vhodné jen pro low-risk použití mezi pár lidmi.

- heslo je pouze frontend zámek obrazovky
- GitHub token je uložený v klientském kódu
- kdokoliv techničtější si může token nebo heslo z aplikace vytáhnout
- při souběžné editaci více lidmi může dojít k přepsání změn

Pokud byste časem chtěli skutečné zabezpečení a spolehlivější sdílení, bude potřeba backend nebo spravovaná databázová služba.

## Nastavení sdíleného Gistu

1. Na GitHubu vytvořte nový Gist.
2. Do Gistu vytvořte soubor, například `inventory.json`.
3. Jako obsah souboru vložte:

```json
[]
```

4. V GitHubu si vytvořte Personal Access Token, který má oprávnění upravovat Gisty.
5. Otevřete [src/config.js](C:\_DEV\personalProjects\inventory-v2\src\config.js) a doplňte:
   - `appPassword`
   - `gistId`
   - `githubToken`
   - `gistFilename`

Příklad:

```js
export const SHARED_INVENTORY_CONFIG = {
  appPassword: "rodinne-heslo",
  gistId: "1234567890abcdef1234567890abcdef",
  githubToken: "github_pat_xxxxxxxxxxxxx",
  gistFilename: "inventory.json",
};
```

Po doplnění těchto hodnot aplikace přestane zobrazovat setup obrazovku a začne pracovat se sdíleným inventářem.

## Spuštění lokálně

1. Nainstalujte závislosti:

```bash
npm install
```

2. Spusťte vývojový server:

```bash
npm run dev
```

3. Otevřete URL, které vypíše Vite.

## Build

```bash
npm run build
```

Výstup se vygeneruje do složky `dist/`.

## Nasazení na GitHub Pages

Repo obsahuje workflow v [deploy.yml](C:\_DEV\personalProjects\inventory-v2\.github\workflows\deploy.yml).

1. Pushněte projekt do GitHub repozitáře.
2. V GitHubu otevřete `Settings > Pages`.
3. Jako `Source` nastavte `GitHub Actions`.
4. Pushněte změny do větve `master`.
5. Workflow projekt postaví a zveřejní na GitHub Pages.

## Chování inventáře

- názvy položek se před uložením ořezávají
- prázdný název není povolen
- množství nesmí klesnout pod `0`
- při snížení z `1` na `0` aplikace požádá o potvrzení odstranění
- tlačítko `Smazat` vždy vyžaduje potvrzení
- toast upozornění se zobrazuje jen po vytvoření a smazání položky nebo při chybě

## Struktura projektu

```text
inventory-v2/
|-- .github/
|   `-- workflows/
|       `-- deploy.yml
|-- public/
|   |-- icons/
|   |-- manifest.webmanifest
|   `-- sw.js
|-- src/
|   |-- App.jsx
|   |-- config.js
|   |-- gistStorage.js
|   |-- main.jsx
|   `-- styles.css
|-- index.html
|-- package.json
|-- README.md
`-- vite.config.js
```