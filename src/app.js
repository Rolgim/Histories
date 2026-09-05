import {
  loadData,
  activeSnapshot,
  loadHistoricalIndex,
  loadHistoricalGeoJSON
} from "./data.js";

import {
  getDeterministicColor,
  escapeHtml
} from "./utils.js";

import { createTheme, dominantValue } from "./theme.js";
import { createPanel } from "./panel.js";
import { createTimeline } from "./timeline.js";
import { createThemeSwitcher } from "./theme-switcher.js";


// ============================================================
// CARTE
// ============================================================

const worldBounds = L.latLngBounds(
  L.latLng(-90, -180),
  L.latLng(90, 180)
);

const map = L.map("map", {
  center: [30, 0],
  zoom: 2,
  minZoom: 2,
  maxZoom: 10,
  zoomControl: true,
  maxBounds: worldBounds,
  maxBoundsViscosity: 1.0
});

map.scrollWheelZoom.disable();


// ============================================================
// FOND DE CARTE
// ============================================================

L.tileLayer(
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  {
    attribution: "Fond de carte © OpenStreetMap",
    opacity: 0.4,
    noWrap: true,
    bounds: worldBounds
  }
).addTo(map);


// ============================================================
// LAYERS
// ============================================================

let regionsLayer = null;
let eventsLayer = null;


// ============================================================
// HISTORICAL BASEMAP
// ============================================================

let historicalIndex = null;

let displayedHistoricalFilename = null;

let historicalRequestId = 0;


// ============================================================
// MAIN
// ============================================================

async function main() {

  const {
    historicalData,
    historicalNames,
    events
  } = await loadData();


  historicalIndex =
    await loadHistoricalIndex();


  console.log(
    "Entités historiques enrichies :",
    historicalNames.length
  );

  console.log(
    "Snapshots historiques disponibles :",
    historicalIndex.length
  );


  const Theme =
    createTheme(
      historicalNames,
      events
    );


  const activeSnapshotFunc =
    activeSnapshot;


  // ==========================================================
  // PANEL
  // ==========================================================

  const Panel =
    createPanel({

      HISTORICAL_DATA:
        historicalData,

      HISTORICAL_NAMES:
        historicalNames,

      EVENTS:
        events,

      Theme,

      MapRenderer: {

        setSelectedEvent: (eventIdx) => {

          if (!eventsLayer) {
            return;
          }

          eventsLayer.eachLayer((layer) => {

            const isSelected =
              layer.options.eventIndex === eventIdx;

            layer.setStyle({

              radius:
                eventIdx === null
                  ? 5
                  : isSelected
                    ? 8
                    : 5,

              fillOpacity:
                eventIdx === null
                  ? 0.3
                  : isSelected
                    ? 1
                    : 0.8,

              color:
                isSelected
                  ? "#7a2e1f"
                  : "#3a2c1a",

              weight:
                isSelected
                  ? 3
                  : 1
            });

          });
        },

        get year() {

          const slider =
            document.getElementById(
              "year-slider"
            );

          return slider
            ? parseInt(slider.value, 10)
            : 1000;
        }

      },

      activeSnapshot:
        activeSnapshotFunc

    });


  // ==========================================================
  // SÉLECTEUR DE MODE (territoire / religion / langue / ethnie)
  // ==========================================================

  const ThemeSwitcher =
    createThemeSwitcher({

      Theme,

      Panel,

      MapRenderer: {

        get year() {

          const slider =
            document.getElementById("year-slider");

          return slider
            ? parseInt(slider.value, 10)
            : 1000;
        },

        refresh: () => {

          const slider =
            document.getElementById("year-slider");

          const year =
            slider
              ? parseInt(slider.value, 10)
              : 1000;

          updateMapForYear(
            year,
            historicalNames,
            events,
            Theme,
            activeSnapshotFunc,
            Panel
          );
        },

        // Légende du mode "territoire" : dérivée des polygones
        // actuellement affichés (sujet -> couleur déterministe).
        getHistoricalLegend: () => {

          if (!regionsLayer) {
            return [];
          }

          const seen = new Map();

          regionsLayer.eachLayer((layer) => {

            const props = layer.feature?.properties || {};

            const subject =
              cleanValue(props.SUBJECTO) ||
              cleanValue(props.NAME) ||
              "Unknown";

            if (subject === "Unknown" || seen.has(subject)) {
              return;
            }

            seen.set(
              subject,
              getDeterministicColor(subject)
            );
          });

          return [...seen.entries()]
            .map(([value, color]) => ({ value, color }))
            .sort((a, b) => a.value.localeCompare(b.value));
        }

      }

    });


  // ==========================================================
  // TIMELINE
  // ==========================================================

  const Timeline =
    createTimeline({

      MapRenderer: {

        setYear: (year) => {

          const slider =
            document.getElementById(
              "year-slider"
            );

          if (slider) {
            slider.value = year;
          }

          updateMapForYear(
            year,
            historicalNames,
            events,
            Theme,
            activeSnapshotFunc,
            Panel
          );
        },

        get year() {

          const slider =
            document.getElementById(
              "year-slider"
            );

          return slider
            ? parseInt(slider.value, 10)
            : 1000;
        },

        refresh: () => {

          const slider =
            document.getElementById(
              "year-slider"
            );

          const year =
            slider
              ? parseInt(slider.value, 10)
              : 1000;

          updateMapForYear(
            year,
            historicalNames,
            events,
            Theme,
            activeSnapshotFunc,
            Panel
          );
        }

      },

      Panel

    });


  // ==========================================================
  // LAYERS
  // ==========================================================

  await initGeoJSONLayers(
    historicalNames,
    events,
    Theme,
    Panel,
    activeSnapshotFunc
  );


  ThemeSwitcher.init();

  Timeline.init();
}


