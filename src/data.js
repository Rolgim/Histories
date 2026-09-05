// ============================================================
// CHARGEMENT DES DONNÉES
// ============================================================

export async function loadData() {
  const [historicalDataResponse, manifestResponse] = await Promise.all([
    fetch("data/historical-enrichment.json"),
    fetch("data/events/manifest.json")
  ]);

  if (!historicalDataResponse.ok) {
    throw new Error(
      `Failed to load data/historical-enrichment.json (${historicalDataResponse.status})`
    );
  }

  if (!manifestResponse.ok) {
    throw new Error(
      `Failed to load the events manifest (${manifestResponse.status})`
    );
  }

  const historicalData =
    await historicalDataResponse.json();

  const manifest =
    await manifestResponse.json();


  // ----------------------------------------------------------
  // ÉVÉNEMENTS
  // ----------------------------------------------------------

  const eventResponses =
    await Promise.all(
      manifest.files.map(async (file) => {

        const response =
          await fetch(`data/events/${file}`);

        if (!response.ok) {
          throw new Error(
            `Failed to load data/events/${file} (${response.status})`
          );
        }

        return response.json();
      })
    );


  // ----------------------------------------------------------
  // NORMALISATION DU NOUVEAU DATASET
  // ----------------------------------------------------------
  //
  // Le nouveau JSON est organisé par nom :
  //
  // {
  //   names: {
  //     "Rome": {...},
  //     "Byzance": {...}
  //   }
  // }
  //
  // On transforme simplement l'objet en tableau pour
  // faciliter l'utilisation dans les panneaux.
  //

  const historicalNames =
    historicalData?.names &&
    typeof historicalData.names === "object"
      ? Object.entries(historicalData.names).map(
          ([name, data]) => ({
            name,
            ...data
          })
        )
      : [];


  return {
    historicalData,
    historicalNames,
    events: eventResponses
  };
}


// ============================================================
// SNAPSHOT ÉDITORIAL
// ============================================================
//
// Les régions utilisent :
//
// {
//   from: 700,
//   to: 1185,
//   ...
// }
//
// et non "year".
//
// On cherche donc d'abord le snapshot qui contient
// directement l'année.
//
// Exemple :
//
// 700 <= 1000 < 1185
//
// => snapshot actif
//

export function activeSnapshot(region, year) {
  if (!region?.snapshots || !Array.isArray(region.snapshots)) {
    return null;
  }

  const snapshots = [...region.snapshots].sort(
    (a, b) => (a.from ?? -Infinity) - (b.from ?? -Infinity)
  );

  // Snapshot contenant explicitement l'année.
  const containing = snapshots.find((snapshot) => {
    const from = snapshot.from ?? -Infinity;
    const to = snapshot.to ?? Infinity;

    return year >= from && year < to;
  });

  if (containing) {
    return containing;
  }

  // Si aucune période ne correspond :
  // dernier snapshot commencé avant l'année.
  let active = null;

  for (const snapshot of snapshots) {
    if ((snapshot.from ?? -Infinity) <= year) {
      active = snapshot;
    } else {
      break;
    }
  }

  // Si l'année est avant le premier snapshot,
  // on utilise le premier.
  return active || snapshots[0];
}


// ============================================================
// HISTORICAL BASEMAPS
// ============================================================

const HISTORICAL_BASE_URL =
  "https://raw.githubusercontent.com/aourednik/historical-basemaps/master";

let historicalIndex = null;

const historicalGeoJSONCache = new Map();


// ------------------------------------------------------------
// Charge index.json
// ------------------------------------------------------------

export async function loadHistoricalIndex() {
  if (historicalIndex) {
    return historicalIndex;
  }

  const response = await fetch(
    `${HISTORICAL_BASE_URL}/index.json`
  );

  if (!response.ok) {
    throw new Error(
      `Failed to load the historical index (${response.status})`
    );
  }

  const data = await response.json();

  if (!Array.isArray(data.years)) {
    throw new Error(
      "Invalid historical index.json: missing 'years' property"
    );
  }

  historicalIndex = data.years
    .filter(
      (entry) =>
        Number.isFinite(entry.year) &&
        typeof entry.filename === "string"
    )
    .sort((a, b) => a.year - b.year);

  return historicalIndex;
}


// ------------------------------------------------------------
// Trouve le snapshot historique précédent
// ------------------------------------------------------------
//
// Exemple :
//
// 1000 -> world_1000.geojson
// 1001 -> world_1000.geojson
// 1050 -> world_1000.geojson
// 1100 -> world_1100.geojson
//
// On utilise volontairement le snapshot précédent.
// ------------------------------------------------------------

export function findHistoricalSnapshot(year, index) {
  if (!index?.length) {
    return null;
  }

  let previous = null;

  for (const snapshot of index) {
    if (snapshot.year === year) {
      return snapshot;
    }

    if (snapshot.year > year) {
      break;
    }

    previous = snapshot;
  }

  // Année avant le premier snapshot.
  if (!previous) {
    return index[0];
  }

  return previous;
}


// ------------------------------------------------------------
// Charge un GeoJSON historique
// ------------------------------------------------------------

export async function loadHistoricalGeoJSON(year) {
  const index = await loadHistoricalIndex();

  const snapshot = findHistoricalSnapshot(year, index);

  if (!snapshot) {
    throw new Error(
      `No historical snapshot available for ${year}`
    );
  }

  const cacheKey = snapshot.filename;

  // Cache mémoire.
  if (historicalGeoJSONCache.has(cacheKey)) {
    return {
      ...snapshot,
      geojson: historicalGeoJSONCache.get(cacheKey)
    };
  }

  const response = await fetch(
    `${HISTORICAL_BASE_URL}/geojson/${snapshot.filename}`
  );

  if (!response.ok) {
    throw new Error(
      `Failed to load ${snapshot.filename} (${response.status})`
    );
  }

  const geojson = await response.json();

  historicalGeoJSONCache.set(
    cacheKey,
    geojson
  );

  return {
    ...snapshot,
    geojson
  };
}
