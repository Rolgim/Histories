function cleanSourceText(value) {

  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value)

    // Supprime les balises HTML éventuelles
    .replace(
      /<[^>]*>/g,
      " "
    )

    // Entités HTML courantes
    .replace(
      /&nbsp;/gi,
      " "
    )

    .replace(
      /&amp;/gi,
      "&"
    )

    .replace(
      /&quot;/gi,
      '"'
    )

    .replace(
      /&#039;/gi,
      "'"
    )

    // Espaces multiples
    .replace(
      /\s+/g,
      " "
    )

    .trim();
}


export function createPanel({
  HISTORICAL_DATA,
  HISTORICAL_NAMES,
  EVENTS,
  Theme,
  MapRenderer,
  activeSnapshot
}) {

  const panel =
    document.getElementById("panel");

  const body =
    document.getElementById("panel-body");

  const closeBtn =
    document.getElementById("panel-close");

  const backBtn =
    document.getElementById("panel-back");

  const emptyHint =
    document.getElementById("empty-hint");


  let lastContext = null;


  // ==========================================================
  // UTILITAIRES HTML
  // ==========================================================

  function escapeHTML(value) {

    if (
      value === null ||
      value === undefined
    ) {
      return "";
    }

    return String(value)
      .replace(
        /&/g,
        "&amp;"
      )
      .replace(
        /</g,
        "&lt;"
      )
      .replace(
        />/g,
        "&gt;"
      )
      .replace(
        /"/g,
        "&quot;"
      )
      .replace(
        /'/g,
        "&#039;"
      );
  }


  // ==========================================================
  // NORMALISATION
  // ==========================================================

  function normalizeForMatch(
    value
  ) {

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


  // ==========================================================
  // NORMALISATION TABLEAU
  // ==========================================================

  function asArray(value) {

    if (
      value === null ||
      value === undefined
    ) {
      return [];
    }

    return Array.isArray(value)
      ? value
      : [value];
  }


  // ==========================================================
  // TAGS D'ÉVÉNEMENTS
  // ==========================================================

  function tagsHTML(obj) {

    return [
      "territory",
      "religion",
      "language",
      "ethnicity"
    ]

      .map((key) => {

        if (
          !obj ||
          !obj[key]
        ) {
          return "";
        }

        return `
          <span class="tag${
            key === Theme.current
              ? " tag-active"
              : ""
          }">
            ${escapeHTML(
              cleanSourceText(
                obj[key]
              )
            )}
          </span>
        `;

      })

      .join("");
  }


  // ==========================================================
  // OUVERTURE
  // ==========================================================

  function open() {

    panel.classList.add(
      "open"
    );

    if (emptyHint) {

      emptyHint.style.display =
        "none";
    }
  }


  // ==========================================================
  // FERMETURE
  // ==========================================================

  function close() {

    panel.classList.remove(
      "open"
    );

    if (emptyHint) {

      emptyHint.style.display =
        "block";
    }

    MapRenderer.setSelectedEvent(
      null
    );

    lastContext = null;
  }


  // ==========================================================
  // LABEL D'UNE ENTITÉ
  // ==========================================================

  function entityLabel(
    entity
  ) {

    if (!entity) {
      return "";
    }


    if (
      typeof entity ===
      "string"
    ) {

      return cleanSourceText(
        entity
      );
    }


    return cleanSourceText(

      entity.label ||
      entity.name ||
      entity.id ||
      ""

    );
  }


  // ==========================================================
  // LIEN D'UNE ENTITÉ
  // ==========================================================

  function entityLink(
    entity
  ) {

    if (!entity) {
      return "";
    }


    if (
      typeof entity ===
      "string"
    ) {
      return "";
    }


    if (
      entity.url &&
      typeof entity.url ===
        "string"
    ) {

      return entity.url;
    }


    if (
      entity.id &&
      /^Q\d+$/.test(
        entity.id
      )
    ) {

      return (
        "https://www.wikidata.org/wiki/" +
        entity.id
      );
    }


    return "";
  }


  // ==========================================================
  // HTML D'UNE ENTITÉ
  // ==========================================================

  function entityHTML(
    entity
  ) {

    if (!entity) {
      return "";
    }


    const label =
      entityLabel(entity);


    if (!label) {
      return "";
    }


    const url =
      entityLink(entity);


    const content =
      escapeHTML(label);


    if (url) {

      return `
        <a
          href="${escapeHTML(url)}"
          target="_blank"
          rel="noopener noreferrer"
        >
          ${content}
        </a>
      `;
    }


    return content;
  }


  // ==========================================================
  // LISTE D'ENTITÉS
  // ==========================================================

  function entitiesHTML(
    values
  ) {

    const list =
      asArray(values)
        .filter(Boolean);


    if (!list.length) {
      return "";
    }


    return list
      .map((value) => {

        const content =
          entityHTML(value);


        if (!content) {
          return "";
        }


        return `
          <span class="tag">
            ${content}
          </span>
        `;

      })
      .join("");
  }


  // ==========================================================
  // BLOC SOURCE
  // ==========================================================

  function sourceBlockHTML(
    label,
    entity
  ) {

    if (!entity) {
      return "";
    }


    const title =
      cleanSourceText(

        entity.label ||
        entity.name ||
        entity.id ||
        ""

      );


    let description =
      cleanSourceText(
        entity.description ||
        ""
      );


    if (
      !title &&
      !description
    ) {
      return "";
    }


    return `

      <div
        class="panel-source"
        style="
          margin-bottom:14px;
        "
      >

        <div
          style="
            font-size:11px;
            text-transform:uppercase;
            letter-spacing:.4px;
            color:var(--ink-soft);
            margin-bottom:4px;
          "
        >
          ${escapeHTML(label)}
        </div>


        ${
          title
            ? `
              <div
                style="
                  font-size:15px;
                  font-weight:600;
                "
              >
                ${escapeHTML(title)}
              </div>
            `
            : ""
        }


        ${
          description
            ? `
              <div
                style="
                  font-size:13px;
                  margin-top:4px;
                  line-height:1.4;
                "
              >
                ${escapeHTML(
                  description
                )}
              </div>
            `
            : ""
        }

      </div>

    `;
  }


  // ==========================================================
  // CHAMP WIKIDATA
  // ==========================================================

  function wikidataFieldHTML(
    label,
    value
  ) {

    if (!value) {
      return "";
    }


    const values =
      asArray(value)
        .filter(Boolean);


    if (!values.length) {
      return "";
    }


    const content =
      values
        .map(
          (item) =>
            entityHTML(item)
        )
        .filter(Boolean);


    if (!content.length) {
      return "";
    }


    return `

      <div
        class="panel-field"
      >

        <strong>
          ${escapeHTML(label)}
        </strong>

        <div>
          ${content
            .map(
              (item) => `
                <span class="tag">
                  ${item}
                </span>
              `
            )
            .join("")}
        </div>

      </div>

    `;
  }


  // ==========================================================
  // WIKIDATA
  // ==========================================================

  function wikidataHTML(
    wikidata
  ) {

    if (!wikidata) {
      return "";
    }


    let html = "";


    // --------------------------------------------------------
    // Religion
    // --------------------------------------------------------

    html +=
      wikidataFieldHTML(
        "Religions",
        wikidata.religion
      );


    // --------------------------------------------------------
    // Langues officielles
    // --------------------------------------------------------

    html +=
      wikidataFieldHTML(
        "Official languages",
        wikidata.official_languages
      );


    // --------------------------------------------------------
    // Langues
    // --------------------------------------------------------

    html +=
      wikidataFieldHTML(
        "Languages",
        wikidata.languages
      );


    // --------------------------------------------------------
    // Ethnies
    // --------------------------------------------------------

    html +=
      wikidataFieldHTML(
        "Ethnic groups",
        wikidata.ethnic_groups
      );


    return html;
  }


  // ==========================================================
  // DONNÉES HISTORIQUES
  // ==========================================================

  function historicalDataHTML(
    entity
  ) {

    if (!entity) {

      return `

        <p
          style="
            font-style:italic;
            font-size:13px;
          "
        >
          No enriched historical data is
          associated with this territory.
        </p>

      `;
    }


    let html = "";


    // --------------------------------------------------------
    // Wikidata
    // --------------------------------------------------------

    html +=
      wikidataHTML(
        entity.wikidata
      );


    // --------------------------------------------------------
    // DBpedia
    // --------------------------------------------------------

    if (entity.dbpedia) {

      html +=
        sourceBlockHTML(
          "DBpedia",
          entity.dbpedia
        );
    }


    // --------------------------------------------------------
    // GeoNames
    // --------------------------------------------------------

    if (entity.geonames) {

      html +=
        sourceBlockHTML(
          "GeoNames",
          entity.geonames
        );
    }


    // --------------------------------------------------------
    // Pleiades
    // --------------------------------------------------------

    if (entity.pleiades) {

      html +=
        sourceBlockHTML(
          "Pleiades",
          entity.pleiades
        );
    }


    return html;
  }


  // ==========================================================
  // NOMS D'UNE ENTITÉ
  // ==========================================================

  function entityNames(
    entity
  ) {

    if (!entity) {
      return [];
    }


    return [

      entity.name,

      ...(Array.isArray(
        entity.variants
      )
        ? entity.variants
        : [])

    ]

      .filter(Boolean)

      .map(
        normalizeForMatch
      )

      .filter(Boolean);
  }


  // ==========================================================
  // TEST VALEUR D'ENTITÉ
  // ==========================================================

  function entityHasValue(
    value,
    targetValue
  ) {

    if (
      value === null ||
      value === undefined
    ) {
      return false;
    }


    const target =
      normalizeForMatch(
        targetValue
      );


    return asArray(value)
      .some((item) => {

        if (
          typeof item ===
          "string"
        ) {

          return (
            normalizeForMatch(
              item
            ) === target
          );
        }


        if (
          typeof item ===
          "object"
        ) {

          return [

            item.label,

            item.name,

            item.id

          ]
            .filter(Boolean)
            .some(
              (candidate) =>
                normalizeForMatch(
                  candidate
                ) === target
            );
        }


        return false;

      });
  }


  // ==========================================================
  // ÉVÉNEMENTS LIÉS À UNE ENTITÉ
  // ==========================================================

  function relatedEventsForEntity(
    entity
  ) {

    if (!entity) {
      return [];
    }


    const names =
      entityNames(entity);


    if (!names.length) {
      return [];
    }


    return EVENTS

      .map(
        (e, i) => ({
          e,
          i
        })
      )

      .filter(
        ({ e }) => {

          const eventNames = [

            // Nouveau système
            e.historicalName,

            ...(Array.isArray(
              e.historicalNames
            )
              ? e.historicalNames
              : []),

            // Compatibilité éventuelle
            e.regionId,

            e.region,

            e.territory,

            e.subject,

            e.name

          ]

            .filter(Boolean)

            .map(
              normalizeForMatch
            );


          return eventNames.some(
            (eventName) =>
              names.includes(
                eventName
              )
          );

        }
      )

      .sort(
        (a, b) =>
          Number(a.e.year) -
          Number(b.e.year)
      );
  }


  // ==========================================================
  // LISTE ÉVÉNEMENTS
  // ==========================================================

  function eventRowsHTML(
    related
  ) {

    if (!related.length) {

      return `
        <p
          style="
            font-size:13px;
            font-style:italic;
          "
        >
          No events have been recorded yet.
        </p>
      `;
    }


    return related

      .map(
        ({ e, i }) => {

          const future =
            Number(e.year) >
            Number(
              MapRenderer.year
            );


          return `

            <div
              class="event-row ${
                future
                  ? "future"
                  : ""
              }"
              data-i="${i}"
            >

              <div
                class="event-row-year"
              >
                An ${escapeHTML(
                  e.year
                )}
              </div>

              <div
                class="event-row-title"
              >
                ${escapeHTML(
                  e.title
                )}
              </div>

            </div>

          `;

        }
      )

      .join("");
  }


  // ==========================================================
  // BRANCHEMENT DES ÉVÉNEMENTS
  // ==========================================================

  function wireEventRows() {

    body
      .querySelectorAll(
        ".event-row"
      )
      .forEach(
        (row) => {

          row.addEventListener(
            "click",
            () => {

              const index =
                parseInt(
                  row.dataset.i,
                  10
                );


              showEvent(
                index,
                lastContext
              );

            }
          );

        }
      );
  }


  // ==========================================================
  // ÉVÉNEMENT
  // ==========================================================

  function showEvent(
    i,
    cameFromContext
  ) {

    const e =
      EVENTS[i];


    if (!e) {
      return;
    }


    if (cameFromContext) {

      lastContext =
        cameFromContext;
    }


    body.innerHTML = `

      <div id="panel-year">
        Year ${escapeHTML(
          e.year
        )}
      </div>


      <div id="panel-title">
        ${escapeHTML(
          e.title
        )}
      </div>


      <div id="panel-tags">
        ${tagsHTML(e)}
      </div>


      <div id="panel-desc">

        ${
          e.desc
            ? `
              <p>
                ${escapeHTML(
                  e.desc
                )}
              </p>
            `
            : ""
        }

      </div>

    `;


    backBtn.style.display =
      lastContext
        ? "block"
        : "none";


    open();


    MapRenderer.setSelectedEvent(
      i
    );
  }


  // ==========================================================
  // TERRITOIRE HISTORIQUE
  // ==========================================================

  function showTerritoryInfo({
    name,
    subject,
    partOf,
    historicalEntity
  }) {

    lastContext = {

      type:
        "territory",

      name,

      subject,

      partOf,

      historicalEntity:
        historicalEntity || null

    };


    const entity =
      historicalEntity || null;


    // ========================================================
    // PAS D'ENTITÉ ENRICHIE
    // ========================================================

    if (!entity) {

      body.innerHTML = `

        <div id="panel-year">
          Historical territory
        </div>


        <div id="panel-title">
          ${escapeHTML(
            name ||
            "Unknown"
          )}
        </div>


        ${
          subject &&
          subject !== name
            ? `
              <div id="panel-desc">

                <p>
                  ${escapeHTML(
                    subject
                  )}
                </p>

              </div>
            `
            : ""
        }


        ${
          partOf
            ? `
              <div
                style="
                  font-size:12px;
                  color:var(--ink-soft);
                  margin-bottom:14px;
                "
              >
                Affiliated with:
                ${escapeHTML(
                  partOf
                )}
              </div>
            `
            : ""
        }


        <div id="panel-desc">

          <p
            style="
              font-style:italic;
            "
          >
            No enriched historical data is
            associated with this territory.
          </p>

        </div>

      `;


      backBtn.style.display =
        "none";


      open();


      MapRenderer.setSelectedEvent(
        null
      );


      return;
    }


    // ========================================================
    // IDENTITÉ
    // ========================================================

    const displayName =
      cleanSourceText(
        entity.name
      ) ||
      cleanSourceText(
        name
      ) ||
      "Unknown";


    // ========================================================
    // ÉVÉNEMENTS
    // ========================================================

    const related =
      relatedEventsForEntity(
        entity
      );


    // ========================================================
    // OCCURRENCES
    // ========================================================

    const occurrenceCount =
      Array.isArray(
        entity.occurrences
      )
        ? entity.occurrences.length
        : Number(
            entity.occurrence_count
          ) || 0;


    // ========================================================
    // DESCRIPTION WIKIDATA
    // ========================================================

    const description =
      cleanSourceText(
        entity.wikidata?.description
      );


    // ========================================================
    // HTML
    // ========================================================

    body.innerHTML = `

      <div id="panel-year">
        Historical territory
      </div>


      <div id="panel-title">
        ${escapeHTML(
          displayName
        )}
      </div>


      ${
        subject &&
        subject !== name
          ? `
            <div
              style="
                font-size:14px;
                margin-bottom:6px;
              "
            >
              ${escapeHTML(
                subject
              )}
            </div>
          `
          : ""
      }


      ${
        partOf
          ? `
            <div
              style="
                font-size:12px;
                color:var(--ink-soft);
                margin-bottom:14px;
              "
            >
              Affiliated with:
              ${escapeHTML(
                partOf
              )}
            </div>
          `
          : ""
      }


      ${
        description
          ? `
            <div
              id="panel-desc"
            >
              <p>
                ${escapeHTML(
                  description
                )}
              </p>
            </div>
          `
          : ""
      }


      ${
        occurrenceCount
          ? `
            <div
              style="
                margin-bottom:14px;
              "
            >

              <div
                style="
                  font-size:11px;
                  text-transform:uppercase;
                  letter-spacing:.4px;
                  color:var(--ink-soft);
                  margin:6px 0 4px;
                "
              >
                Historical occurrences
              </div>

              <div
                style="
                  font-size:13px;
                "
              >
                ${escapeHTML(
                  occurrenceCount
                )}
                occurrence${
                  occurrenceCount > 1
                    ? "s"
                    : ""
                }
              </div>

            </div>
          `
          : ""
      }


      <div id="panel-desc">

        ${historicalDataHTML(
          entity
        )}

      </div>


      <div
        style="
          font-size:11px;
          text-transform:uppercase;
          letter-spacing:.4px;
          color:var(--ink-soft);
          margin:14px 0 4px;
        "
      >
        Related events
      </div>


      ${eventRowsHTML(
        related
      )}

    `;


    wireEventRows();


    backBtn.style.display =
      "none";


    open();


    MapRenderer.setSelectedEvent(
      null
    );
  }


  // ==========================================================
  // GROUPE
  // ==========================================================

  function showGroup(
    mode,
    value
  ) {

    lastContext = {

      type:
        "group",

      mode,

      value

    };


    const year =
      MapRenderer.year;


    // --------------------------------------------------------
    // Entités appartenant au groupe
    // --------------------------------------------------------

    const memberEntities =
      HISTORICAL_NAMES.filter(
        (entity) => {

          const wikidata =
            entity?.wikidata;


          if (!wikidata) {
            return false;
          }


          switch (mode) {

            case "religion":

              return entityHasValue(
                wikidata.religion,
                value
              );


            case "language":

              return (
                entityHasValue(
                  wikidata.official_languages,
                  value
                ) ||
                entityHasValue(
                  wikidata.languages,
                  value
                )
              );


            case "ethnicity":

              return entityHasValue(
                wikidata.ethnic_groups,
                value
              );


            default:

              return false;
          }

        }
      );


    // --------------------------------------------------------
    // Événements du groupe
    // --------------------------------------------------------

    const related =
      EVENTS

        .map(
          (e, i) => ({
            e,
            i
          })
        )

        .filter(
          ({ e }) => {

            const values = [

              e[mode],

              ...(Array.isArray(
                e[`${mode}s`]
              )
                ? e[`${mode}s`]
                : [])

            ]

              .filter(Boolean)

              .map(
                normalizeForMatch
              );


            return values.includes(
              normalizeForMatch(
                value
              )
            );
          }
        )

        .sort(
          (a, b) =>
            Number(a.e.year) -
            Number(b.e.year)
        );


    // --------------------------------------------------------
    // Libellé du mode
    // --------------------------------------------------------

    const modeDefinition =
      Theme.MODES?.find(
        (m) =>
          m.key === mode
      );


    const modeLabel =
      modeDefinition?.label ||
      mode;


    // --------------------------------------------------------
    // HTML
    // --------------------------------------------------------

    body.innerHTML = `

      <div id="panel-year">
        ${escapeHTML(
          modeLabel
        )}
      </div>


      <div id="panel-title">
        ${escapeHTML(
          value
        )}
      </div>


      <div id="panel-tags">

        ${memberEntities
          .map(
            (entity) => `

              <span class="tag">
                ${escapeHTML(
                  cleanSourceText(
                    entity.name
                  )
                )}
              </span>

            `
          )
          .join("")}

      </div>


      <div
        id="panel-desc"
        style="
          margin-bottom:14px;
        "
      >

        <p>

          ${memberEntities.length}

          entit${
            memberEntities.length > 1
              ? "ies"
              : "y"
          }

          associated with
          « ${escapeHTML(
            value
          )} ».

          <br>

          <small>
            Year ${escapeHTML(
              year
            )}
          </small>

        </p>

      </div>


      <div
        style="
          font-size:11px;
          text-transform:uppercase;
          letter-spacing:.4px;
          color:var(--ink-soft);
          margin:6px 0 4px;
        "
      >
        Related events
      </div>


      ${eventRowsHTML(
        related
      )}

    `;


    wireEventRows();


    backBtn.style.display =
      "none";


    open();


    MapRenderer.setSelectedEvent(
      null
    );
  }


  // ==========================================================
  // COMPATIBILITÉ showRegion()
  // ==========================================================

  function showRegion(
    regionId
  ) {

    const target =
      normalizeForMatch(
        regionId
      );


    const entity =
      HISTORICAL_NAMES.find(
        (item) => {

          const names =
            entityNames(
              item
            );


          return names.includes(
            target
          );

        }
      );


    if (!entity) {

      showTerritoryInfo({

        name:
          regionId,

        subject:
          "",

        partOf:
          "",

        historicalEntity:
          null

      });

      return;
    }


    showTerritoryInfo({

      name:
        entity.name,

      subject:
        "",

      partOf:
        "",

      historicalEntity:
        entity

    });
  }


  // ==========================================================
  // TERRITOIRE OU GROUPE
  // ==========================================================

  function showRegionOrGroup(
    regionId
  ) {

    if (
      Theme.current ===
      "territory"
    ) {

      showRegion(
        regionId
      );

      return;
    }


    showGroup(
      Theme.current,
      regionId
    );
  }


  // ==========================================================
  // BOUTON RETOUR
  // ==========================================================

  backBtn.addEventListener(
    "click",
    () => {

      if (!lastContext) {
        return;
      }


      // ------------------------------------------------------
      // Retour vers le territoire
      // ------------------------------------------------------

      if (
        lastContext.type ===
        "territory"
      ) {

        showTerritoryInfo(
          lastContext
        );

        return;
      }


      // ------------------------------------------------------
      // Retour vers le groupe
      // ------------------------------------------------------

      if (
        lastContext.type ===
        "group"
      ) {

        showGroup(

          lastContext.mode,

          lastContext.value

        );

      }

    }
  );


  // ==========================================================
  // BOUTON FERMER
  // ==========================================================

  closeBtn.addEventListener(
    "click",
    close
  );


  // ==========================================================
  // API PUBLIQUE
  // ==========================================================

  return {

    showEvent,

    showRegion,

    showGroup,

    showRegionOrGroup,

    showTerritoryInfo,

    close,


    refreshOpenPanel: () => {

      if (
        !panel.classList.contains(
          "open"
        )
      ) {
        return;
      }


      if (!lastContext) {
        return;
      }


      if (
        lastContext.type ===
        "territory"
      ) {

        showTerritoryInfo(
          lastContext
        );

      }
      else if (
        lastContext.type ===
        "group"
      ) {

        showGroup(

          lastContext.mode,

          lastContext.value

        );

      }

    }

  };
}