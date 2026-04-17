"use client";

import { useDeferredValue, useMemo, useState, startTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useTeam } from "./team-context";
import {
	PAGE_SIZE,
	fetchPokemonByName,
	fetchPokemonDirectory,
	fetchTypeByName,
	fetchTypes,
	getPokemonArtwork,
} from "../lib/pokeapi";
import {
	buildDefensiveProfile,
	formatLabel,
	getBaseStatTotal,
	getTypeGlow,
	getTypeMeta,
	summarizeTeam,
} from "../lib/pokemon-utils";

export default function PokemonExplorer() {
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedType, setSelectedType] = useState("all");
	const [isSidebarOpen, setIsSidebarOpen] = useState(true);
	const [pagination, setPagination] = useState({
		key: "all|",
		page: 1,
	});
	const deferredSearch = useDeferredValue(searchTerm);
	const filterKey = `${selectedType}|${deferredSearch.trim().toLowerCase()}`;

	const {
		team,
		isHydrated,
		isInTeam,
		maxTeamSize,
		toggleTeamMember,
		clearTeam,
		isTeamFull,
	} = useTeam();

	const directoryQuery = useQuery({
		queryKey: ["pokemon-directory"],
		queryFn: ({ signal }) => fetchPokemonDirectory({ signal }),
	});

	const typeListQuery = useQuery({
		queryKey: ["pokemon-types"],
		queryFn: ({ signal }) => fetchTypes({ signal }),
		staleTime: 1000 * 60 * 60 * 12,
	});

	const selectedTypeQuery = useQuery({
		queryKey: ["pokemon-type-filter", selectedType],
		queryFn: ({ signal }) => fetchTypeByName(selectedType, { signal }),
		enabled: selectedType !== "all",
		staleTime: 1000 * 60 * 60 * 12,
	});

	const allowedNames = useMemo(() => {
		if (selectedType === "all") {
			return null;
		}

		const pokemonEntries = selectedTypeQuery.data?.pokemon ?? [];
		return new Set(pokemonEntries.map((entry) => entry.pokemon.name));
	}, [selectedType, selectedTypeQuery.data]);

	const filteredEntries = useMemo(() => {
		const normalizedSearch = deferredSearch.trim().toLowerCase();

		return (directoryQuery.data ?? []).filter((entry) => {
			if (allowedNames && !allowedNames.has(entry.name)) {
				return false;
			}

			if (!normalizedSearch) {
				return true;
			}

			return entry.name.includes(normalizedSearch);
		});
	}, [allowedNames, deferredSearch, directoryQuery.data]);

	const totalPages = Math.max(
		1,
		Math.ceil(filteredEntries.length / PAGE_SIZE),
	);
	const currentPage =
		pagination.key === filterKey
			? Math.min(pagination.page, totalPages)
			: 1;
	const pageStart = (currentPage - 1) * PAGE_SIZE;
	const pageEnd = pageStart + PAGE_SIZE;
	const visibleEntries = filteredEntries.slice(pageStart, pageEnd);
	const displayStart = filteredEntries.length ? pageStart + 1 : 0;
	const displayEnd = Math.min(pageEnd, filteredEntries.length);

	const pokemonQueries = useQueries({
		queries: visibleEntries.map((entry) => ({
			queryKey: ["pokemon-card", entry.name],
			queryFn: ({ signal }) => fetchPokemonByName(entry.name, { signal }),
			staleTime: 1000 * 60 * 60 * 12,
		})),
	});

	const teamQueries = useQueries({
		queries: team.map((member) => ({
			queryKey: ["pokemon-team", member.name],
			queryFn: ({ signal }) =>
				fetchPokemonByName(member.name, { signal }),
			staleTime: 1000 * 60 * 60 * 12,
		})),
	});

	const typeMatrixQueries = useQueries({
		queries: (typeListQuery.data ?? []).map((typeEntry) => ({
			queryKey: ["type-detail", typeEntry.name],
			queryFn: ({ signal }) =>
				fetchTypeByName(typeEntry.name, { signal }),
			staleTime: 1000 * 60 * 60 * 12,
		})),
	});

	const teamPokemon = useMemo(
		() => teamQueries.map((query) => query.data).filter(Boolean),
		[teamQueries],
	);

	const typeMatrix = useMemo(() => {
		if (!(typeListQuery.data ?? []).length) {
			return {};
		}

		if (typeMatrixQueries.some((query) => !query.data)) {
			return {};
		}

		return Object.fromEntries(
			typeMatrixQueries.map((query) => [query.data.name, query.data]),
		);
	}, [typeListQuery.data, typeMatrixQueries]);

	const teamSummary = useMemo(
		() => summarizeTeam(teamPokemon, typeMatrix),
		[teamPokemon, typeMatrix],
	);

	const isBusy =
		directoryQuery.isPending ||
		(selectedType !== "all" && selectedTypeQuery.isPending);
	const goToPage = (page) => {
		setPagination({
			key: filterKey,
			page: Math.min(Math.max(page, 1), totalPages),
		});
	};

	return (
		<div className="flex-1">
			<div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
				<Hero
					directoryCount={directoryQuery.data?.length ?? 0}
					searchTerm={searchTerm}
					selectedType={selectedType}
					teamCount={team.length}
				/>

				<div
					className={`grid gap-8 ${
						isSidebarOpen
							? "lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_390px]"
							: "lg:grid-cols-1"
					}`}
				>
					<section className="space-y-6">
						<div className="glass-panel noise-overlay overflow-hidden rounded-md p-5 sm:p-6">
							<div className="flex flex-col gap-5">
								<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
									<div className="w-full">
										<h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
											Pick your pokemon
										</h2>
									</div>
									<div className="flex justify-end gap-2">
										<button
											type="button"
											onClick={() =>
												setIsSidebarOpen(
													(current) => !current,
												)
											}
											aria-expanded={isSidebarOpen}
											className="rounded-full border border-sky-300/25 bg-sky-400/10 px-4 py-2 text-sm font-medium text-sky-100 hover:border-sky-200/50 hover:bg-sky-300/15"
										>
											{isSidebarOpen
												? "Hide team panel"
												: "Show team panel"}
											<span className="ml-2 text-sky-200/70">
												{team.length}/6
											</span>
										</button>
									</div>
								</div>

								<div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
									<label className="group rounded-3xl border border-white/10 bg-black/20 p-4 shadow-lg shadow-slate-950/20">
										<span className="text-xs uppercase tracking-[0.24em] text-slate-400">
											Search Pokedex
										</span>
										<input
											value={searchTerm}
											onChange={(event) =>
												startTransition(() =>
													setSearchTerm(
														event.target.value,
													),
												)
											}
											placeholder="Search for pikachu, gardevoir, lucario..."
											className="mt-3 w-full bg-transparent text-lg text-white outline-none placeholder:text-slate-500"
										/>
									</label>

									<label className="rounded-3xl border border-white/10 bg-black/20 p-4 shadow-lg shadow-slate-950/20">
										<span className="text-xs uppercase tracking-[0.24em] text-slate-400">
											Type Filter
										</span>
										<select
											value={selectedType}
											onChange={(event) =>
												setSelectedType(
													event.target.value,
												)
											}
											className="mt-3 w-full cursor-pointer rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-base text-white outline-none"
										>
											<option value="all">
												All types
											</option>
											{(typeListQuery.data ?? []).map(
												(typeEntry) => (
													<option
														key={typeEntry.name}
														value={typeEntry.name}
													>
														{formatLabel(
															typeEntry.name,
														)}
													</option>
												),
											)}
										</select>
									</label>
								</div>

								<div className="flex flex-wrap gap-2">
									{[
										"all",
										...(typeListQuery.data ?? [])
											.slice(0, 8)
											.map((type) => type.name),
									].map((typeName) => (
										<button
											key={typeName}
											type="button"
											onClick={() =>
												setSelectedType(typeName)
											}
											className={`rounded-full border px-4 py-2 text-sm font-medium ${
												selectedType === typeName
													? "border-sky-300 bg-sky-400/20 text-sky-100"
													: "border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/8"
											}`}
										>
											{typeName === "all"
												? "All"
												: formatLabel(typeName)}
										</button>
									))}
								</div>
							</div>
						</div>

						{isBusy ? (
							<div
								className={`grid gap-4 sm:grid-cols-2 ${
									isSidebarOpen
										? "xl:grid-cols-3"
										: "lg:grid-cols-3 xl:grid-cols-4"
								}`}
							>
								{Array.from({ length: 6 }).map((_, index) => (
									<SkeletonCard key={index} />
								))}
							</div>
						) : (
							<div
								className={`grid gap-4 sm:grid-cols-2 ${
									isSidebarOpen
										? "xl:grid-cols-3"
										: "lg:grid-cols-3 xl:grid-cols-4"
								}`}
							>
								{visibleEntries.map((entry, index) => (
									<PokemonCard
										key={entry.name}
										pokemon={pokemonQueries[index].data}
										isLoading={
											pokemonQueries[index].isPending
										}
										isInTeam={isInTeam(entry.name)}
										isTeamFull={isTeamFull}
										onToggleTeam={() =>
											pokemonQueries[index].data &&
											toggleTeamMember({
												id: pokemonQueries[index].data
													.id,
												name: pokemonQueries[index].data
													.name,
											})
										}
									/>
								))}
							</div>
						)}

						{!isBusy && !filteredEntries.length ? (
							<div className="glass-panel rounded-md p-10 text-center">
								<p className="text-sm uppercase tracking-[0.26em] text-slate-400">
									No signal found
								</p>
								<h3 className="mt-3 text-2xl font-semibold text-white">
									Nothing matches that combo yet.
								</h3>
								<p className="mt-3 text-slate-300">
									Try a broader search or switch the type
									filter back to all.
								</p>
							</div>
						) : null}

						{!isBusy && filteredEntries.length ? (
							<PaginationControls
								currentPage={currentPage}
								onPageChange={goToPage}
								totalPages={totalPages}
							/>
						) : null}
					</section>

					{isSidebarOpen ? (
						<TeamBuilder
							clearTeam={clearTeam}
							isHydrated={isHydrated}
							maxTeamSize={maxTeamSize}
							team={team}
							teamPokemon={teamPokemon}
							teamSummary={teamSummary}
							toggleTeamMember={toggleTeamMember}
							typeMatrix={typeMatrix}
						/>
					) : null}
				</div>
			</div>
		</div>
	);
}

