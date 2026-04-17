const API_BASE = "https://pokeapi.co/api/v2";

export const PAGE_SIZE = 24;

// Central API helper: accepts either a PokeAPI path or a full resource URL from another response.
export async function fetchJson(pathOrUrl, signal) {
  const url = pathOrUrl.startsWith("http") ? pathOrUrl : `${API_BASE}${pathOrUrl}`;
  const response = await fetch(url, { signal });

  if (!response.ok) {
    throw new Error(`PokeAPI request failed with ${response.status}`);
  }

  return response.json();
}

// Fetch a lightweight name/url directory once, then hydrate visible cards with detail requests.
export async function fetchPokemonDirectory({ signal } = {}) {
  const data = await fetchJson("/pokemon?limit=1500&offset=0", signal);
  return data.results;
}

export async function fetchPokemonByName(name, { signal } = {}) {
  return fetchJson(`/pokemon/${String(name).toLowerCase()}`, signal);
}

export async function fetchPokemonSpecies(idOrName, { signal } = {}) {
  return fetchJson(`/pokemon-species/${idOrName}`, signal);
}

export async function fetchResource(url, { signal } = {}) {
  return fetchJson(url, signal);
}

// PokeAPI includes non-standard helper types; hide them from user-facing filters.
export async function fetchTypes({ signal } = {}) {
  const data = await fetchJson("/type", signal);
  return data.results.filter(
    (typeEntry) => !["shadow", "unknown"].includes(typeEntry.name),
  );
}

export async function fetchTypeByName(name, { signal } = {}) {
  return fetchJson(`/type/${name}`, signal);
}

export function extractIdFromUrl(url) {
  const match = url.match(/\/(\d+)\/?$/);
  return match ? Number(match[1]) : null;
}

// Prefer official artwork, but keep sprite fallbacks so older or unusual entries still render.
export function getPokemonArtwork(pokemon) {
  return (
    pokemon?.sprites?.other?.["official-artwork"]?.front_default ??
    pokemon?.sprites?.other?.home?.front_default ??
    pokemon?.sprites?.front_default ??
    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemon?.id}.png`
  );
}
