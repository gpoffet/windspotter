interface AlplakesResponse {
  time: string[];
  variables: {
    T: {
      data: number[];
      unit: string;
    };
  };
  depth: {
    data: number;
    unit: string;
  };
}

/**
 * Fetch water temperature for a single lake from the Alplakes/EAWAG API.
 * Returns { current, depth } or { current: null, depth: 1 } on failure.
 */
export async function fetchWaterTemp(
  alplakesKey: string,
): Promise<{ current: number | null; depth: number }> {
  try {
    const url = `https://alplakes-eawag.s3.eu-central-1.amazonaws.com/simulations/simstrat/cache/${alplakesKey}/linegraph_T.json`;
    const response = await fetch(url);
    if (!response.ok) {
      return { current: null, depth: 1 };
    }

    const data = await response.json() as AlplakesResponse;
    const now = Date.now();

    // Find the index closest to now
    let closestIdx = 0;
    let closestDiff = Infinity;
    for (let i = 0; i < data.time.length; i++) {
      const diff = Math.abs(new Date(data.time[i]).getTime() - now);
      if (diff < closestDiff) {
        closestDiff = diff;
        closestIdx = i;
      }
    }

    const temp = data.variables.T.data[closestIdx];
    const depth = data.depth.data;

    return {
      current: Math.round(temp * 10) / 10, // 1 decimal place
      depth,
    };
  } catch {
    return { current: null, depth: 1 };
  }
}

/**
 * Fetch water temperatures for all unique lakes in parallel.
 * Returns a map of alplakesKey -> { current, depth }.
 */
export async function fetchAllWaterTemps(
  alplakesKeys: string[],
): Promise<Map<string, { current: number | null; depth: number }>> {
  const uniqueKeys = [...new Set(alplakesKeys)];
  const results = await Promise.all(
    uniqueKeys.map(async (key) => ({
      key,
      temp: await fetchWaterTemp(key),
    })),
  );

  const map = new Map<string, { current: number | null; depth: number }>();
  for (const { key, temp } of results) {
    map.set(key, temp);
  }
  return map;
}
