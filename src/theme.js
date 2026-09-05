import { getDeterministicColor } from "./utils.js";

const OTHER_COLOR = "hsl(30, 8%, 55%)"; // gris neutre pour "Autres"
const TOP_N = 8; // nombre de valeurs distinctes affichées dans la légende avant regroupement

// Champs wikidata associés à chaque mode (les entités enrichies ont plusieurs
// valeurs possibles par champ : on choisit la première comme valeur "dominante").
const WIKIDATA_FIELD = {
  religion: (e) => e?.wikidata?.religion,
  language: (e) =>
    e?.wikidata?.official_languages?.length
      ? e.wikidata.official_languages
      : e?.wikidata?.languages,
  ethnicity: (e) => e?.wikidata?.ethnic_groups
};

function valueLabel(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v.trim() || null;
  return v.label || v.name || v.id || null;
}

function valuesList(raw) {
  if (raw === null || raw === undefined) return [];
  const arr = Array.isArray(raw) ? raw : [raw];
  return arr.map(valueLabel).filter(Boolean);
}

// Valeur "dominante" d'une entité pour un mode donné : par convention,
// la première valeur listée par Wikidata (la plus notable / la mieux
// référencée). Le détail complet reste visible dans le panneau au clic.
export function dominantValue(entity, mode) {
  const getter = WIKIDATA_FIELD[mode];
  if (!getter) return null;
  return valuesList(getter(entity))[0] || null;
}

// Toutes les valeurs (pas seulement la dominante) — utilisé par le panneau
// pour afficher le détail complet, inchangé par rapport à avant.
export function allValuesOf(entity, mode) {
  const getter = WIKIDATA_FIELD[mode];
  if (!getter) return [];
  return valuesList(getter(entity));
}

export function createTheme(REGIONS, EVENTS) {
  if (!REGIONS || !EVENTS) {
    throw new Error("REGIONS and EVENTS must be defined to create the theme.");
  }

  const MODES = [
    { key: "territory", label: "Political entities" },
    { key: "religion", label: "Religions" },
    { key: "language", label: "Languages" },
    { key: "ethnicity", label: "Peoples / ethnicities" }
  ];

  let current = "territory";
  const colorCache = {};
  const topNCache = {};

  // ------------------------------------------------------------------
  // Fréquence des valeurs dominantes, tous modes wikidata confondus.
  // Les entités (REGIONS = historicalNames enrichies) ne sont pas
  // datées : on les compte globalement. Les EVENTS ont une année et un
  // champ à plat (event.religion, event.language, ...) : on peut les
  // filtrer par année si besoin.
  // ------------------------------------------------------------------
  function frequencies(mode, year) {
    const counts = new Map();

    if (mode === "territory") {
      return counts; // la légende "territoire" vient du GeoJSON historique, pas d'ici
    }

    REGIONS.forEach((entity) => {
      const v = dominantValue(entity, mode);
      if (v) counts.set(v, (counts.get(v) || 0) + 1);
    });

    EVENTS.forEach((e) => {
      if (year !== undefined && Number(e.year) > Number(year)) return;
      const v = e[mode];
      if (v) counts.set(v, (counts.get(v) || 0) + 1);
    });

    return counts;
  }

  // Top N valeurs (par fréquence) pour un mode, mémorisé par année.
  function topNValues(mode, year) {
    const cacheKey = `${mode}|${year ?? "all"}`;
    if (topNCache[cacheKey]) return topNCache[cacheKey];

    const counts = frequencies(mode, year);
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, TOP_N).map(([value]) => value);
    const otherCount = sorted.slice(TOP_N).reduce((s, [, c]) => s + c, 0);

    const result = { top, otherCount, counts };
    topNCache[cacheKey] = result;
    return result;
  }

  function colorFor(key, value) {
    if (key === "territory") {
      // Même logique déterministe que pour les polygones (utils.js),
      // pour que points d'événements et frontières restent cohérents.
      return value ? getDeterministicColor(value) : "transparent";
    }

    const { top } = topNValues(key);
    const idx = top.indexOf(value);

    if (idx === -1) {
      return OTHER_COLOR; // valeur hors du top N -> regroupée visuellement
    }

    const cacheKey = key + "|" + value;
    if (colorCache[cacheKey]) return colorCache[cacheKey];
    const hue = (idx * 137.508) % 360;
    const c = `hsl(${hue.toFixed(0)}, 55%, 52%)`;
    colorCache[cacheKey] = c;
    return c;
  }

  // Entrées de légende prêtes à afficher : top N + une entrée "Autres"
  // récapitulative si des valeurs ont été regroupées.
  function legendEntries(mode, year) {
    if (mode === "territory") return [];
    const { top, otherCount } = topNValues(mode, year);

    const entries = top.map((value) => ({
      value,
      color: colorFor(mode, value)
    }));

    if (otherCount > 0) {
      entries.push({
        value: `Autres (${otherCount})`,
        color: OTHER_COLOR,
        isOther: true
      });
    }

    return entries;
  }

  // Conservé pour compatibilité : liste brute des valeurs connues (non
  // limitée au top N), utile ailleurs si besoin d'un total exhaustif.
  function allValues(mode) {
    return [...frequencies(mode).keys()].sort();
  }

  const categories = {};
  MODES.forEach((m) => {
    categories[m.key] = m.key === "territory" ? [] : allValues(m.key);
  });

  return {
    MODES,
    categories,
    colorFor,
    legendEntries,
    dominantValue,
    get current() {
      return current;
    },
    set current(v) {
      current = v;
    }
  };
}