function Hero({ directoryCount, searchTerm, selectedType, teamCount }) {
	return (
		<section className="glass-panel noise-overlay relative overflow-hidden rounded-md px-5 py-6 sm:px-8 sm:py-8">
			<div className="absolute inset-y-0 right-0 hidden w-80 bg-[radial-gradient(circle_at_top_right,rgba(250,204,21,0.24),transparent_44%),radial-gradient(circle_at_bottom_right,rgba(96,165,250,0.22),transparent_42%)] lg:block" />

			<div className="relative flex lg:items-end">
				<div className="space-y-5">
					<div className="max-w-3xl">
						<h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
							Pokemon Explorer
						</h1>
						<p className="mt-4 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
							Infinite exploration, fast detail routes, stat
							visualizations, and a live team console that spots
							shared weaknesses before they cost you a battle.
						</p>
					</div>
				</div>
			</div>
		</section>
	);
}

function MetricCard({ label, value, caption }) {
	return (
		<div className="rounded-md border border-white/10 bg-white/6 px-4 py-4 shadow-lg shadow-slate-950/20">
			<p className="text-xs uppercase tracking-[0.26em] text-slate-400">
				{label}
			</p>
			<p className="mt-3 text-2xl font-semibold text-white">{value}</p>
			<p className="mt-2 text-sm text-slate-400">
				{caption ?? "Live PokeAPI data"}
			</p>
		</div>
	);
}

