

const parsePositiveInt = (value, fallback) => {
  if (value === null || value === undefined || value === '') return fallback;

  const parsed = Number.parseInt(String(value), 10);

  if (Number.isNaN(parsed) || parsed <= 0) return fallback;
  return parsed;
};

const buildDeploymentsSearchParams = (
  searchParams,
  {
    page,
    limit,
    sort,
    search,
  },
) => {
  const nextParams = new URLSearchParams(searchParams);
  nextParams.set('page', String(page));
  nextParams.set('limit', String(limit));
  nextParams.set('sort', String(sort));
  const normalizedSearch = String(search || '').trim();
  if (normalizedSearch) {
    nextParams.set('search', normalizedSearch);
  } else {
    nextParams.delete('search');
  }
  return nextParams;
};

export {
  buildDeploymentsSearchParams,
  parsePositiveInt,
};
