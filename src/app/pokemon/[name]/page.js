import PokemonDetail from "../../../components/pokemon-detail";

export default async function PokemonDetailPage({ params }) {
  const { name } = await params;

  return <PokemonDetail name={name} />;
}