function PokemonCard({
	pokemon,
	isLoading,
	isInTeam,
	isTeamFull,
	onToggleTeam,
}) {
	if (isLoading || !pokemon) {
		return <SkeletonCard />;
	}

	const types = pokemon.types.map((entry) => entry.type.name);
	const total = getBaseStatTotal(pokemon.stats);

	return (
		<article
			className="group glass-panel noise-overlay relative overflow-hidden rounded-md p-4"
			style={getTypeGlow(types)}
		>
			<div className="absolute right-4 top-4 rounded-full border border-white/10 bg-slate-950/60 px-3 py-1 text-xs font-medium tracking-[0.24em] text-slate-300">
				#{String(pokemon.id).padStart(3, "0")}
			</div>

			<div className="relative flex min-h-full flex-col">
				<Link href={`/pokemon/${pokemon.name}`} className="block">
					<div className="relative flex h-48 items-center justify-center overflow-hidden rounded-md border border-white/10 bg-black/15">
						<div className="pulse-ring absolute inset-5 rounded-full bg-white/6 blur-2xl" />
						<Image
							src={getPokemonArtwork(pokemon)}
							alt={pokemon.name}
							width={160}
							height={160}
							unoptimized
							className="floaty relative h-36 w-36 object-contain drop-shadow-[0_20px_30px_rgba(2,6,23,0.65)]"
						/>
					</div>

					<div className="mt-5">
						<div className="flex flex-wrap gap-2">
							{types.map((typeName) => (
								<TypeBadge key={typeName} type={typeName} />
							))}
						</div>

						<h3 className="mt-4 text-2xl font-semibold text-white">
							{formatLabel(pokemon.name)}
						</h3>
						<p className="mt-2 text-sm leading-7 text-slate-300">
							Height {pokemon.height / 10}m · Weight{" "}
							{pokemon.weight / 10}kg · Base total {total}
						</p>
					</div>
				</Link>

				<div className="mt-5 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
					<span className="text-sm text-slate-400">
						Tap in for stats, moves, evolutions.
					</span>
					<button
						type="button"
						onClick={onToggleTeam}
						disabled={!isInTeam && isTeamFull}
						className={`rounded-full px-4 py-2 text-sm font-medium ${
							isInTeam
								? "border border-emerald-300/30 bg-emerald-400/15 text-emerald-100"
								: isTeamFull
									? "cursor-not-allowed border border-white/10 bg-white/5 text-slate-500"
									: "border border-sky-300/30 bg-sky-400/15 text-sky-100 hover:scale-[1.02]"
						}`}
					>
						{isInTeam ? "Remove" : "Add to team"}
					</button>
				</div>
			</div>
		</article>
	);
}