// ============================================================
// INITIALISATION DES LAYERS
// ============================================================

async function initGeoJSONLayers(
  historicalNames,
  events,
  Theme,
  Panel,
  activeSnapshot
) {

  const currentYear =
    parseInt(
      document.getElementById("year-slider")?.value,
      10
    ) || 1000;


  // ==========================================================
  // FRONTIÈRES HISTORIQUES
  // ==========================================================

  // IMPORTANT :
  // C'était ici l'erreur :
  //
  // await updateHistoricalBorders(year, ...)
  //
  // "year" n'existe pas dans cette fonction.
  //
  // On utilise currentYear.
  //

  await updateHistoricalBorders(
    currentYear,
    Theme,
    historicalNames,
    Panel
  );


  // ==========================================================
  // ÉVÉNEMENTS
  // ==========================================================

  const eventsGeoJSON = {
    type: "FeatureCollection",

    features: events
      .map((event, index) => {

        const lat =
          parseFloat(event.lat);

        const lon =
          parseFloat(event.lon);

        if (
          !Number.isFinite(lat) ||
          !Number.isFinite(lon)
        ) {
          console.warn(
            "Événement ignoré : coordonnées invalides",
            event
          );

          return null;
        }

        return {

          type: "Feature",

          properties: {

            id:
              `event-${index}`,

            eventIndex:
              index,

            title:
              event.title,

            year:
              event.year,

            // Conservé pour compatibilité
            regionId:
              event.regionId,

            // Éventuellement utilisé par le nouveau panel
            historicalName:
              event.historicalName,

            historicalNames:
              event.historicalNames,

            ...event
          },

          geometry: {

            type: "Point",

            coordinates: [
              lon,
              lat
            ]
          }

        };

      })
      .filter(Boolean)
  };


  eventsLayer =
    L.geoJSON(
      eventsGeoJSON,
      {

        pointToLayer: (
          feature,
          latlng
        ) => {

          return L.circleMarker(
            latlng,
            {

              radius: 5,

              fillColor:
                Theme.colorFor(
                  Theme.current,
                  feature.properties[
                    Theme.current
                  ] || "#fff"
                ),

              color:
                "#3a2c1a",

              weight: 1,

              fillOpacity: 0.3,

              eventIndex:
                feature.properties.eventIndex

            }
          );
        },


        onEachFeature: (
          feature,
          layer
        ) => {

          layer.on(
            "click",
            (e) => {

              e.originalEvent?.stopPropagation();

              Panel.showEvent(
                feature.properties.eventIndex,
                null
              );

            }
          );

        }

      }
    )
    .addTo(map);


  // ==========================================================
  // PREMIÈRE MISE À JOUR
  // ==========================================================

  await updateMapForYear(
    currentYear,
    historicalNames,
    events,
    Theme,
    activeSnapshot,
    Panel
  );
}


// ============================================================
// FRONTIÈRES HISTORIQUES
// ============================================================

