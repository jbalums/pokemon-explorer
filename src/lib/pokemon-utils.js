import { extractIdFromUrl } from "./pokeapi";

export const TYPE_META = {
  normal: { color: "#cbd5e1", accent: "#94a3b8" },
  fire: { color: "#fb923c", accent: "#f97316" },
  water: { color: "#60a5fa", accent: "#3b82f6" },
  electric: { color: "#facc15", accent: "#eab308" },
  grass: { color: "#4ade80", accent: "#22c55e" },
  ice: { color: "#67e8f9", accent: "#22d3ee" },
  fighting: { color: "#f87171", accent: "#ef4444" },
  poison: { color: "#c084fc", accent: "#a855f7" },
  ground: { color: "#f59e0b", accent: "#d97706" },
  flying: { color: "#93c5fd", accent: "#60a5fa" },
  psychic: { color: "#f9a8d4", accent: "#ec4899" },
  bug: { color: "#a3e635", accent: "#84cc16" },
  rock: { color: "#d6d3d1", accent: "#a8a29e" },
  ghost: { color: "#a78bfa", accent: "#8b5cf6" },
  dragon: { color: "#818cf8", accent: "#6366f1" },
  dark: { color: "#94a3b8", accent: "#64748b" },
  steel: { color: "#cbd5e1", accent: "#94a3b8" },
  fairy: { color: "#fbcfe8", accent: "#f472b6" },
};