function SkeletonCard() {
	return (
		<div className="glass-panel overflow-hidden rounded-md p-4">
			<div className="h-48 animate-pulse rounded-md bg-white/6" />
			<div className="mt-5 flex gap-2">
				<div className="h-7 w-20 animate-pulse rounded-full bg-white/6" />
				<div className="h-7 w-16 animate-pulse rounded-full bg-white/6" />
			</div>
			<div className="mt-4 h-7 w-40 animate-pulse rounded-full bg-white/6" />
			<div className="mt-3 h-5 w-52 animate-pulse rounded-full bg-white/6" />
			<div className="mt-5 h-11 animate-pulse rounded-full bg-white/6" />
		</div>
	);
}

function PaginationControls({ currentPage, onPageChange, totalPages }) {
	const pages = getPaginationWindow(currentPage, totalPages);

	return (
		<nav
			aria-label="Pokemon pagination"
			className="glass-panel flex flex-col gap-4 rounded-md p-4 sm:flex-row sm:items-center sm:justify-between"
		>
			<div>
				<p className="text-xs uppercase tracking-[0.24em] text-slate-500">
					Pagination
				</p>
				<p className="mt-1 text-sm text-slate-300">
					Page {currentPage} of {totalPages}
				</p>
			</div>

			<div className="flex flex-wrap items-center gap-2">
				<PaginationButton
					disabled={currentPage === 1}
					onClick={() => onPageChange(currentPage - 1)}
				>
					Previous
				</PaginationButton>

				{pages.map((page, index) =>
					page === "ellipsis" ? (
						<span
							key={`ellipsis-${index}`}
							className="px-2 text-sm text-slate-500"
						>
							...
						</span>
					) : (
						<PaginationButton
							key={page}
							active={page === currentPage}
							onClick={() => onPageChange(page)}
						>
							{page}
						</PaginationButton>
					),
				)}

				<PaginationButton
					disabled={currentPage === totalPages}
					onClick={() => onPageChange(currentPage + 1)}
				>
					Next
				</PaginationButton>
			</div>
		</nav>
	);
}

