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
      showFeedback("App installed.");
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
      showFeedback("Enter an item name.");
      return;
    }

    if (parsedQuantity < 1) {
      showFeedback("Initial quantity must be at least 1.");
      return;
    }

    const nextItems = sortItems([...items, createItem(trimmedName, parsedQuantity)]);
    setItems(nextItems);
    setName("");
    setQuantity("1");
    showFeedback(`Added ${trimmedName}.`);
  }

  function updateQuantity(id, change) {
    const currentItem = items.find((item) => item.id === id);

    if (!currentItem) {
      return;
    }

    if (change < 0 && currentItem.quantity === 1) {
      const confirmed = window.confirm(
        `Remove ${currentItem.name}? Its quantity would reach 0.`,
      );

      if (!confirmed) {
        return;
      }

      setItems(items.filter((item) => item.id !== id));
      showFeedback(`Removed ${currentItem.name}.`);
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
      change > 0 ? `Increased ${currentItem.name}.` : `Decreased ${currentItem.name}.`,
    );
  }

  function handleDelete(id) {
    const currentItem = items.find((item) => item.id === id);

    if (!currentItem) {
      return;
    }

    const confirmed = window.confirm(`Delete ${currentItem.name}?`);

    if (!confirmed) {
      return;
    }

    setItems(items.filter((item) => item.id !== id));
    showFeedback(`Deleted ${currentItem.name}.`);
  }

  async function handleInstall() {
    if (!installPrompt) {
      return;
    }

    installPrompt.prompt();
    const result = await installPrompt.userChoice;

    if (result.outcome !== "accepted") {
      showFeedback("Install dismissed.");
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
            <p className="eyebrow">Local inventory</p>
            <h1>Inventory Tracker</h1>
            <p className="hero-copy">
              Track quantities on this device only. Data is stored in your browser
              and stays private to this browser profile.
            </p>
          </div>

          {installPrompt ? (
            <button className="secondary-button" type="button" onClick={handleInstall}>
              Install app
            </button>
          ) : null}
        </header>

        <section className="panel">
          <form className="item-form" onSubmit={handleAddItem}>
            <label className="field">
              <span>Item name</span>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Coffee beans"
                maxLength={80}
              />
            </label>

            <label className="field quantity-field">
              <span>Initial quantity</span>
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
              Add item
            </button>
          </form>
        </section>

        <section className="panel toolbar">
          <label className="field search-field">
            <span>Search</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter items"
            />
          </label>
          <p className="item-count">
            {filteredItems.length} {filteredItems.length === 1 ? "item" : "items"}
          </p>
        </section>

        <section className="list-section">
          {filteredItems.length === 0 ? (
            <div className="empty-state">
              <h2>No items yet</h2>
              <p>
                Add your first inventory item above. Everything stays in localStorage
                on this device.
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
                        Added {new Date(item.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="quantity-badge" aria-label={`Quantity ${item.quantity}`}>
                      {item.quantity}
                    </div>
                  </div>

                  <div className="item-actions">
                    <button
                      className="action-button"
                      type="button"
                      onClick={() => updateQuantity(item.id, -1)}
                      aria-label={`Decrease ${item.name}`}
                    >
                      -
                    </button>
                    <button
                      className="action-button"
                      type="button"
                      onClick={() => updateQuantity(item.id, 1)}
                      aria-label={`Increase ${item.name}`}
                    >
                      +
                    </button>
                    <button
                      className="delete-button"
                      type="button"
                      onClick={() => handleDelete(item.id)}
                    >
                      Delete
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