export function formatLabel(value) {
  return String(value)
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatStatLabel(statName) {
  const labels = {
    hp: "HP",
    attack: "Attack",
    defense: "Defense",
    "special-attack": "Sp. Atk",
    "special-defense": "Sp. Def",
    speed: "Speed",
  };

  return labels[statName] ?? formatLabel(statName);
}

export function formatMoveLabel(moveName) {
  return String(moveName)
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getTypeMeta(typeName) {
  return TYPE_META[typeName] ?? { color: "#cbd5e1", accent: "#94a3b8" };
}

export function getTypeGlow(types = []) {
  const primary = getTypeMeta(types[0]).color;
  const secondary = getTypeMeta(types[1] ?? types[0]).accent;

  return {
    background: `radial-gradient(circle at 30% 20%, ${primary}33 0%, transparent 40%), radial-gradient(circle at 80% 30%, ${secondary}2e 0%, transparent 36%), linear-gradient(145deg, rgba(15, 23, 42, 0.96), rgba(8, 15, 30, 0.92))`,
  };
}

export function getEnglishFlavorText(species) {
  const entry = species?.flavor_text_entries?.find(
    (item) => item.language.name === "en",
  );

  return entry ? entry.flavor_text.replace(/\f/g, " ").replace(/\s+/g, " ") : null;
}

export function getBaseStatTotal(stats = []) {
  return stats.reduce((total, statEntry) => total + statEntry.base_stat, 0);
}

// Prefer level-up moves so the detail page surfaces attacks that feel natural to the Pokemon.
export function pickFeatureMoves(moves = [], limit = 12) {
  return [...moves]
    .map((moveEntry) => {
      const preferred =
        [...moveEntry.version_group_details]
          .reverse()
          .find((entry) => entry.move_learn_method.name === "level-up") ??
        moveEntry.version_group_details.at(-1);

      return {
        name: moveEntry.move.name,
        level: preferred?.level_learned_at ?? 0,
        learnMethod: preferred?.move_learn_method?.name ?? "unknown",
      };
    })
    .sort((left, right) => {
      if (left.learnMethod === "level-up" && right.learnMethod !== "level-up") {
        return -1;
      }

      if (right.learnMethod === "level-up" && left.learnMethod !== "level-up") {
        return 1;
      }

      if (left.level !== right.level) {
        return left.level - right.level;
      }

      return left.name.localeCompare(right.name);
    })
    .slice(0, limit);
}

// Converts six Pokemon stats into SVG polygon coordinates for the radar chart.
export function buildRadarChart(stats = [], size = 260, maxStat = 180) {
  const center = size / 2;
  const radius = size * 0.34;
  const angles = stats.map((_, index) => -Math.PI / 2 + (index * 2 * Math.PI) / stats.length);
  const rings = [0.25, 0.5, 0.75, 1].map((step) =>
    angles
      .map((angle) => {
        const pointRadius = radius * step;
        return [
          center + Math.cos(angle) * pointRadius,
          center + Math.sin(angle) * pointRadius,
        ];
      })
      .map(([x, y]) => `${x},${y}`)
      .join(" "),
  );
  const polygon = angles
    .map((angle, index) => {
      const statValue = Math.min(stats[index].base_stat, maxStat);
      const statRadius = (statValue / maxStat) * radius;
      return `${center + Math.cos(angle) * statRadius},${center + Math.sin(angle) * statRadius}`;
    })
    .join(" ");
  const spokes = angles.map((angle) => ({
    x: center + Math.cos(angle) * radius,
    y: center + Math.sin(angle) * radius,
  }));
  const labels = angles.map((angle, index) => ({
    label: formatStatLabel(stats[index].stat.name),
    x: center + Math.cos(angle) * (radius + 24),
    y: center + Math.sin(angle) * (radius + 24),
  }));

  return { center, polygon, rings, spokes, labels };
}

// PokeAPI evolution details are sparse and conditional, so this builds a readable fallback label.
export function describeEvolutionStep(evolutionDetails = {}) {
  const fragments = [];

  if (evolutionDetails.trigger?.name) {
    fragments.push(formatLabel(evolutionDetails.trigger.name));
  }

  if (evolutionDetails.min_level) {
    fragments.push(`Level ${evolutionDetails.min_level}`);
  }

  if (evolutionDetails.item?.name) {
    fragments.push(`Use ${formatLabel(evolutionDetails.item.name)}`);
  }

  if (evolutionDetails.held_item?.name) {
    fragments.push(`Hold ${formatLabel(evolutionDetails.held_item.name)}`);
  }

  if (evolutionDetails.known_move?.name) {
    fragments.push(`Knows ${formatMoveLabel(evolutionDetails.known_move.name)}`);
  }

  if (evolutionDetails.min_happiness) {
    fragments.push(`Happiness ${evolutionDetails.min_happiness}+`);
  }

  if (evolutionDetails.time_of_day) {
    fragments.push(formatLabel(evolutionDetails.time_of_day));
  }

  if (evolutionDetails.location?.name) {
    fragments.push(`At ${formatLabel(evolutionDetails.location.name)}`);
  }

  if (evolutionDetails.trade_species?.name) {
    fragments.push(`Trade for ${formatLabel(evolutionDetails.trade_species.name)}`);
  }

  return fragments.length ? fragments.join(" • ") : "Special condition";
}

// Type effectiveness stacks across dual types, including immunities that zero out damage.
export function getDefensiveMultiplier(attackType, defendingTypes, typeMatrix) {
  return defendingTypes.reduce((multiplier, defendingType) => {
    if (multiplier === 0) {
      return multiplier;
    }

    const relations = typeMatrix[attackType]?.damage_relations;

    if (!relations) {
      return multiplier;
    }

    if (relations.no_damage_to.some((entry) => entry.name === defendingType)) {
      return 0;
    }

    if (relations.double_damage_to.some((entry) => entry.name === defendingType)) {
      return multiplier * 2;
    }

    if (relations.half_damage_to.some((entry) => entry.name === defendingType)) {
      return multiplier * 0.5;
    }

    return multiplier;
  }, 1);
}

// Produces a sorted defensive matchup list so the UI can show the largest risks first.
export function buildDefensiveProfile(pokemon, typeMatrix) {
  const defendingTypes = pokemon.types.map((entry) => entry.type.name);

  return Object.keys(typeMatrix)
    .map((attackType) => ({
      type: attackType,
      multiplier: getDefensiveMultiplier(attackType, defendingTypes, typeMatrix),
    }))
    .sort((left, right) => right.multiplier - left.multiplier);
}

// Aggregates the whole team into weaknesses, resistances, immunities, and offensive STAB coverage.
export function summarizeTeam(team = [], typeMatrix = {}) {
  if (!team.length || !Object.keys(typeMatrix).length) {
    return {
      defensivePressure: [],
      sharedWeaknesses: [],
      coverage: [],
      averageBaseTotal: 0,
    };
  }

  const defensivePressure = Object.keys(typeMatrix)
    .map((attackType) => {
      const result = team.reduce(
        (summary, pokemon) => {
          const defendingTypes = pokemon.types.map((entry) => entry.type.name);
          const multiplier = getDefensiveMultiplier(attackType, defendingTypes, typeMatrix);

          if (multiplier === 0) {
            summary.immune += 1;
          } else if (multiplier > 1) {
            summary.weak += 1;
          } else if (multiplier < 1) {
            summary.resist += 1;
          } else {
            summary.neutral += 1;
          }

          return summary;
        },
        { type: attackType, weak: 0, resist: 0, immune: 0, neutral: 0 },
      );

      return result;
    })
    .sort((left, right) => {
      if (right.weak !== left.weak) {
        return right.weak - left.weak;
      }

      return right.resist + right.immune - (left.resist + left.immune);
    });

  const coverageMap = new Map();

  team.forEach((pokemon) => {
    pokemon.types.forEach((typeEntry) => {
      const attackType = typeEntry.type.name;
      const superEffectiveTargets = typeMatrix[attackType]?.damage_relations?.double_damage_to ?? [];

      superEffectiveTargets.forEach((targetType) => {
        coverageMap.set(targetType.name, (coverageMap.get(targetType.name) ?? 0) + 1);
      });
    });
  });

  const coverage = [...coverageMap.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((left, right) => right.count - left.count || left.type.localeCompare(right.type));

  return {
    defensivePressure,
    sharedWeaknesses: defensivePressure.filter((entry) => entry.weak >= 2),
    coverage,
    averageBaseTotal: Math.round(
      team.reduce((total, pokemon) => total + getBaseStatTotal(pokemon.stats), 0) / team.length,
    ),
  };
}

export function getEvolutionId(species) {
  return extractIdFromUrl(species?.url ?? "");
}