function PaginationButton({
	active = false,
	children,
	disabled = false,
	onClick,
}) {
	return (
		<button
			type="button"
			disabled={disabled}
			onClick={onClick}
			className={`min-h-10 rounded-full border px-4 py-2 text-sm font-medium ${
				active
					? "border-sky-300 bg-sky-400/20 text-sky-100"
					: "border-white/10 bg-white/5 text-slate-300 hover:border-sky-200/40 hover:bg-sky-300/10 disabled:cursor-not-allowed disabled:opacity-40"
			}`}
		>
			{children}
		</button>
	);
}

function getPaginationWindow(currentPage, totalPages) {
	if (totalPages <= 7) {
		return Array.from({ length: totalPages }, (_, index) => index + 1);
	}

	// Keep first/last pages visible while collapsing the middle around the current page.
	const pages = [1];
	const start = Math.max(2, currentPage - 1);
	const end = Math.min(totalPages - 1, currentPage + 1);

	if (start > 2) {
		pages.push("ellipsis");
	}

	for (let page = start; page <= end; page += 1) {
		pages.push(page);
	}

	if (end < totalPages - 1) {
		pages.push("ellipsis");
	}

	pages.push(totalPages);

	return pages;
}

function TeamBuilder({
	clearTeam,
	isHydrated,
	maxTeamSize,
	team,
	teamPokemon,
	teamSummary,
	toggleTeamMember,
	typeMatrix,
}) {
	const pressure = teamSummary.defensivePressure.slice(0, 5);
	const sharedWeaknesses = teamSummary.sharedWeaknesses.slice(0, 4);
	const coverage = teamSummary.coverage.slice(0, 6);

	return (
		<aside className="lg:sticky lg:top-6 lg:self-start">
			<div className="glass-panel overflow-hidden rounded-md p-5 sm:p-6">
				<div className="flex items-start justify-between gap-4">
					<div>
						<p className="text-xs uppercase tracking-[0.28em] text-sky-200/70">
							Creative Feature
						</p>
						<h2 className="mt-2 text-2xl font-semibold text-white">
							Team builder
						</h2>
						<p className="mt-3 max-w-sm text-sm leading-7 text-slate-300">
							Assemble up to six Pokemon and watch defensive
							pressure, shared weaknesses, and STAB coverage
							update in real time.
						</p>
					</div>

					<button
						type="button"
						onClick={clearTeam}
						disabled={!team.length}
						className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 hover:border-rose-300/30 hover:bg-rose-400/10 hover:text-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
					>
						Clear
					</button>
				</div>

				<div className="mt-6 grid gap-3">
					{Array.from({ length: maxTeamSize }).map((_, index) => {
						const member = teamPokemon[index];
						const slot = team[index];

						return (
							<div
								key={slot?.name ?? `slot-${index}`}
								className="flex items-center gap-4 rounded-md border border-white/10 bg-black/15 px-4 py-3"
							>
								<div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/5">
									{member ? (
										<Image
											src={getPokemonArtwork(member)}
											alt={member.name}
											width={48}
											height={48}
											unoptimized
											className="h-12 w-12 object-contain"
										/>
									) : (
										<span className="text-xl text-slate-500">
											{index + 1}
										</span>
									)}
								</div>

								<div className="min-w-0 flex-1">
									<p className="text-sm uppercase tracking-[0.2em] text-slate-500">
										Slot {index + 1}
									</p>
									<p className="truncate text-base font-medium text-white">
										{member
											? formatLabel(member.name)
											: "Open"}
									</p>
									<div className="mt-2 flex flex-wrap gap-2">
										{member ? (
											member.types.map((typeEntry) => (
												<TypeBadge
													key={typeEntry.type.name}
													type={typeEntry.type.name}
													small
												/>
											))
										) : (
											<span className="text-sm text-slate-500">
												Pick from the explorer grid
											</span>
										)}
									</div>
								</div>

								{member ? (
									<button
										type="button"
										onClick={() =>
											toggleTeamMember({
												id: member.id,
												name: member.name,
											})
										}
										className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.18em] text-slate-300 hover:border-white/20 hover:bg-white/10"
									>
										Remove
									</button>
								) : null}
							</div>
						);
					})}
				</div>

				<Link
					href="/battle"
					className="mt-6 block rounded-md border border-sky-300/20 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.16),transparent_45%),rgba(2,6,23,0.24)] p-4 hover:border-sky-200/40 hover:bg-sky-400/10"
				>
					<p className="text-xs uppercase tracking-[0.28em] text-sky-200/70">
						Battle Simulator
					</p>
					<h3 className="mt-2 text-xl font-semibold text-white">
						Open the dedicated battle lab
					</h3>
					<p className="mt-2 text-sm leading-7 text-slate-300">
						Run tactical one-on-one matchups with move typing,
						battle pace, HP meters, and a turn-by-turn combat log.
					</p>
				</Link>

				{!isHydrated ? (
					<div className="mt-6 rounded-md border border-white/10 bg-white/5 px-4 py-5 text-sm text-slate-300">
						Rehydrating saved team data...
					</div>
				) : null}

				{team.length ? (
					<div className="mt-6 space-y-4">
						<SummaryCard
							title="Average power"
							value={
								teamSummary.averageBaseTotal
									? `${teamSummary.averageBaseTotal} BST`
									: "Loading"
							}
							caption="Mean base-stat total across the full squad"
						/>

						<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
							<InsightPanel
								title="Shared weaknesses"
								emptyLabel="No shared danger spikes yet."
								items={sharedWeaknesses.map((entry) => ({
									label: formatLabel(entry.type),
									meta: `${entry.weak} weak · ${entry.resist + entry.immune} covered`,
									type: entry.type,
								}))}
							/>

							<InsightPanel
								title="Coverage"
								emptyLabel="Add more type variety to reveal pressure lanes."
								items={coverage.map((entry) => ({
									label: formatLabel(entry.type),
									meta: `${entry.count} STAB match${entry.count > 1 ? "es" : ""}`,
									type: entry.type,
								}))}
							/>
						</div>

						<div className="rounded-md border border-white/10 bg-black/15 p-4">
							<div className="flex items-center justify-between gap-4">
								<h3 className="text-lg font-semibold text-white">
									Defensive pressure
								</h3>
								<span className="text-xs uppercase tracking-[0.22em] text-slate-500">
									Team-wide
								</span>
							</div>

							<div className="mt-4 space-y-3">
								{pressure.length ? (
									pressure.map((entry) => (
										<PressureRow
											key={entry.type}
											label={formatLabel(entry.type)}
											weak={entry.weak}
											resist={entry.resist}
											immune={entry.immune}
											total={team.length}
											type={entry.type}
										/>
									))
								) : (
									<p className="text-sm text-slate-400">
										Loading type matrix from the API for
										deeper team analysis.
									</p>
								)}
							</div>
						</div>

						<div className="rounded-md border border-white/10 bg-black/15 p-4">
							<h3 className="text-lg font-semibold text-white">
								Member matchups
							</h3>
							<div className="mt-4 space-y-3">
								{teamPokemon.map((pokemon) => {
									const profile = Object.keys(typeMatrix)
										.length
										? buildDefensiveProfile(
												pokemon,
												typeMatrix,
											)
										: [];
									const weakTo = profile
										.filter((entry) => entry.multiplier > 1)
										.slice(0, 3);

									return (
										<div
											key={pokemon.name}
											className="rounded-md border border-white/10 bg-white/5 p-4"
										>
											<div className="flex items-center justify-between gap-4">
												<div>
													<p className="text-base font-semibold text-white">
														{formatLabel(
															pokemon.name,
														)}
													</p>
													<p className="mt-1 text-sm text-slate-400">
														Base total{" "}
														{getBaseStatTotal(
															pokemon.stats,
														)}
													</p>
												</div>
												<div className="flex gap-2">
													{pokemon.types.map(
														(typeEntry) => (
															<TypeBadge
																key={
																	typeEntry
																		.type
																		.name
																}
																type={
																	typeEntry
																		.type
																		.name
																}
																small
															/>
														),
													)}
												</div>
											</div>
											<div className="mt-3 flex flex-wrap gap-2">
												{weakTo.length ? (
													weakTo.map((entry) => (
														<span
															key={entry.type}
															className="rounded-full border border-rose-300/20 bg-rose-400/10 px-3 py-1 text-xs font-medium text-rose-100"
														>
															Weak to{" "}
															{formatLabel(
																entry.type,
															)}{" "}
															x{entry.multiplier}
														</span>
													))
												) : (
													<span className="text-sm text-slate-400">
														Matchup data is
														stabilizing...
													</span>
												)}
											</div>
										</div>
									);
								})}
							</div>
						</div>
					</div>
				) : (
					<div className="mt-6 rounded-md border border-dashed border-white/12 bg-white/5 px-5 py-8 text-center">
						<p className="text-sm uppercase tracking-[0.26em] text-slate-500">
							Squad Empty
						</p>
						<h3 className="mt-3 text-xl font-semibold text-white">
							Start building a six-pack.
						</h3>
						<p className="mt-3 text-sm leading-7 text-slate-300">
							Add Pokemon from the explorer cards and this panel
							will turn into a live type effectiveness console.
						</p>
					</div>
				)}
			</div>
		</aside>
	);
}

