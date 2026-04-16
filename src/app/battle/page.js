import PokemonBattleSimulator from "../../components/pokemon-battle-simulator";

export const metadata = {
	title: "Battle Simulator | Pokedex Drift",
	description:
		"Run tactical Pokemon matchup forecasts with stats, STAB, speed, and type effectiveness.",
};

export default function BattlePage() {
	return <PokemonBattleSimulator />;
}
