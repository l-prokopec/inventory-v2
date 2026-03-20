import { useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY = "inventory-tracker-items";
const LOW_STOCK_THRESHOLD = 3;
const SORT_OPTIONS = {
  newest: "Od nejnovějších",
  oldest: "Od nejstarších",
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

function readStoredItems() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item) => item && typeof item === "object")
      .map((item) => ({
        id: String(item.id ?? crypto.randomUUID()),
        name: String(item.name ?? "").trim(),
        quantity: Math.max(0, Number(item.quantity) || 0),
        createdAt: item.createdAt ?? new Date().toISOString(),
      }))
      .filter((item) => item.name);
  } catch {
    return [];
  }
}

function sortItems(items, sortBy) {
  const nextItems = [...items];

  switch (sortBy) {
    case "oldest":
      return nextItems.sort(
        (first, second) =>
          new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime(),
      );
    case "nameAsc":
      return nextItems.sort((first, second) => first.name.localeCompare(second.name, "cs"));
    case "nameDesc":
      return nextItems.sort((first, second) => second.name.localeCompare(first.name, "cs"));
    case "newest":
    default:
      return nextItems.sort(
        (first, second) =>
          new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime(),
      );
  }
}

export default function App() {
  const [items, setItems] = useState(() => sortItems(readStoredItems(), "newest"));
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [feedback, setFeedback] = useState("");
  const [installPrompt, setInstallPrompt] = useState(null);
  const feedbackTimeoutRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

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
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
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

  function showFeedback(message) {
    setFeedback(message);

    if (feedbackTimeoutRef.current) {
      window.clearTimeout(feedbackTimeoutRef.current);
    }

    feedbackTimeoutRef.current = window.setTimeout(() => {
      setFeedback("");
    }, 2400);
  }

  function handleAddItem(event) {
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

    setItems((currentItems) => [createItem(trimmedName, parsedQuantity), ...currentItems]);
    setName("");
    setQuantity("1");
    showFeedback(`Položka ${trimmedName} byla přidána.`);
  }

  function updateQuantity(id, change) {
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

      setItems(items.filter((item) => item.id !== id));
      showFeedback(`Položka ${currentItem.name} byla odstraněna.`);
      return;
    }

    setItems(
      items.map((item) =>
        item.id === id
          ? { ...item, quantity: Math.max(0, item.quantity + change) }
          : item,
      ),
    );
  }

  function handleDelete(id) {
    const currentItem = items.find((item) => item.id === id);

    if (!currentItem) {
      return;
    }

    const confirmed = window.confirm(`Opravdu smazat položku ${currentItem.name}?`);

    if (!confirmed) {
      return;
    }

    setItems(items.filter((item) => item.id !== id));
    showFeedback(`Položka ${currentItem.name} byla smazána.`);
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

  return (
    <div className="app-shell">
      <main className="app-card">
        <header className="hero">
          <div className="hero-copy-wrap">
            <h1>Sledování inventáře</h1>
          </div>

          <div className="hero-side">
            {installPrompt ? (
              <button className="secondary-button" type="button" onClick={handleInstall}>
                Nainstalovat aplikaci
              </button>
            ) : null}

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

        <section className="panel panel-strong">
          <form id="item-form" className="item-form" onSubmit={handleAddItem}>
            <label className="field">
              <span>Název položky</span>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Kávová zrna"
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

            <button className="primary-button" type="submit">
              Přidat položku
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
          {filteredItems.length === 0 ? (
            <div className="empty-state">
              <button className="empty-action" type="submit" form="item-form" aria-label="Přidat položku">
                +
              </button>
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
                      >
                        -
                      </button>
                      <button
                        className="action-button action-button-plus"
                        type="button"
                        onClick={() => updateQuantity(item.id, 1)}
                        aria-label={`Zvýšit množství položky ${item.name}`}
                      >
                        +
                      </button>
                      <button
                        className="delete-button"
                        type="button"
                        onClick={() => handleDelete(item.id)}
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