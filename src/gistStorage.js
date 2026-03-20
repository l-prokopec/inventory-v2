function normalizeItems(rawItems) {
  if (!Array.isArray(rawItems)) {
    return [];
  }

  return rawItems
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      id: String(item.id ?? crypto.randomUUID()),
      name: String(item.name ?? "").trim(),
      quantity: Math.max(0, Number(item.quantity) || 0),
      createdAt: item.createdAt ?? new Date().toISOString(),
    }))
    .filter((item) => item.name);
}

export async function loadSharedInventory(settings) {
  const response = await fetch(`https://api.github.com/gists/${settings.gistId}`, {
    headers: {
      Accept: "application/vnd.github+json",
    },
  });

  if (!response.ok) {
    throw new Error("Nepodařilo se načíst sdílený inventář z Gistu.");
  }

  const gist = await response.json();
  const file = gist.files?.[settings.gistFilename];

  if (!file) {
    return [];
  }

  try {
    return normalizeItems(JSON.parse(file.content));
  } catch {
    throw new Error("Obsah Gistu není validní JSON inventář.");
  }
}

export async function saveSharedInventory(settings, items) {
  const response = await fetch(`https://api.github.com/gists/${settings.gistId}`, {
    method: "PATCH",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${settings.githubToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      files: {
        [settings.gistFilename]: {
          content: JSON.stringify(items, null, 2),
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error("Nepodařilo se uložit změny do sdíleného inventáře.");
  }
}