async function updateHistoricalBorders(
  year,
  Theme,
  historicalNames,
  Panel
) {

  const requestId =
    ++historicalRequestId;


  try {

    const historical =
      await loadHistoricalGeoJSON(year);


    if (
      requestId !== historicalRequestId
    ) {
      return;
    }


    // --------------------------------------------------------
    // Le snapshot demandé est le même que celui affiché.
    // --------------------------------------------------------

    if (
      displayedHistoricalFilename ===
      historical.filename
    ) {

      updateHistoricalBorderStyles(
        Theme,
        historicalNames
      );

      return;
    }


    // --------------------------------------------------------
    // Supprime l'ancien layer.
    // --------------------------------------------------------

    if (regionsLayer) {

      map.removeLayer(
        regionsLayer
      );

      regionsLayer = null;
    }


    // --------------------------------------------------------
    // Crée le nouveau layer.
    // --------------------------------------------------------

    regionsLayer =
      L.geoJSON(
        historical.geojson,
        {

          style: (feature) => {

            return historicalBorderStyle(
              feature,
              Theme,
              historicalNames
            );
          },


          onEachFeature: (
            feature,
            layer
          ) => {

            setupHistoricalFeature(
              feature,
              layer,
              historicalNames,
              Panel
            );

          }

        }
      );


    regionsLayer.addTo(map);


    displayedHistoricalFilename =
      historical.filename;


    // Les événements restent au-dessus.
    if (eventsLayer) {
      eventsLayer.bringToFront();
    }


    console.log(
      `Carte historique : ${historical.year} → ${historical.filename}`
    );

  }
  catch (error) {

    console.error(
      `Erreur de chargement de la carte historique pour ${year}`,
      error
    );

  }
}


// ============================================================
// STYLE DES FRONTIÈRES
// ============================================================

function historicalBorderStyle(
  feature,
  Theme,
  historicalNames
) {

  const props =
    feature?.properties || {};


  const precision =
    Number(
      props.BORDERPRECISION
    ) || 2;


  // ==========================================================
  // MODE TERRITOIRE
  // ==========================================================

  if (
    Theme.current === "territory"
  ) {

    const subject =
      cleanValue(
        props.SUBJECTO
      ) ||
      cleanValue(
        props.NAME
      ) ||
      "Unknown";


    const isUnknown =
      subject === "Unknown";


    const fillOpacity =
      isUnknown
        ? 0
        : precision === 3
          ? 0.38
          : precision === 2
            ? 0.30
            : 0.22;


    return {

      fillColor:
        isUnknown
          ? "transparent"
          : getDeterministicColor(
              subject
            ),

      fillOpacity,

      color:
        precision === 3
          ? "#3a2c1a"
          : "#6b5a45",

      weight:
        precision === 3
          ? 1
          : 0.7,

      opacity:
        precision === 3
          ? 0.9
          : 0.55
    };
  }


  // ==========================================================
  // AUTRES MODES (religion / langue / ethnie)
  // ==========================================================
  //
  // On colore par la valeur DOMINANTE (première valeur Wikidata) de
  // l'entité enrichie correspondante. Le détail complet (toutes les
  // valeurs) reste consultable dans le panneau au clic. Les valeurs
  // hors du "top N" sont regroupées visuellement sous une même teinte
  // grise ("Autres"), voir theme.js.
  // ==========================================================

  const subjectForLookup =
    cleanValue(props.SUBJECTO) ||
    cleanValue(props.NAME) ||
    "";

  const entity =
    subjectForLookup
      ? findHistoricalEntity(
          cleanValue(props.NAME),
          cleanValue(props.SUBJECTO),
          historicalNames || []
        )
      : null;

  const dominant =
    entity
      ? dominantValue(entity, Theme.current)
      : null;

  const fillColor =
    dominant
      ? Theme.colorFor(Theme.current, dominant)
      : "transparent";

  return {

    fillColor,

    fillOpacity:
      dominant ? 0.32 : 0,

    color:
      "#6b5a45",

    weight:
      precision === 3
        ? 1
        : 0.7,

    opacity:
      precision === 3
        ? 0.75
        : 0.45
  };
}


// ============================================================
// MET À JOUR LES STYLES
// ============================================================

function updateHistoricalBorderStyles(
  Theme,
  historicalNames
) {

  if (!regionsLayer) {
    return;
  }

  regionsLayer.eachLayer(
    (layer) => {

      if (!layer.feature) {
        return;
      }

      layer.setStyle(
        historicalBorderStyle(
          layer.feature,
          Theme,
          historicalNames
        )
      );

    }
  );
}


// ============================================================
// INTERACTION FRONTIÈRE HISTORIQUE
// ============================================================

