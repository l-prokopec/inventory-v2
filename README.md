# Inventory Tracker

A lightweight mobile-first inventory tracking web app built with React and Vite. Each browser stores its own inventory in `localStorage`, so there is no backend, no login, and no shared database.

## What the app does

- Add inventory items with a name and initial quantity
- Increase or decrease item quantities
- Confirm before deleting an item
- Confirm before removing an item when decreasing from `1` to `0`
- Persist data locally in the browser after refresh
- Filter items with a simple search field
- Highlight low-stock items
- Offer browser install support through a web app manifest and install prompt where supported

## Tech stack

- React
- Vite
- Browser `localStorage`
- Static deployment via GitHub Pages

## Project structure

```text
inventory-v2/
|-- .github/
|   `-- workflows/
|       `-- deploy.yml
|-- public/
|   |-- icons/
|   |   |-- apple-touch-icon.svg
|   |   |-- icon.svg
|   |   `-- maskable-icon.svg
|   |-- manifest.webmanifest
|   `-- sw.js
|-- src/
|   |-- App.jsx
|   |-- main.jsx
|   `-- styles.css
|-- .gitignore
|-- index.html
|-- package.json
|-- README.md
`-- vite.config.js
```

## Run locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the development server:

   ```bash
   npm run dev
   ```

3. Open the local URL shown by Vite in your browser.

## Build for production

```bash
npm run build
```

The production files are generated in the `dist/` folder.

## Deploy to GitHub Pages

This repository includes a GitHub Actions workflow in `.github/workflows/deploy.yml`.

1. Push the project to a GitHub repository.
2. In GitHub, open `Settings > Pages`.
3. Under `Build and deployment`, set `Source` to `GitHub Actions`.
4. Push to the `master` branch, or run the workflow manually from the `Actions` tab.
5. GitHub will publish the `dist/` output to GitHub Pages.

### Why `base: "./"` is used

Vite is configured with a relative asset base in `vite.config.js`. This helps the static build work correctly on GitHub Pages project URLs such as:

`https://your-user-name.github.io/your-repo-name/`

## How localStorage is used

- Inventory items are stored under the `localStorage` key `inventory-tracker-items`
- Each item includes:
  - `id`
  - `name`
  - `quantity`
  - `createdAt`
- Data is written back to `localStorage` whenever the inventory changes
- Data is read from `localStorage` when the app loads

## Local-only storage limitations

- Data stays only in the current browser profile on the current device
- Clearing browser storage will remove the inventory
- Data does not sync across devices or browsers
- Reinstalling the browser or using private browsing may remove stored data
- There is no account recovery because there are no user accounts

## Installability notes

- The app includes a web app manifest
- A minimal service worker is included to improve installability support in compatible browsers
- Browsers decide when and whether to show an install prompt
- On iPhone and iPad, users may need to use the browser share menu and choose `Add to Home Screen`

## Inventory behavior

- Item names are trimmed before saving
- Empty names are rejected
- Initial quantity must be at least `1`
- Quantity never goes below `0`
- Items are sorted by newest first
- Decreasing an item from `1` confirms removal before deleting it
- Clicking `Delete` always asks for confirmation

## Notes for beginners

- All app state lives in `src/App.jsx`
- Styling is in `src/styles.css`
- Static PWA files live in `public/`
- No backend or server code is used anywhere in this project
