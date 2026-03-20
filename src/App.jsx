import { useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY = "inventory-tracker-items";
const LOW_STOCK_THRESHOLD = 3;

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

function sortItems(items) {
  return [...items].sort(
    (first, second) =>
      new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime(),
  );
}

export default function App() {
  const [items, setItems] = useState(() => sortItems(readStoredItems()));
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [query, setQuery] = useState("");
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
      showFeedback("Poèáteèní množství musí být alespoò 1.");
      return;
    }

    const nextItems = sortItems([...items, createItem(trimmedName, parsedQuantity)]);
    setItems(nextItems);
    setName("");
    setQuantity("1");
    showFeedback(`Položka ${trimmedName} byla pøidána.`);
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
      showFeedback(`Položka ${currentItem.name} byla odstranìna.`);
      return;
    }

    setItems(
      items.map((item) =>
        item.id === id
          ? { ...item, quantity: Math.max(0, item.quantity + change) }
          : item,
      ),
    );

    showFeedback(
      change > 0
        ? `Množství položky ${currentItem.name} bylo zvýšeno.`
        : `Množství položky ${currentItem.name} bylo sníženo.`,
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

    if (!normalizedQuery) {
      return items;
    }

    return items.filter((item) =>
      item.name.toLowerCase().includes(normalizedQuery),
    );
  }, [items, query]);

  return (
    <div className="app-shell">
      <main className="app-card">
        <header className="hero">
          <div>
            <p className="eyebrow">Lokální inventáø</p>
            <h1>Sledování inventáøe</h1>
            <p className="hero-copy">
              Sledujte množství jen v tomto zaøízení. Data jsou uložena v prohlížeèi
              a zùstávají pouze v tomto profilu.
            </p>
          </div>

          {installPrompt ? (
            <button className="secondary-button" type="button" onClick={handleInstall}>
              Nainstalovat aplikaci
            </button>
          ) : null}
        </header>

        <section className="panel">
          <form className="item-form" onSubmit={handleAddItem}>
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
              <span>Poèáteèní množství</span>
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
              Pøidat položku
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
          <p className="item-count">
            {filteredItems.length}{" "}
            {filteredItems.length === 1 ? "položka" : "položek"}
          </p>
        </section>

        <section className="list-section">
          {filteredItems.length === 0 ? (
            <div className="empty-state">
              <h2>Zatím žádné položky</h2>
              <p>
                Pøidejte svou první položku výše. Vše zùstává uložené v localStorage
                na tomto zaøízení.
              </p>
            </div>
          ) : (
            <ul className="item-list">
              {filteredItems.map((item) => (
                <li
                  key={item.id}
                  className={`item-row ${
                    item.quantity <= LOW_STOCK_THRESHOLD ? "is-low-stock" : ""
                  }`}
                >
                  <div className="item-main">
                    <div>
                      <h2>{item.name}</h2>
                      <p className="meta">
                        Pøidáno {new Date(item.createdAt).toLocaleDateString("cs-CZ")}
                      </p>
                    </div>

                    <div className="quantity-badge" aria-label={`Množství ${item.quantity}`}>
                      {item.quantity}
                    </div>
                  </div>

                  <div className="item-actions">
                    <button
                      className="action-button"
                      type="button"
                      onClick={() => updateQuantity(item.id, -1)}
                      aria-label={`Snížit množství položky ${item.name}`}
                    >
                      -
                    </button>
                    <button
                      className="action-button"
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
              ))}
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