function SummaryCard({ title, value, caption }) {
	return (
		<div className="rounded-md border border-white/10 bg-[linear-gradient(135deg,rgba(56,189,248,0.16),rgba(15,23,42,0.2))] p-4">
			<p className="text-xs uppercase tracking-[0.25em] text-sky-100/70">
				{title}
			</p>
			<p className="mt-2 text-2xl font-semibold text-white">{value}</p>
			<p className="mt-2 text-sm text-slate-300">{caption}</p>
		</div>
	);
}

function InsightPanel({ title, items, emptyLabel }) {
	return (
		<div className="rounded-md border border-white/10 bg-black/15 p-4">
			<h3 className="text-lg font-semibold text-white">{title}</h3>
			<div className="mt-4 space-y-3">
				{items.length ? (
					items.map((item) => (
						<div
							key={`${title}-${item.label}`}
							className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/5 px-3 py-3"
						>
							<div className="flex items-center gap-3">
								<TypeDot type={item.type} />
								<div>
									<p className="text-sm font-medium text-white">
										{item.label}
									</p>
									<p className="text-xs uppercase tracking-[0.18em] text-slate-500">
										{item.meta}
									</p>
								</div>
							</div>
						</div>
					))
				) : (
					<p className="text-sm text-slate-400">{emptyLabel}</p>
				)}
			</div>
		</div>
	);
}

