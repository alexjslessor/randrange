

export const normalizeIds = (ids) =>
  Array.from(
    new Set(
      (Array.isArray(ids) ? ids : [])
        .map((id) => String(id || '').trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));

export const toArray = (value) => (Array.isArray(value) ? value : []);
