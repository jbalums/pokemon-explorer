"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTeam } from "./team-context";
import {
  fetchPokemonByName,
  fetchPokemonSpecies,
  fetchResource,
  getPokemonArtwork,
} from "../lib/pokeapi";
import {
  buildRadarChart,
  describeEvolutionStep,
  formatLabel,
  formatMoveLabel,
  formatStatLabel,
  getBaseStatTotal,
  getEnglishFlavorText,
  getEvolutionId,
  getTypeGlow,
  getTypeMeta,
  pickFeatureMoves,
} from "../lib/pokemon-utils";

export default function PokemonDetail({ name }) {
  const decodedName = decodeURIComponent(name).toLowerCase();
  const { isInTeam, isTeamFull, toggleTeamMember } = useTeam();

  const pokemonQuery = useQuery({
    queryKey: ["pokemon-detail", decodedName],
    queryFn: ({ signal }) => fetchPokemonByName(decodedName, { signal }),
    staleTime: 1000 * 60 * 60 * 12,
  });

  const speciesQuery = useQuery({
    queryKey: ["pokemon-species", pokemonQuery.data?.id],
    queryFn: ({ signal }) => fetchPokemonSpecies(pokemonQuery.data.id, { signal }),
    enabled: Boolean(pokemonQuery.data?.id),
    staleTime: 1000 * 60 * 60 * 12,
  });

  const evolutionQuery = useQuery({
    queryKey: ["pokemon-evolution-chain", speciesQuery.data?.evolution_chain?.url],
    queryFn: ({ signal }) => fetchResource(speciesQuery.data.evolution_chain.url, { signal }),
    enabled: Boolean(speciesQuery.data?.evolution_chain?.url),
    staleTime: 1000 * 60 * 60 * 12,
  });

  const pokemon = pokemonQuery.data;
  const species = speciesQuery.data;
  const evolution = evolutionQuery.data;
  const moves = useMemo(() => pickFeatureMoves(pokemon?.moves ?? []), [pokemon?.moves]);
  const flavorText = getEnglishFlavorText(species);
  const statChart = pokemon ? buildRadarChart(pokemon.stats) : null;
  const totalStats = getBaseStatTotal(pokemon?.stats ?? []);

  if (pokemonQuery.isPending) {
    return <DetailSkeleton />;
  }

  if (pokemonQuery.isError || !pokemon) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-5xl items-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="glass-panel w-full rounded-[2rem] p-10 text-center">
          <p className="text-sm uppercase tracking-[0.28em] text-slate-500">Lost signal</p>
          <h1 className="mt-3 text-3xl font-semibold text-white">Pokemon not found.</h1>
          <p className="mt-3 text-slate-300">
            That route did not resolve from the PokeAPI. Try another name from the explorer.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex rounded-full border border-sky-300/30 bg-sky-400/15 px-5 py-3 text-sm font-medium text-sky-100"
          >
            Back to explorer
          </Link>
        </div>
      </div>
    );
  }

  const types = pokemon.types.map((entry) => entry.type.name);

  return (
    <div className="flex-1">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <section
          className="glass-panel noise-overlay relative overflow-hidden rounded-[2.25rem] p-5 sm:p-8"
          style={getTypeGlow(types)}
        >
          <div className="absolute inset-y-0 right-0 hidden w-80 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_42%)] lg:block" />

          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
            <div>
              <Link
                href="/"
                className="inline-flex items-center rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm text-slate-200 hover:border-white/20 hover:bg-white/10"
              >
                Back to explorer
              </Link>

              <div className="mt-5 flex flex-wrap gap-2">
                {types.map((typeName) => (
                  <TypeBadge key={typeName} type={typeName} />
                ))}
              </div>

              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                {formatLabel(pokemon.name)}
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-8 text-slate-200">
                {flavorText ??
                  "Species lore is loading. Stats, move profile, and evolution map are live below."}
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <FactChip label="Dex ID" value={`#${String(pokemon.id).padStart(3, "0")}`} />
                <FactChip label="Height" value={`${pokemon.height / 10}m`} />
                <FactChip label="Weight" value={`${pokemon.weight / 10}kg`} />
                <FactChip label="Base total" value={String(totalStats)} />
                <FactChip
                  label="Habitat"
                  value={species?.habitat ? formatLabel(species.habitat.name) : "Unknown"}
                />
              </div>

              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => toggleTeamMember({ id: pokemon.id, name: pokemon.name })}
                  disabled={!isInTeam(pokemon.name) && isTeamFull}
                  className={`rounded-full px-5 py-3 text-sm font-medium ${
                    isInTeam(pokemon.name)
                      ? "border border-emerald-300/30 bg-emerald-400/15 text-emerald-100"
                      : isTeamFull
                        ? "cursor-not-allowed border border-white/10 bg-white/5 text-slate-500"
                        : "border border-sky-300/30 bg-sky-400/15 text-sky-100 hover:scale-[1.02]"
                  }`}
                >
                  {isInTeam(pokemon.name) ? "Remove from team" : "Add to team builder"}
                </button>
              </div>
            </div>

            <div className="relative flex items-center justify-center">
              <div className="pulse-ring absolute inset-6 rounded-full bg-white/8 blur-3xl" />
              <div className="relative flex h-72 w-72 items-center justify-center rounded-full border border-white/10 bg-black/15 sm:h-80 sm:w-80">
                <Image
                  src={getPokemonArtwork(pokemon)}
                  alt={pokemon.name}
                  width={256}
                  height={256}
                  unoptimized
                  className="floaty h-56 w-56 object-contain drop-shadow-[0_26px_40px_rgba(2,6,23,0.78)] sm:h-64 sm:w-64"
                />
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <section className="space-y-8">
            <Panel
              eyebrow="Creative Visualization"
              title="Stat radar"
              subtitle="Each axis shows the Pokemon's base stat spread for fast battle-read scanning."
            >
              <div className="grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-center">
                <StatRadar pokemon={pokemon} chart={statChart} />

                <div className="grid gap-4">
                  {pokemon.stats.map((statEntry) => {
                    const meta = getTypeMeta(types[0]);

                    return (
                      <div key={statEntry.stat.name}>
                        <div className="mb-2 flex items-center justify-between gap-4">
                          <span className="text-sm font-medium text-slate-200">
                            {formatStatLabel(statEntry.stat.name)}
                          </span>
                          <span className="text-sm text-white">{statEntry.base_stat}</span>
                        </div>
                        <div className="h-3 overflow-hidden rounded-full bg-white/8">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min((statEntry.base_stat / 180) * 100, 100)}%`,
                              background: `linear-gradient(90deg, ${meta.color}, ${meta.accent})`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Panel>

            <Panel
              eyebrow="Battle Toolkit"
              title="Abilities and move profile"
              subtitle="A fast read on passive traits plus signature moves currently featured from the API."
            >
              <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <div className="space-y-4">
                  {pokemon.abilities.map((abilityEntry) => (
                    <div
                      key={abilityEntry.ability.name}
                      className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <h3 className="text-lg font-semibold text-white">
                          {formatLabel(abilityEntry.ability.name)}
                        </h3>
                        {abilityEntry.is_hidden ? (
                          <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-amber-100">
                            Hidden
                          </span>
                        ) : (
                          <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
                            Standard
                          </span>
                        )}
                      </div>
                      <p className="mt-3 text-sm leading-7 text-slate-300">
                        Slot {abilityEntry.slot} in the active ability spread.
                      </p>
                    </div>
                  ))}
                </div>

                <div className="rounded-[1.6rem] border border-white/10 bg-black/15 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-lg font-semibold text-white">Featured moves</h3>
                    <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      {pokemon.moves.length} total
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {moves.map((move) => (
                      <span
                        key={move.name}
                        className="rounded-full border border-white/10 bg-white/6 px-3 py-2 text-sm text-slate-100"
                      >
                        {formatMoveLabel(move.name)}
                        <span className="ml-2 text-xs uppercase tracking-[0.15em] text-slate-400">
                          {move.learnMethod === "level-up"
                            ? `Lv ${move.level || 1}`
                            : formatLabel(move.learnMethod)}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Panel>
          </section>

          <section className="space-y-8">
            <Panel
              eyebrow="Species Profile"
              title="Field notes"
              subtitle="Quick species metadata from the Pokemon species endpoint."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <InfoCard
                  label="Color"
                  value={species?.color ? formatLabel(species.color.name) : "Loading"}
                />
                <InfoCard
                  label="Growth rate"
                  value={species?.growth_rate ? formatLabel(species.growth_rate.name) : "Loading"}
                />
                <InfoCard
                  label="Base happiness"
                  value={species ? String(species.base_happiness) : "Loading"}
                />
                <InfoCard
                  label="Capture rate"
                  value={species ? String(species.capture_rate) : "Loading"}
                />
              </div>
            </Panel>

            <Panel
              eyebrow="Evolution"
              title="Evolution chain"
              subtitle="The full family tree with trigger conditions pulled from the species evolution chain."
            >
              {evolution?.chain ? (
                <EvolutionNode node={evolution.chain} />
              ) : (
                <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                  Evolution data is loading from the chain endpoint.
                </div>
              )}
            </Panel>
          </section>
        </div>
      </div>
    </div>
  );
}

function Panel({ eyebrow, title, subtitle, children }) {
  return (
    <section className="glass-panel rounded-[2rem] p-5 sm:p-6">
      <p className="text-xs uppercase tracking-[0.28em] text-sky-200/70">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-semibold text-white">{title}</h2>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">{subtitle}</p>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function FactChip({ label, value }) {
  return (
    <div className="rounded-full border border-white/10 bg-white/6 px-4 py-2">
      <span className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</span>
      <span className="ml-3 text-sm font-medium text-white">{value}</span>
    </div>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-3 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}

function StatRadar({ pokemon, chart }) {
  const meta = getTypeMeta(pokemon.types[0].type.name);

  return (
    <div className="flex items-center justify-center">
      <svg viewBox="0 0 260 260" className="h-[260px] w-[260px] overflow-visible">
        {chart.rings.map((ring, index) => (
          <polygon
            key={`ring-${index}`}
            points={ring}
            fill="none"
            stroke="rgba(148, 163, 184, 0.18)"
            strokeWidth="1"
          />
        ))}

        {chart.spokes.map((spoke, index) => (
          <line
            key={`spoke-${index}`}
            x1={chart.center}
            y1={chart.center}
            x2={spoke.x}
            y2={spoke.y}
            stroke="rgba(148, 163, 184, 0.16)"
            strokeWidth="1"
          />
        ))}

        <polygon
          points={chart.polygon}
          fill={`${meta.color}2a`}
          stroke={meta.color}
          strokeWidth="3"
        />

        {pokemon.stats.map((statEntry, index) => {
          const points = chart.polygon.split(" ");
          const [x, y] = points[index].split(",");
          return (
            <circle
              key={statEntry.stat.name}
              cx={Number(x)}
              cy={Number(y)}
              r="4"
              fill={meta.color}
              stroke="white"
              strokeWidth="1.5"
            />
          );
        })}

        {chart.labels.map((label) => (
          <text
            key={label.label}
            x={label.x}
            y={label.y}
            textAnchor="middle"
            fill="rgba(226, 232, 240, 0.88)"
            fontSize="11"
            style={{ letterSpacing: "0.08em", textTransform: "uppercase" }}
          >
            {label.label}
          </text>
        ))}
      </svg>
    </div>
  );
}

function EvolutionNode({ node }) {
  const pokemonId = getEvolutionId(node.species);

  return (
    <div className="space-y-4">
      <div className="rounded-[1.6rem] border border-white/10 bg-black/15 p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-[1.4rem] border border-white/10 bg-white/5">
              <Image
                src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemonId}.png`}
                alt={node.species.name}
                width={64}
                height={64}
                unoptimized
                className="h-16 w-16 object-contain"
              />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Evolution stage</p>
              <Link
                href={`/pokemon/${node.species.name}`}
                className="mt-1 inline-block text-xl font-semibold text-white hover:text-sky-200"
              >
                {formatLabel(node.species.name)}
              </Link>
            </div>
          </div>

          <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
            {node.evolves_to.length ? `${node.evolves_to.length} next form${node.evolves_to.length > 1 ? "s" : ""}` : "Final form"}
          </span>
        </div>
      </div>

      {node.evolves_to.length ? (
        <div className="pl-4 sm:pl-8">
          {node.evolves_to.map((evolution) => (
            <div key={evolution.species.name} className="mb-4 last:mb-0">
              <div className="mb-3 ml-2 flex items-center gap-3 text-sm text-slate-400">
                <span className="h-px flex-1 bg-white/10" />
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                  {describeEvolutionStep(evolution.evolution_details?.[0])}
                </span>
                <span className="h-px flex-1 bg-white/10" />
              </div>
              <EvolutionNode node={evolution} />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function TypeBadge({ type }) {
  const meta = getTypeMeta(type);

  return (
    <span
      className="inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium"
      style={{
        backgroundColor: `${meta.color}1e`,
        borderColor: `${meta.color}52`,
        color: meta.color,
      }}
    >
      {formatLabel(type)}
    </span>
  );
}

function DetailSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="glass-panel h-[380px] animate-pulse rounded-[2.25rem]" />
      <div className="grid gap-8 xl:grid-cols-2">
        <div className="glass-panel h-[480px] animate-pulse rounded-[2rem]" />
        <div className="glass-panel h-[480px] animate-pulse rounded-[2rem]" />
      </div>
    </div>
  );
}
