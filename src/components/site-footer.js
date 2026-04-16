export default function SiteFooter() {
	return (
		<footer className="border-t border-white/10 bg-slate-950/60">
			<div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-6 text-sm text-slate-400 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
				<p>Pokedex Drift uses live Pokemon data from PokeAPI.</p>
				<p className="text-xs uppercase tracking-[0.22em] text-slate-500">
					React Query · Next.js · Tailwind CSS
				</p>
			</div>
		</footer>
	);
}
