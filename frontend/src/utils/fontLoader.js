const loaded = new Set();

function addStylesheet(href) {
  if (loaded.has(href)) return;
  loaded.add(href);

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

export function ensureFont(font) {
  if (!font || !font.google) return Promise.resolve();

  addStylesheet(`https://fonts.googleapis.com/css2?family=${font.google}&display=swap`);

  if (!document.fonts?.load) return Promise.resolve();

  return Promise.all([
    document.fonts.load(`400 12px "${font.label}"`),
    document.fonts.load(`700 12px "${font.label}"`),
  ]).catch(() => {});
}

export function ensureAllFonts(fonts) {
  const families = fonts.filter((f) => f.google).map((f) => `family=${f.google}`);
  if (families.length === 0) return;
  addStylesheet(`https://fonts.googleapis.com/css2?${families.join("&")}&display=swap`);
}