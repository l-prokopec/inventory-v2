import { useEffect, useMemo, useRef, useState } from "react";
import { SHARED_INVENTORY_CONFIG, isSharedConfigReady } from "./config";
import { loadSharedInventory, saveSharedInventory } from "./gistStorage";

const LOW_STOCK_THRESHOLD = 3;
const SORT_OPTIONS = {
  quantityDesc: "Množství od nejvyššího",
  quantityAsc: "Množství od nejnižšího",
  nameAsc: "Název A-Z",
  nameDesc: "Název Z-A",
};

function createItem(name, quantity) {
  return {
    id: crypto.randomUUID(),
    name,
    quantity,
    createdAt: new Date().toISOString(),
  };
}

function sortItems(items, sortBy) {
  const nextItems = [...items];

  switch (sortBy) {
    case "quantityDesc":
      return nextItems.sort((first, second) => second.quantity - first.quantity);
    case "quantityAsc":
      return nextItems.sort((first, second) => first.quantity - second.quantity);
    case "nameAsc":
      return nextItems.sort((first, second) => first.name.localeCompare(second.name, "cs"));
    case "nameDesc":
      return nextItems.sort((first, second) => second.name.localeCompare(first.name, "cs"));
    default:
      return nextItems;
  }
}

export default function App() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("quantityDesc");
  const [passwordInput, setPasswordInput] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [installPrompt, setInstallPrompt] = useState(null);
  const feedbackTimeoutRef = useRef(null);

  useEffect(() => {
    function handleBeforeInstallPrompt(event) {
      event.preventDefault();
      setInstallPrompt(event);
    }

    function handleInstalled() {
      setInstallPrompt(null);
      showFeedback("Aplikace byla nainstalována.");
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        window.clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isUnlocked || !isSharedConfigReady()) {
      return;
    }

    refreshInventory();
  }, [isUnlocked]);

  function showFeedback(message) {
    setFeedback(message);

    if (feedbackTimeoutRef.current) {
      window.clearTimeout(feedbackTimeoutRef.current);
    }

    feedbackTimeoutRef.current = window.setTimeout(() => {
      setFeedback("");
    }, 2400);
  }

  async function refreshInventory() {
    setIsLoading(true);
    setSyncError("");

    try {
      const nextItems = await loadSharedInventory();
      setItems(nextItems);
    } catch (error) {
      setSyncError(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function persistItems(nextItems, successMessage) {
    const previousItems = items;
    setItems(nextItems);
    setIsSaving(true);
    setSyncError("");

    try {
      await saveSharedInventory(nextItems);

      if (successMessage) {
        showFeedback(successMessage);
      }
    } catch (error) {
      setItems(previousItems);
      setSyncError(error.message);
      showFeedback("Změnu se nepodařilo uložit.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleUnlock(event) {
    event.preventDefault();

    if (passwordInput !== SHARED_INVENTORY_CONFIG.appPassword) {
      showFeedback("Nesprávné heslo.");
      return;
    }

    setIsUnlocked(true);
    setPasswordInput("");
  }

  async function handleAddItem(event) {
    event.preventDefault();

    const trimmedName = name.trim();
    const parsedQuantity = Math.max(0, Number.parseInt(quantity, 10) || 0);

    if (!trimmedName) {
      showFeedback("Zadejte název položky.");
      return;
    }

    if (parsedQuantity < 1) {
      showFeedback("Počáteční množství musí být alespoň 1.");
      return;
    }

    const nextItems = [createItem(trimmedName, parsedQuantity), ...items];
    setName("");
    setQuantity("1");
    await persistItems(nextItems, `Položka ${trimmedName} byla přidána.`);
  }

  async function updateQuantity(id, change) {
    const currentItem = items.find((item) => item.id === id);

    if (!currentItem) {
      return;
    }

    if (change < 0 && currentItem.quantity === 1) {
      const confirmed = window.confirm(
        `Opravdu odstranit položku ${currentItem.name}? Množství by kleslo na 0.`,
      );

      if (!confirmed) {
        return;
      }

      await persistItems(
        items.filter((item) => item.id !== id),
        `Položka ${currentItem.name} byla odstraněna.`,
      );
      return;
    }

    await persistItems(
      items.map((item) =>
        item.id === id
          ? { ...item, quantity: Math.max(0, item.quantity + change) }
          : item,
      ),
      "",
    );
  }

  async function handleDelete(id) {
    const currentItem = items.find((item) => item.id === id);

    if (!currentItem) {
      return;
    }

    const confirmed = window.confirm(`Opravdu smazat položku ${currentItem.name}?`);

    if (!confirmed) {
      return;
    }

    await persistItems(
      items.filter((item) => item.id !== id),
      `Položka ${currentItem.name} byla smazána.`,
    );
  }

  async function handleInstall() {
    if (!installPrompt) {
      return;
    }

    installPrompt.prompt();
    const result = await installPrompt.userChoice;

    if (result.outcome !== "accepted") {
      showFeedback("Instalace byla zrušena.");
    }

    setInstallPrompt(null);
  }

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const visibleItems = normalizedQuery
      ? items.filter((item) => item.name.toLowerCase().includes(normalizedQuery))
      : items;

    return sortItems(visibleItems, sortBy);
  }, [items, query, sortBy]);

  const totalQuantity = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items],
  );

  const lowStockCount = useMemo(
    () => items.filter((item) => item.quantity <= LOW_STOCK_THRESHOLD).length,
    [items],
  );

  if (!isSharedConfigReady()) {
    return (
      <div className="app-shell">
        <main className="app-card">
          <section className="panel setup-panel">
            <h1>Klobásovník</h1>
            <p className="hero-copy">
              Nejdřív doplňte <code>appPassword</code>, <code>gistId</code>, <code>githubToken</code> a <code>gistFilename</code> do <code>src/config.js</code>.
            </p>
            <p className="setup-note">
              Tenhle režim je vhodný jen pro malé sdílení mezi pár lidmi. Heslo i token jsou uložené ve frontendu.
            </p>
          </section>
        </main>
      </div>
    );
  }

  if (!isUnlocked) {
    return (
      <div className="app-shell">
        <main className="app-card">
          <section className="panel setup-panel">
            <h1>Klobásovník</h1>
            <p className="hero-copy">
              Sdílený inventář je zamčený jednoduchým frontend heslem.
            </p>
            <form className="unlock-form" onSubmit={handleUnlock}>
              <label className="field">
                <span>Heslo</span>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(event) => setPasswordInput(event.target.value)}
                  placeholder="Zadejte heslo"
                />
              </label>
              <button className="primary-button" type="submit">
                Odemknout inventář
              </button>
            </form>
          </section>
        </main>

        {feedback ? (
          <div className="toast" role="status" aria-live="polite">
            {feedback}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="app-shell">
      <main className="app-card">
        <header className="hero">
          <div className="hero-copy-wrap">
            <h1>Klobásovník</h1>
          </div>

          <div className="hero-side">
            <div className="hero-actions">
              {installPrompt ? (
                <button className="secondary-button" type="button" onClick={handleInstall}>
                  Nainstalovat aplikaci
                </button>
              ) : null}
              <button
                className="ghost-button"
                type="button"
                onClick={refreshInventory}
                disabled={isLoading || isSaving}
              >
                {isLoading ? "Načítám..." : "Obnovit data"}
              </button>
            </div>

            <div className="hero-stats" aria-label="Souhrn inventáře">
              <article className="stat-card stat-card-blue">
                <span className="stat-label">Položky</span>
                <strong>{items.length}</strong>
              </article>
              <article className="stat-card stat-card-orange">
                <span className="stat-label">Celkem kusů</span>
                <strong>{totalQuantity}</strong>
              </article>
              <article className="stat-card stat-card-pink">
                <span className="stat-label">Nízký stav</span>
                <strong>{lowStockCount}</strong>
              </article>
            </div>
          </div>
        </header>

        {syncError ? (
          <div className="panel sync-banner">
            <strong>Synchronizace selhala.</strong>
            <span>{syncError}</span>
          </div>
        ) : null}

        <section className="panel panel-strong">
          <form id="item-form" className="item-form" onSubmit={handleAddItem}>
            <label className="field">
              <span>Název položky</span>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Mexická klobása"
                maxLength={80}
              />
            </label>

            <label className="field quantity-field">
              <span>Počáteční množství</span>
              <input
                type="number"
                inputMode="numeric"
                min="1"
                step="1"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
              />
            </label>

            <button className="primary-button" type="submit" disabled={isSaving || isLoading}>
              {isSaving ? "Ukládám..." : "Přidat položku"}
            </button>
          </form>
        </section>

        <section className="panel toolbar">
          <label className="field search-field">
            <span>Hledat</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filtrovat položky"
            />
          </label>

          <label className="field sort-field">
            <span>Řazení</span>
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              {Object.entries(SORT_OPTIONS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <p className="item-count">
            Zobrazeno {filteredItems.length} {filteredItems.length === 1 ? "položka" : "položek"}
          </p>
        </section>

        <section className="list-section">
          {isLoading ? (
            <div className="empty-state">
              <h2>Načítám sdílený inventář...</h2>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="empty-state">
              <h2>Zatím žádné položky</h2>
            </div>
          ) : (
            <ul className="item-list">
              {filteredItems.map((item) => {
                const isLowStock = item.quantity <= LOW_STOCK_THRESHOLD;

                return (
                  <li
                    key={item.id}
                    className={`item-row ${isLowStock ? "is-low-stock" : ""}`}
                  >
                    <div className="item-main">
                      <div className="item-copy">
                        <div className="item-headline">
                          <h2>{item.name}</h2>
                          {isLowStock ? <span className="stock-chip">Nízký stav</span> : null}
                        </div>
                        <p className="meta">
                          Přidáno {new Date(item.createdAt).toLocaleDateString("cs-CZ")}
                        </p>
                      </div>

                      <div className="quantity-badge" aria-label={`Množství ${item.quantity}`}>
                        <span className="quantity-label">Množství</span>
                        <strong>{item.quantity}</strong>
                      </div>
                    </div>

                    <div className="item-actions">
                      <button
                        className="action-button action-button-minus"
                        type="button"
                        onClick={() => updateQuantity(item.id, -1)}
                        aria-label={`Snížit množství položky ${item.name}`}
                        disabled={isSaving}
                      >
                        -
                      </button>
                      <button
                        className="action-button action-button-plus"
                        type="button"
                        onClick={() => updateQuantity(item.id, 1)}
                        aria-label={`Zvýšit množství položky ${item.name}`}
                        disabled={isSaving}
                      >
                        +
                      </button>
                      <button
                        className="delete-button"
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        disabled={isSaving}
                      >
                        Smazat
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>

      {feedback ? (
        <div className="toast" role="status" aria-live="polite">
          {feedback}
        </div>
      ) : null}
    </div>
  );
}