function PressureRow({ label, weak, resist, immune, total, type }) {
	const exposedWidth = total ? (weak / total) * 100 : 0;
	const coveredWidth = total ? ((resist + immune) / total) * 100 : 0;
	const meta = getTypeMeta(type);

	return (
		<div>
			<div className="mb-2 flex items-center justify-between gap-3">
				<div className="flex items-center gap-3">
					<TypeDot type={type} />
					<span className="text-sm font-medium text-white">
						{label}
					</span>
				</div>
				<span className="text-xs uppercase tracking-[0.18em] text-slate-500">
					{weak} weak · {resist} resist · {immune} immune
				</span>
			</div>

			<div className="h-2 overflow-hidden rounded-full bg-white/8">
				<div
					className="h-full rounded-full"
					style={{
						width: `${exposedWidth}%`,
						background: `linear-gradient(90deg, ${meta.color}, ${meta.accent})`,
					}}
				/>
			</div>

			<div className="mt-2 h-2 overflow-hidden rounded-full bg-white/8">
				<div
					className="h-full rounded-full bg-emerald-300/70"
					style={{ width: `${coveredWidth}%` }}
				/>
			</div>
		</div>
	);
}

function TypeBadge({ type, small = false }) {
	const meta = getTypeMeta(type);

	return (
		<span
			className={`inline-flex items-center rounded-full border font-medium ${
				small ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs"
			}`}
			style={{
				backgroundColor: `${meta.color}1e`,
				borderColor: `${meta.color}4a`,
				color: meta.color,
			}}
		>
			{formatLabel(type)}
		</span>
	);
}

function TypeDot({ type }) {
	const meta = getTypeMeta(type);

	return (
		<span
			className="inline-flex h-3 w-3 rounded-full"
			style={{
				backgroundColor: meta.color,
				boxShadow: `0 0 16px ${meta.color}`,
			}}
		/>
	);
}
