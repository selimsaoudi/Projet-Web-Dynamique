async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${url}`);
  return await res.json();
}

function pct(x) {
  return x == null ? null : x * 100;
}

function fmtPct(v, decimals = 1) {
  return v == null ? "-" : `${v.toFixed(decimals)}%`;
}

function fmtEuro(v) {
  if (v == null) return "-";
  return Math.round(v).toLocaleString("fr-FR") + " EUR";
}

function fmtInt(v) {
  if (v == null) return "-";
  return Math.round(v).toLocaleString("fr-FR");
}

function renderTable(containerId, columns, rows) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const header = columns.map(c => `<th style="text-align:left;padding:6px 8px;">${c.label}</th>`).join("");
  const body = rows.map(r => {
    const cells = columns.map(c => {
      const val = typeof c.fmt === "function" ? c.fmt(r[c.key], r) : (r[c.key] ?? "-");
      return `<td style="padding:6px 8px; border-top:1px solid rgba(255,255,255,.08);">${val}</td>`;
    }).join("");
    return `<tr>${cells}</tr>`;
  }).join("");
  el.innerHTML = `
    <div style="overflow-x:auto;">
      <table style="border-collapse:collapse; width:100%; font-size:14px;">
        <thead><tr>${header}</tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>
  `;
}

/* ------------------ INDEX ------------------ */
async function renderIndex() {
  const data = await fetchJSON("/api/by_year");
  const sorted = data.filter(d => d.annee != null).sort((a, b) => a.annee - b.annee);

  const years = sorted.map(d => d.annee);
  const insertion = sorted.map(d => pct(d.taux_dinsertion_moy));
  const salaire = sorted.map(d => d.salaire_median);

  Plotly.newPlot(
    "chart_by_year_rates",
    [{ x: years, y: insertion, mode: "lines+markers", name: "Taux d'insertion (%)" }],
    {
      margin: { t: 20, l: 55, r: 20, b: 45 },
      xaxis: { title: "Annee" },
      yaxis: { title: "Pourcentage" },
      legend: { orientation: "h" }
    }
  );

  Plotly.newPlot(
    "chart_by_year_salary",
    [{ x: years, y: salaire, mode: "lines+markers", name: "Salaire net median (EUR/mois)" }],
    {
      margin: { t: 20, l: 55, r: 20, b: 45 },
      xaxis: { title: "Annee" },
      yaxis: { title: "Salaire net median" }
    }
  );
}

/* ------------------ DOMAINES ------------------ */
async function renderDomaines() {
  const raw = await fetchJSON("/api/by_domaine");

  const topN = 12;
  const byInsertion = [...raw].sort((a, b) => (b.taux_dinsertion_moy ?? 0) - (a.taux_dinsertion_moy ?? 0)).slice(0, topN);
  const bySalary = [...raw].sort((a, b) => (b.salaire_moyen ?? b.salaire_median ?? 0) - (a.salaire_moyen ?? a.salaire_median ?? 0)).slice(0, topN);

  Plotly.newPlot(
    "chart_domaines_insertion",
    [{
      x: byInsertion.slice().reverse().map(d => pct(d.taux_dinsertion_moy)),
      y: byInsertion.slice().reverse().map(d => d.domaine),
      type: "bar",
      orientation: "h",
      marker: {
        color: byInsertion.slice().reverse().map(d => d.salaire_moyen ?? d.salaire_median),
        colorscale: [
          [0, "#1f6feb"],
          [0.5, "#5fa8d3"],
          [1, "#f4a261"]
        ],
        colorbar: { title: "Salaire moyen (EUR)" },
        line: { width: 0.4, color: "rgba(255,255,255,.25)" }
      },
      hovertemplate:
        "<b>%{y}</b><br>" +
        "Insertion: %{x:.1f}%<br>" +
        "Salaire moyen: %{marker.color:.0f} EUR<br>" +
        "n: %{customdata}<extra></extra>",
      customdata: byInsertion.slice().reverse().map(d => fmtInt(d.n))
    }],
    {
      margin: { t: 20, l: 240, r: 40, b: 45 },
      xaxis: { title: "Taux d'insertion moyen (%)" },
      yaxis: { automargin: true }
    }
  );

  Plotly.newPlot(
    "chart_domaines_salary",
    [{
      x: bySalary.slice().reverse().map(d => d.salaire_moyen ?? d.salaire_median),
      y: bySalary.slice().reverse().map(d => d.domaine),
      type: "bar",
      orientation: "h",
      marker: {
        color: bySalary.slice().reverse().map(d => pct(d.taux_dinsertion_moy)),
        colorscale: [
          [0, "#1f6feb"],
          [0.5, "#5fa8d3"],
          [1, "#f4a261"]
        ],
        colorbar: { title: "Insertion (%)" },
        line: { width: 0.4, color: "rgba(255,255,255,.25)" }
      },
      hovertemplate:
        "<b>%{y}</b><br>" +
        "Salaire moyen: %{x:.0f} EUR<br>" +
        "Insertion: %{marker.color:.1f}%<br>" +
        "n: %{customdata}<extra></extra>",
      customdata: bySalary.slice().reverse().map(d => fmtInt(d.n))
    }],
    {
      margin: { t: 20, l: 240, r: 40, b: 45 },
      xaxis: { title: "Salaire moyen (EUR)" },
      yaxis: { automargin: true }
    }
  );

  renderTable("table_domaines", [
    { key: "domaine", label: "Domaine" },
    { key: "taux_dinsertion_moy", label: "Insertion", fmt: (v) => fmtPct((v ?? 0) * 100, 1) },
    { key: "salaire_moyen", label: "Salaire moyen", fmt: fmtEuro },
    { key: "salaire_median", label: "Salaire median", fmt: fmtEuro },
    { key: "n", label: "n", fmt: fmtInt }
  ], [...byInsertion]);
}

/* ------------------ ACADEMIES ------------------ */
async function renderAcademies() {
  const academies = await fetchJSON("/api/by_academie");
  const regions = await fetchJSON("/api/by_region");
  const geo = await fetchJSON("/static/geo/regions.geojson");

  Plotly.newPlot(
    "map_regions",
    [{
      type: "choropleth",
      geojson: geo,
      featureidkey: "properties.nom",
      locations: regions.map(r => r.region),
      z: regions.map(r => pct(r.taux_dinsertion_moy)),
      customdata: regions.map(r => [r.salaire_median, r.n]),
      colorbar: { title: "Insertion (%)" },
      hovertemplate:
        "<b>%{location}</b><br>" +
        "Insertion: %{z:.1f}%<br>" +
        "Salaire median: %{customdata[0]} EUR<br>" +
        "n: %{customdata[1]:.0f}" +
        "<extra></extra>"
    }],
    {
      margin: { t: 10, l: 10, r: 10, b: 10 },
      geo: { fitbounds: "locations", visible: false }
    }
  );

  const topN = 20;
  const sorted = [...academies].sort((a, b) => (b.taux_dinsertion_moy ?? 0) - (a.taux_dinsertion_moy ?? 0));
  const top = sorted.slice(0, topN);

  renderTable("table_academies", [
    { key: "academie", label: "Academie" },
    { key: "taux_dinsertion_moy", label: "Insertion", fmt: (v) => fmtPct((v ?? 0) * 100, 1) },
    { key: "salaire_median", label: "Salaire median", fmt: fmtEuro },
    { key: "n", label: "n", fmt: fmtInt }
  ], top);
}

/* ------------------ GENRE ------------------ */
async function renderGenre() {
  const byDomaine = await fetchJSON("/api/genre_by_domaine");
  const byYear = await fetchJSON("/api/genre_by_year");

  const topN = 12;
  const top = [...byDomaine].sort((a, b) => (b.taux_dinsertion_moy ?? 0) - (a.taux_dinsertion_moy ?? 0)).slice(0, topN);

  Plotly.newPlot(
    "chart_genre_domaine",
    [{
      x: top.slice().reverse().map(d => pct(d.taux_dinsertion_moy)),
      y: top.slice().reverse().map(d => d.domaine),
      type: "bar",
      orientation: "h",
      marker: {
        color: top.slice().reverse().map(d => pct(d.part_femmes)),
        colorscale: [
          [0, "#1f6feb"],
          [0.5, "#5fa8d3"],
          [1, "#f4a261"]
        ],
        colorbar: { title: "Part femmes (%)" },
        line: { width: 0.4, color: "rgba(255,255,255,.25)" }
      },
      hovertemplate:
        "<b>%{y}</b><br>" +
        "Insertion: %{x:.1f}%<br>" +
        "Part femmes: %{marker.color:.1f}%<br>" +
        "Salaire median: %{customdata[0]:.0f} EUR<br>" +
        "n: %{customdata[1]}<extra></extra>",
      customdata: top.slice().reverse().map(d => [d.salaire_median ?? 0, fmtInt(d.n)])
    }],
    {
      margin: { t: 20, l: 240, r: 40, b: 45 },
      xaxis: { title: "Taux d'insertion moyen (%)" },
      yaxis: { automargin: true }
    }
  );

  const yearsSorted = [...byYear].filter(d => d.annee != null).sort((a, b) => a.annee - b.annee);
  const years = yearsSorted.map(d => d.annee);
  const insertionSeries = yearsSorted.map(d => d.taux_dinsertion_moy != null ? pct(d.taux_dinsertion_moy) : null);
  const partFemmesSeries = yearsSorted.map(d => d.part_femmes != null ? pct(d.part_femmes) : null);
  const nSeries = yearsSorted.map(d => d.n ?? null);

  Plotly.newPlot(
    "chart_genre_year",
    [
      {
        x: years,
        y: insertionSeries,
        type: "bar",
        name: "Insertion (%)",
        marker: { color: "#5fa8d3" },
        customdata: nSeries,
        hovertemplate: "Ann?e %{x}<br>Insertion: %{y:.1f}%<br>n: %{customdata}<extra></extra>"
      },
      {
        x: years,
        y: partFemmesSeries,
        type: "bar",
        name: "Part femmes (%)",
        marker: { color: "#f4a261" },
        customdata: nSeries,
        hovertemplate: "Ann?e %{x}<br>Part femmes: %{y:.1f}%<br>n: %{customdata}<extra></extra>"
      }
    ],
    {
      margin: { t: 20, l: 60, r: 30, b: 45 },
      barmode: "group",
      xaxis: { title: "Ann?e" },
      yaxis: { title: "Pourcentage (%)", rangemode: "tozero" },
      legend: { orientation: "h", x: 0, y: 1.12 }
    }
  );

  renderTable("table_genre", [
    { key: "domaine", label: "Domaine" },
    { key: "taux_dinsertion_moy", label: "Insertion", fmt: (v) => fmtPct((v ?? 0) * 100, 1) },
    { key: "part_femmes", label: "Part femmes", fmt: (v) => fmtPct((v ?? 0) * 100, 1) },
    { key: "salaire_moyen", label: "Salaire moyen", fmt: fmtEuro },
    { key: "salaire_median", label: "Salaire median", fmt: fmtEuro },
    { key: "n", label: "n", fmt: fmtInt }
  ], top);
}

/* ------------------ EQUITE (boursiers) ------------------ */
async function renderEquite() {
  const byDomaine = await fetchJSON("/api/equite_by_domaine");
  const topN = 12;
  const top = [...byDomaine].sort((a, b) => (b.taux_dinsertion_moy ?? 0) - (a.taux_dinsertion_moy ?? 0)).slice(0, topN);

  Plotly.newPlot(
    "chart_equite_domaine",
    [{
      x: top.slice().reverse().map(d => pct(d.taux_dinsertion_moy)),
      y: top.slice().reverse().map(d => d.domaine),
      type: "bar",
      orientation: "h",
      marker: {
        color: top.slice().reverse().map(d => pct(d.part_boursiers)),
        colorscale: [
          [0, "#1f6feb"],
          [0.5, "#5fa8d3"],
          [1, "#f4a261"]
        ],
        colorbar: { title: "Part boursiers (%)" },
        line: { width: 0.4, color: "rgba(255,255,255,.25)" }
      },
      hovertemplate:
        "<b>%{y}</b><br>" +
        "Insertion: %{x:.1f}%<br>" +
        "Part boursiers: %{marker.color:.1f}%<br>" +
        "Salaire median: %{customdata[0]:.0f} EUR<br>" +
        "n: %{customdata[1]}<extra></extra>",
      customdata: top.slice().reverse().map(d => [d.salaire_median ?? 0, fmtInt(d.n)])
    }],
    {
      margin: { t: 20, l: 240, r: 40, b: 45 },
      xaxis: { title: "Taux d'insertion moyen (%)" },
      yaxis: { automargin: true }
    }
  );

  renderTable("table_equite", [
    { key: "domaine", label: "Domaine" },
    { key: "taux_dinsertion_moy", label: "Insertion", fmt: (v) => fmtPct((v ?? 0) * 100, 1) },
    { key: "part_boursiers", label: "Part boursiers", fmt: (v) => fmtPct((v ?? 0) * 100, 1) },
    { key: "salaire_median", label: "Salaire median", fmt: fmtEuro },
    { key: "n", label: "n", fmt: fmtInt }
  ], top);
}

/* ------------------ CONCLUSION ------------------ */
async function renderConclusion() {
  const [byYear, byDomaine, byAcademie] = await Promise.all([
    fetchJSON("/api/by_year"),
    fetchJSON("/api/by_domaine"),
    fetchJSON("/api/by_academie")
  ]);

  const setText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  const years = [...byYear].filter(d => d.annee != null).sort((a, b) => a.annee - b.annee);
  if (years.length) {
    const latest = years[years.length - 1];
    const prev = years.length > 1 ? years[years.length - 2] : null;
    const latestPct = latest.taux_dinsertion_moy != null ? pct(latest.taux_dinsertion_moy) : null;
    const prevPct = prev?.taux_dinsertion_moy != null ? pct(prev.taux_dinsertion_moy) : null;

    setText("kpi_conc_insertion", latestPct != null ? fmtPct(latestPct, 1) : "--");
    setText(
      "kpi_conc_insertion_delta",
      prevPct != null && latestPct != null ? `vs année -1 : ${(latestPct - prevPct).toFixed(1)} pts` : "vs année -1 : --"
    );

    setText("kpi_conc_salary", fmtEuro(latest.salaire_median));
    setText(
      "kpi_conc_salary_delta",
      prev?.salaire_median != null && latest.salaire_median != null
        ? `vs année -1 : ${(latest.salaire_median - prev.salaire_median).toFixed(0)} EUR`
        : "vs année -1 : --"
    );

    setText("kpi_conc_n", fmtInt(latest.n));
    setText(
      "kpi_conc_n_delta",
      prev?.n != null && latest.n != null ? `vs année -1 : ${(latest.n - prev.n).toLocaleString("fr-FR")}` : "vs année -1 : --"
    );
  }

  const topDom = [...byDomaine].sort((a, b) => (b.taux_dinsertion_moy ?? 0) - (a.taux_dinsertion_moy ?? 0)).slice(0, 5);

  const topAca = [...byAcademie].sort((a, b) => (b.taux_dinsertion_moy ?? 0) - (a.taux_dinsertion_moy ?? 0)).slice(0, 5);

  // Executive summary bullets
  if (topDom.length) {
    setText(
      "conc_b1",
      `Domaines : ${topDom[0].domaine} reste le domaine le plus insérant avec un taux autour de ${fmtPct(pct(topDom[0].taux_dinsertion_moy), 1)}, un salaire médian de ${fmtEuro(topDom[0].salaire_median)} et un volume de réponses de n=${fmtInt(topDom[0].n)}, ce qui en fait un repère solide pour juger les autres domaines.`
    );
  }
  if (years.length) {
    const latest = years[years.length - 1];
    setText(
      "conc_b2",
      `Tendance : le taux d'insertion atteint ${fmtPct(latest.taux_dinsertion_moy != null ? pct(latest.taux_dinsertion_moy) : null, 1)} en ${latest.annee}, confirmant une trajectoire globalement stable malgré des variations ponctuelles selon les millésimes et les effectifs.`
    );
  }
  setText("conc_b3", "Avertissement : corrélation ≠ causalité ; les conclusions doivent tenir compte des effectifs (n), des éventuels regroupements et des années lacunaires qui peuvent créer des biais.");

  // Insights by page
  if (topDom.length) {
    setText("conc_insight_domaines", `Domaines : ${topDom[0].domaine} tire l'insertion (${fmtPct(pct(topDom[0].taux_dinsertion_moy), 1)}), avec un salaire médian de ${fmtEuro(topDom[0].salaire_median)}, positionnant ce champ comme un levier métier majeur.`);
  }
  if (topAca.length) {
    setText("conc_insight_academies", `Académies : ${topAca[0].academie} figure parmi les plus insérantes (~${fmtPct(pct(topAca[0].taux_dinsertion_moy), 1)}), avec un socle d'effectifs n=${fmtInt(topAca[0].n)} apportant de la robustesse à la lecture.`);
  }
  setText("conc_insight_genre", "Genre : la page dédiée compare insertion et part de femmes par domaine et par année ; surveiller les années où le mix femmes et les effectifs chutent pour éviter une sur-interprétation.");
  setText("conc_insight_equite", "Équité : la page boursiers montre des écarts par domaine ; interpréter avec prudence lorsque n est faible ou concentré sur quelques domaines.");

  // Answers to problématique
  const latestYear = years.length ? years[years.length - 1].annee : "--";
  setText("conc_answer1", `Insertion globale : le dernier millésime (${latestYear}) affiche un taux d'insertion d'environ ${years.length ? fmtPct(pct(years[years.length - 1].taux_dinsertion_moy), 1) : "--"}, avec une couverture de n=${years.length ? fmtInt(years[years.length - 1].n) : "--"} répondants, ce qui donne une lecture robuste du niveau d'intégration professionnel des diplômés de Master.`);
  setText("conc_answer2", topDom.length ? `Facteurs métiers : ${topDom[0].domaine} se distingue nettement avec un taux d'insertion proche de ${fmtPct(pct(topDom[0].taux_dinsertion_moy), 1)} et un salaire médian de ${fmtEuro(topDom[0].salaire_median)}, montrant que ce domaine combine employabilité et rémunération dans la période observée.` : "Facteurs métiers : --");
  setText("conc_answer3", topAca.length ? `Localisation : ${topAca[0].academie} émerge comme académie la plus insérante (~${fmtPct(pct(topAca[0].taux_dinsertion_moy), 1)}), soutenue par un volume d'effectifs de n=${fmtInt(topAca[0].n)}, ce qui suggère un contexte territorial favorable qui mérite d'être creusé.` : "Localisation : --");
}

/* ------------------ MAIN ------------------ */
(async function main() {
  const page = document.body.getAttribute("data-page");
  try {
    if (page === "index") await renderIndex();
    if (page === "domaines") await renderDomaines();
    if (page === "academies") await renderAcademies();
    if (page === "genre") await renderGenre();
    if (page === "equite") await renderEquite();
    if (page === "conclusion") await renderConclusion();
  } catch (e) {
    console.error(e);
    alert("Erreur chargement donnees/graphes: " + e.message);
  }
})();