function setupHistoricalFeature(
  feature,
  layer,
  historicalNames,
  Panel
) {

  const props =
    feature?.properties || {};


  const name =
    cleanValue(
      props.NAME
    ) ||
    "Unknown";


  const subject =
    cleanValue(
      props.SUBJECTO
    );


  const partOf =
    cleanValue(
      props.PARTOF
    );


  let html =
    `<strong>${escapeHtml(name)}</strong>`;


  if (
    subject &&
    subject !== name
  ) {

    html +=
      `<br>${escapeHtml(subject)}`;
  }


  if (partOf) {

    html +=
      `<br><small>${escapeHtml(partOf)}</small>`;
  }


  layer.bindTooltip(
    html,
    {
      sticky: true,
      direction: "top"
    }
  );


  // ----------------------------------------------------------
  // CLIC
  // ----------------------------------------------------------

  layer.on("click", (e) => {

    e.originalEvent?.stopPropagation();


    const entity =
      findHistoricalEntity(
        name,
        subject,
        historicalNames
      );


    Panel.showTerritoryInfo({

      name,

      subject,

      partOf,

      historicalEntity:
        entity || null

    });

  });
}


// ============================================================
// NORMALISATION
// ============================================================

function normalizeForMatch(value) {

  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /[^a-z0-9]+/g,
      " "
    )
    .trim();
}


// ============================================================
// CORRESPONDANCE AOURednik <-> NOUVEAU DATASET
// ============================================================

function findHistoricalEntity(
  name,
  subject,
  historicalNames
) {

  if (
    !Array.isArray(historicalNames)
  ) {
    return null;
  }


  const candidates = [
    name,
    subject
  ]
    .map(normalizeForMatch)
    .filter(Boolean);


  if (!candidates.length) {
    return null;
  }


  for (
    const entity of historicalNames
  ) {

    const names = [

      entity.name,

      ...(Array.isArray(entity.variants)
        ? entity.variants
        : [])

    ]
      .map(normalizeForMatch)
      .filter(Boolean);


    if (
      names.some(
        (candidateName) =>
          candidates.includes(
            candidateName
          )
      )
    ) {

      return entity;
    }

  }


  return null;
}


// ============================================================
// UPDATE GLOBAL
// ============================================================

async function updateMapForYear(
  year,
  historicalNames,
  events,
  Theme,
  activeSnapshot,
  Panel
) {

  // ----------------------------------------------------------
  // 1. FRONTIÈRES
  // ----------------------------------------------------------

  await updateHistoricalBorders(
    year,
    Theme,
    historicalNames,
    Panel
  );


  // ----------------------------------------------------------
  // 2. ÉVÉNEMENTS
  // ----------------------------------------------------------

  if (eventsLayer) {

    eventsLayer.eachLayer(
      (layer) => {

        const eventIndex =
          layer.options.eventIndex;

        const event =
          events[eventIndex];


        if (!event) {
          return;
        }


        const visible =
          Number(event.year) <=
          Number(year);


        layer.setStyle({

          fillOpacity:
            visible
              ? 0.3
              : 0,

          opacity:
            visible
              ? 1
              : 0,

          weight:
            visible
              ? 1
              : 0

        });


        if (visible) {

          if (
            year - event.year <= 30
          ) {

            layer.setRadius(8);

          }
          else {

            layer.setRadius(5);

          }

        }
        else {

          layer.setRadius(0);

          layer.closePopup();

        }

      }
    );
  }


  // ----------------------------------------------------------
  // 3. COULEURS
  // ----------------------------------------------------------

  updateEventStyles(
    events,
    Theme
  );
}


// ============================================================
// ÉVÉNEMENTS : COULEURS
// ============================================================

function updateEventStyles(
  events,
  Theme
) {

  if (!eventsLayer) {
    return;
  }


  eventsLayer.eachLayer(
    (layer) => {

      const eventIndex =
        layer.options.eventIndex;

      const event =
        events[eventIndex];


      if (!event) {
        return;
      }


      const value =
        event[Theme.current] ||
        "#fff";


      layer.setStyle({

        fillColor:
          Theme.colorFor(
            Theme.current,
            value
          )

      });

    }
  );
}


// ============================================================
// UTILITAIRE
// ============================================================

function cleanValue(value) {

  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value).trim();
}


// ============================================================
// START
// ============================================================

main().catch(
  (error) => {

    console.error(error);

    const hint =
      document.getElementById(
        "empty-hint"
      );

    if (hint) {

      hint.textContent =
        "Erreur de chargement des données. Utilisez un serveur local.";

    }

  }
);