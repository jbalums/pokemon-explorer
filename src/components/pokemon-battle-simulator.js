"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useTeam } from "./team-context";
import {
	fetchPokemonByName,
	fetchPokemonDirectory,
	fetchTypeByName,
	fetchTypes,
	getPokemonArtwork,
} from "../lib/pokeapi";
import {
	formatLabel,
	getBaseStatTotal,
	getDefensiveMultiplier,
	getTypeGlow,
	getTypeMeta,
} from "../lib/pokemon-utils";

const DEFAULT_LEFT = "charizard";
const DEFAULT_RIGHT = "blastoise";
const SPECIAL_ATTACK_TYPES = new Set([
	"electric",
	"fire",
	"grass",
	"ice",
	"psychic",
	"water",
	"dragon",
	"dark",
]);

export default function PokemonBattleSimulator() {
	const [leftName, setLeftName] = useState(DEFAULT_LEFT);
	const [rightName, setRightName] = useState(DEFAULT_RIGHT);
	const [leftMoveType, setLeftMoveType] = useState("auto");
	const [rightMoveType, setRightMoveType] = useState("auto");
	const [pace, setPace] = useState("balanced");
	const { team } = useTeam();

	// API integration: the directory powers the datalist so users can type any Pokemon name.
	const directoryQuery = useQuery({
		queryKey: ["pokemon-directory"],
		queryFn: ({ signal }) => fetchPokemonDirectory({ signal }),
	});

	// Each combatant is fetched independently so changing one side does not reset the other.
	const leftQuery = useQuery({
		queryKey: ["battle-pokemon", normalizePokemonName(leftName)],
		queryFn: ({ signal }) =>
			fetchPokemonByName(normalizePokemonName(leftName), { signal }),
		enabled: Boolean(normalizePokemonName(leftName)),
		staleTime: 1000 * 60 * 60 * 12,
	});

	// The right-side query mirrors the challenger query and shares cache keys by Pokemon name.
	const rightQuery = useQuery({
		queryKey: ["battle-pokemon", normalizePokemonName(rightName)],
		queryFn: ({ signal }) =>
			fetchPokemonByName(normalizePokemonName(rightName), { signal }),
		enabled: Boolean(normalizePokemonName(rightName)),
		staleTime: 1000 * 60 * 60 * 12,
	});

	// Saved team entries become quick-pick chips after they are hydrated from PokeAPI.
	const teamQueries = useQueries({
		queries: team.map((member) => ({
			queryKey: ["pokemon-team", member.name],
			queryFn: ({ signal }) =>
				fetchPokemonByName(member.name, { signal }),
			staleTime: 1000 * 60 * 60 * 12,
		})),
	});

	// Type relation data is fetched once and transformed into the battle effectiveness matrix.
	const typeListQuery = useQuery({
		queryKey: ["pokemon-types"],
		queryFn: ({ signal }) => fetchTypes({ signal }),
		staleTime: 1000 * 60 * 60 * 12,
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

	const leftPokemon = leftQuery.data;
	const rightPokemon = rightQuery.data;
	const matrixReady = Object.keys(typeMatrix).length > 0;
	const safeLeftMoveType = isPokemonType(leftPokemon, leftMoveType)
		? leftMoveType
		: "auto";
	const safeRightMoveType = isPokemonType(rightPokemon, rightMoveType)
		? rightMoveType
		: "auto";

	// Complex logic: the forecast is derived from combatants, move typing, pace, and type matrix.
	const simulation = useMemo(() => {
		if (!leftPokemon || !rightPokemon || !matrixReady) {
			return null;
		}

		return simulateBattle({
			leftPokemon,
			rightPokemon,
			leftMoveType:
				safeLeftMoveType === "auto"
					? getBestMoveType(leftPokemon, rightPokemon, typeMatrix)
					: safeLeftMoveType,
			rightMoveType:
				safeRightMoveType === "auto"
					? getBestMoveType(rightPokemon, leftPokemon, typeMatrix)
					: safeRightMoveType,
			pace,
			typeMatrix,
		});
	}, [
		leftPokemon,
		matrixReady,
		pace,
		rightPokemon,
		safeLeftMoveType,
		safeRightMoveType,
		typeMatrix,
	]);

	const directory = directoryQuery.data ?? [];
	const winner = simulation?.winner;
	const heroTypes = leftPokemon?.types.map((entry) => entry.type.name) ?? [
		"electric",
		"water",
	];

	return (
		<div className="flex-1">
			<div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
				<section
					className="glass-panel noise-overlay relative overflow-hidden rounded-sm p-5 sm:p-8"
					style={getTypeGlow(heroTypes)}
				>
					<div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
						<div>
							<Link
								href="/"
								className="inline-flex rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm text-slate-200 hover:border-white/20 hover:bg-white/10"
							>
								Back to explorer
							</Link>
							<p className="mt-6 text-xs uppercase tracking-[0.3em] text-sky-200/70">
								Battle Simulator
							</p>
							<h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
								Test one-on-one matchups in the battle lab.
							</h1>
							<p className="mt-4 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
								Choose any Pokemon, tune their move typing and
								battle pace, then preview a deterministic
								turn-by-turn forecast based on stats, speed,
								STAB, and type effectiveness.
							</p>
						</div>

						<div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
							<MetricCard
								label="Current Winner"
								value={
									winner
										? formatLabel(winner.name)
										: "Awaiting Data"
								}
								caption="Predicted by remaining HP"
							/>
							<MetricCard
								label="Battle Pace"
								value={formatLabel(pace)}
								caption="Changes damage and endurance"
							/>
							<MetricCard
								label="Type Matrix"
								value={matrixReady ? "Ready" : "Loading"}
								caption="Fetched from PokeAPI type relations"
							/>
						</div>
					</div>
				</section>

				<div className="flex flex-col gap-8 ">
					<section className="glass-panel rounded-sm p-5 sm:p-6">
						<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
							<div>
								<p className="text-xs uppercase tracking-[0.28em] text-sky-200/70">
									Combatants
								</p>
								<h2 className="mt-2 text-2xl font-semibold text-white">
									Build the matchup
								</h2>
								<p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
									Type a Pokemon name or use the quick-pick
									chips from your saved team. The datalist is
									powered by the full PokeAPI directory.
								</p>
							</div>
							<span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.18em] text-slate-400">
								{directory.length
									? `${directory.length}+ Pokemon`
									: "Loading"}
							</span>
						</div>

						<div className="mt-6 flex flex-col gap-4">
							<BattlePicker
								label="Challenger"
								moveType={safeLeftMoveType}
								onMoveTypeChange={setLeftMoveType}
								onPokemonChange={setLeftName}
								pokemon={leftPokemon}
								pokemonError={leftQuery.isError}
								pokemonName={leftName}
								side="left"
							/>
							<BattlePicker
								label="Rival"
								moveType={safeRightMoveType}
								onMoveTypeChange={setRightMoveType}
								onPokemonChange={setRightName}
								pokemon={rightPokemon}
								pokemonError={rightQuery.isError}
								pokemonName={rightName}
								side="right"
							/>
						</div>

						<datalist id="pokemon-battle-directory">
							{directory.map((entry) => (
								<option key={entry.name} value={entry.name} />
							))}
						</datalist>

						<div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
							<div className="rounded-sm border border-white/10 bg-black/15 p-4">
								<p className="text-xs uppercase tracking-[0.22em] text-slate-500">
									Quick picks
								</p>
								<div className="mt-3 flex flex-wrap gap-2">
									{teamPokemon.length ? (
										teamPokemon.map((pokemon) => (
											<button
												key={pokemon.name}
												type="button"
												onClick={() => {
													setLeftName(pokemon.name);
													setLeftMoveType("auto");
												}}
												className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 hover:border-sky-200/40 hover:bg-sky-400/10"
											>
												{formatLabel(pokemon.name)}
											</button>
										))
									) : (
										<p className="text-sm leading-7 text-slate-400">
											Add Pokemon to your team on the
											explorer page to surface quick-pick
											chips here.
										</p>
									)}
								</div>
							</div>

							<label className="block rounded-sm border border-white/10 bg-black/15 p-4">
								<span className="text-xs uppercase tracking-[0.22em] text-slate-500">
									Battle pace
								</span>
								<select
									value={pace}
									onChange={(event) =>
										setPace(event.target.value)
									}
									className="mt-3 w-full cursor-pointer rounded-sm border border-white/10 bg-slate-950/70 px-3 py-3 text-sm text-white outline-none"
								>
									<option value="balanced">
										Balanced forecast
									</option>
									<option value="aggressive">
										Aggressive damage race
									</option>
									<option value="guarded">
										Guarded endurance duel
									</option>
								</select>
							</label>
						</div>
					</section>

					<section className="glass-panel rounded-sm p-5 sm:p-6">
						<p className="text-xs uppercase tracking-[0.28em] text-sky-200/70">
							Forecast
						</p>
						<h2 className="mt-2 text-2xl font-semibold text-white">
							Battle result
						</h2>
						<p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
							This is a planning simulator, not a full cartridge
							battle engine: it intentionally favors readability
							and tactical comparison.
						</p>

						<div className="mt-6">
							{simulation ? (
								<BattleResult
									simulation={simulation}
									winner={winner}
								/>
							) : (
								<div className="rounded-sm border border-white/10 bg-white/5 p-6 text-sm leading-7 text-slate-300">
									Loading combatants and type relations. If a
									Pokemon name does not resolve, check the
									spelling against the PokeAPI directory
									suggestions.
								</div>
							)}
						</div>
					</section>
				</div>
			</div>
		</div>
	);
}

function BattlePicker({
	label,
	moveType,
	onMoveTypeChange,
	onPokemonChange,
	pokemon,
	pokemonError,
	pokemonName,
	side,
}) {
	const types = pokemon?.types.map((entry) => entry.type.name) ?? [];

	return (
		<div className="rounded-sm border border-white/10 bg-black/15 p-4">
			<p className="text-xs uppercase tracking-[0.22em] text-slate-500">
				{label}
			</p>

			<input
				value={pokemonName}
				onChange={(event) => {
					onPokemonChange(normalizePokemonName(event.target.value));
					onMoveTypeChange("auto");
				}}
				list="pokemon-battle-directory"
				placeholder={side === "left" ? DEFAULT_LEFT : DEFAULT_RIGHT}
				className="mt-3 w-full rounded-sm border border-white/10 bg-slate-950/70 px-3 py-3 text-sm text-white outline-none placeholder:text-slate-500"
			/>

			{pokemon ? (
				<div
					className="mt-4 rounded-sm border border-white/10 p-4"
					style={getTypeGlow(types)}
				>
					<div className="flex items-center gap-4">
						<div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-sm border border-white/10 bg-black/15">
							<Image
								src={getPokemonArtwork(pokemon)}
								alt={pokemon.name}
								width={88}
								height={88}
								unoptimized
								className="h-20 w-20 object-contain drop-shadow-[0_18px_26px_rgba(2,6,23,0.7)]"
							/>
						</div>
						<div className="min-w-0">
							<p className="truncate text-xl font-semibold text-white">
								{formatLabel(pokemon.name)}
							</p>
							<p className="mt-1 text-sm text-slate-300">
								<b>BST:</b> {getBaseStatTotal(pokemon.stats)} ·
								<b>SPD:</b> {getStatValue(pokemon, "speed")} ·
								<b>HP:</b> {getStatValue(pokemon, "hp")}
							</p>
							<div className="mt-3 flex flex-wrap gap-2">
								{types.map((typeName) => (
									<TypeBadge key={typeName} type={typeName} />
								))}
							</div>
						</div>
					</div>

					<select
						value={moveType}
						onChange={(event) =>
							onMoveTypeChange(event.target.value)
						}
						className="mt-4 w-full cursor-pointer rounded-sm border border-white/10 bg-slate-950/70 px-3 py-3 text-sm text-white outline-none"
					>
						<option value="auto">Auto best STAB</option>
						{types.map((typeName) => (
							<option key={typeName} value={typeName}>
								{formatLabel(typeName)} attack
							</option>
						))}
					</select>
				</div>
			) : (
				<div className="mt-4 rounded-sm border border-dashed border-white/12 bg-white/5 p-5 text-sm text-slate-300">
					{pokemonError
						? "That Pokemon could not be found. Try a lowercase API name like mr-mime or ho-oh."
						: "Loading Pokemon battle data..."}
				</div>
			)}
		</div>
	);
}

function BattleResult({ simulation, winner }) {
	return (
		<div className="space-y-5">
			<div className="rounded-sm border border-white/10 bg-white/5 p-5">
				<div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
					<div>
						<p className="text-xs uppercase tracking-[0.22em] text-slate-500">
							Predicted winner
						</p>
						<h3 className="mt-2 text-3xl font-semibold text-white">
							{winner ? formatLabel(winner.name) : "Draw"}
						</h3>
						<p className="mt-2 text-sm leading-7 text-slate-300">
							Speed determines turn order. The winner is selected
							by remaining HP after the forecast window or by
							knockout.
						</p>
					</div>
					<div className="grid gap-3 sm:grid-cols-2 lg:min-w-80">
						<BattleHpMeter fighter={simulation.left} />
						<BattleHpMeter fighter={simulation.right} />
					</div>
				</div>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				<BattleDamageCard fighter={simulation.left} />
				<BattleDamageCard fighter={simulation.right} />
			</div>

			<div className="rounded-sm border border-white/10 bg-black/15 p-5">
				<div className="flex items-center justify-between gap-4">
					<h3 className="text-lg font-semibold text-white">
						Battle log
					</h3>
					<span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.18em] text-slate-500">
						{simulation.turns.length} turns
					</span>
				</div>
				<div className="soft-scrollbar mt-4 max-h-[32rem] space-y-2 overflow-auto pr-1">
					{simulation.turns.map((turn) => (
						<div
							key={`${turn.round}-${turn.attacker}-${turn.remainingHp}-${turn.order}`}
							className="rounded-sm border border-white/8 bg-white/5 px-4 py-3 text-sm leading-6 text-slate-300"
						>
							<span className="font-semibold text-white">
								Turn {turn.round}: {formatLabel(turn.attacker)}
							</span>{" "}
							used a {formatLabel(turn.moveType)} strike for{" "}
							<span className="text-sky-100">{turn.damage}</span>{" "}
							damage against {formatLabel(turn.defender)}.
							<span className="ml-1 text-slate-500">
								{turn.effectivenessLabel} ·{" "}
								{turn.defenderHpLabel}
							</span>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

function BattleHpMeter({ fighter }) {
	const meta = getTypeMeta(fighter.moveType);
	const hpPercent = Math.max(
		0,
		Math.round((fighter.remainingHp / fighter.maxHp) * 100),
	);

	return (
		<div className="rounded-sm border border-white/10 bg-black/15 p-4">
			<p className="truncate text-sm font-semibold text-white">
				{formatLabel(fighter.pokemon.name)}
			</p>
			<p className="mt-1 text-xs text-slate-400">
				{Math.max(0, fighter.remainingHp)}/{fighter.maxHp} HP
			</p>
			<div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10">
				<div
					className="h-full rounded-full"
					style={{
						width: `${hpPercent}%`,
						background: `linear-gradient(90deg, ${meta.color}, ${meta.accent})`,
					}}
				/>
			</div>
		</div>
	);
}

function BattleDamageCard({ fighter }) {
	const meta = getTypeMeta(fighter.moveType);

	return (
		<div className="rounded-sm border border-white/10 bg-black/15 p-5">
			<div className="flex items-center justify-between gap-3">
				<div>
					<p className="text-lg font-semibold text-white">
						{formatLabel(fighter.pokemon.name)}
					</p>
					<p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
						{formatLabel(fighter.moveType)} strike
					</p>
				</div>
				<TypeDot type={fighter.moveType} />
			</div>
			<div className="mt-5 grid grid-cols-3 gap-2 text-center">
				<BattleStat label="Damage" value={fighter.damage} />
				<BattleStat label="Type" value={`x${fighter.multiplier}`} />
				<BattleStat label="STAB" value={`x${fighter.stab}`} />
			</div>
			<div
				className="mt-5 h-1 rounded-full"
				style={{
					background: `linear-gradient(90deg, ${meta.color}, transparent)`,
				}}
			/>
		</div>
	);
}

function BattleStat({ label, value }) {
	return (
		<div className="rounded-sm bg-white/5 px-2 py-4">
			<p className="text-xl font-semibold text-white">{value}</p>
			<p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-slate-500">
				{label}
			</p>
		</div>
	);
}

function MetricCard({ label, value, caption }) {
	return (
		<div className="rounded-sm border border-white/10 bg-white/6 px-4 py-4 shadow-lg shadow-slate-950/20">
			<p className="text-xs uppercase tracking-[0.26em] text-slate-400">
				{label}
			</p>
			<p className="mt-3 text-2xl font-semibold text-white">{value}</p>
			<p className="mt-2 text-sm text-slate-400">{caption}</p>
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
			className="inline-flex h-4 w-4 rounded-full"
			style={{
				backgroundColor: meta.color,
				boxShadow: `0 0 18px ${meta.color}`,
			}}
		/>
	);
}

function simulateBattle({
	leftPokemon,
	rightPokemon,
	leftMoveType,
	rightMoveType,
	pace,
	typeMatrix,
}) {
	const paceSettings = {
		aggressive: { damageScale: 1.16, hpScale: 0.92, maxRounds: 6 },
		balanced: { damageScale: 1, hpScale: 1, maxRounds: 6 },
		guarded: { damageScale: 0.86, hpScale: 1.12, maxRounds: 7 },
	};
	const settings = paceSettings[pace] ?? paceSettings.balanced;
	const left = buildFighter(
		leftPokemon,
		rightPokemon,
		leftMoveType,
		typeMatrix,
		settings,
	);
	const right = buildFighter(
		rightPokemon,
		leftPokemon,
		rightMoveType,
		typeMatrix,
		settings,
	);
	const first =
		getStatValue(leftPokemon, "speed") >=
		getStatValue(rightPokemon, "speed")
			? left
			: right;
	const second = first === left ? right : left;
	const turns = [];

	// Run a deterministic forecast so repeated matchups are easy to compare and explain.
	for (let round = 1; round <= settings.maxRounds; round += 1) {
		for (const fighter of [first, second]) {
			const defender = fighter === left ? right : left;

			if (fighter.remainingHp <= 0 || defender.remainingHp <= 0) {
				continue;
			}

			defender.remainingHp = Math.max(
				0,
				defender.remainingHp - fighter.damage,
			);
			turns.push({
				round,
				order: turns.length + 1,
				attacker: fighter.pokemon.name,
				defender: defender.pokemon.name,
				moveType: fighter.moveType,
				damage: fighter.damage,
				effectivenessLabel: describeMultiplier(fighter.multiplier),
				remainingHp: defender.remainingHp,
				defenderHpLabel: `${Math.max(0, defender.remainingHp)}/${defender.maxHp} HP left`,
			});
		}

		if (left.remainingHp <= 0 || right.remainingHp <= 0) {
			break;
		}
	}

	const winner =
		left.remainingHp === right.remainingHp
			? null
			: left.remainingHp > right.remainingHp
				? left.pokemon
				: right.pokemon;

	return { left, right, turns, winner };
}

function buildFighter(attacker, defender, moveType, typeMatrix, settings) {
	const attackerTypes = attacker.types.map((entry) => entry.type.name);
	const defenderTypes = defender.types.map((entry) => entry.type.name);
	const isSpecialType = SPECIAL_ATTACK_TYPES.has(moveType);
	const attackStat = getStatValue(
		attacker,
		isSpecialType ? "special-attack" : "attack",
	);
	const defenseStat = getStatValue(
		defender,
		isSpecialType ? "special-defense" : "defense",
	);
	const hp = getStatValue(attacker, "hp");
	const multiplier = getDefensiveMultiplier(
		moveType,
		defenderTypes,
		typeMatrix,
	);
	const stab = attackerTypes.includes(moveType) ? 1.5 : 1;
	// This is a lightweight forecast formula, not a cartridge-accurate Pokemon damage engine.
	const rawDamage =
		(((attackStat * 1.45 + getStatValue(attacker, "speed") * 0.28) /
			Math.max(40, defenseStat)) *
			34 +
			12) *
		multiplier *
		stab *
		settings.damageScale;
	const damage = Math.max(multiplier === 0 ? 0 : 1, Math.round(rawDamage));
	const maxHp = Math.round((hp * 2.25 + 80) * settings.hpScale);

	return {
		pokemon: attacker,
		moveType,
		damage,
		multiplier,
		stab,
		maxHp,
		remainingHp: maxHp,
	};
}

function getBestMoveType(attacker, defender, typeMatrix) {
	const attackerTypes = attacker.types.map((entry) => entry.type.name);
	const defenderTypes = defender.types.map((entry) => entry.type.name);

	// Auto mode chooses the attacker's strongest same-type option against the defender.
	return attackerTypes
		.map((typeName) => ({
			typeName,
			multiplier: getDefensiveMultiplier(
				typeName,
				defenderTypes,
				typeMatrix,
			),
		}))
		.sort((left, right) => right.multiplier - left.multiplier)[0].typeName;
}

function isPokemonType(pokemon, typeName) {
	if (typeName === "auto") {
		return true;
	}

	return Boolean(
		pokemon?.types.some((typeEntry) => typeEntry.type.name === typeName),
	);
}

function getStatValue(pokemon, statName) {
	return (
		pokemon.stats.find((statEntry) => statEntry.stat.name === statName)
			?.base_stat ?? 1
	);
}

function describeMultiplier(multiplier) {
	if (multiplier === 0) {
		return "No effect";
	}

	if (multiplier >= 4) {
		return "Devastatingly effective";
	}

	if (multiplier > 1) {
		return "Super effective";
	}

	if (multiplier < 1) {
		return "Not very effective";
	}

	return "Neutral hit";
}

function normalizePokemonName(value) {
	return String(value).trim().toLowerCase().replace(/\s+/g, "-");
}
