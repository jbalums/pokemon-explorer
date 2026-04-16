import Link from "next/link";

const navItems = [
	{ href: "/", label: "Explorer" },
	{ href: "/battle", label: "Battle Lab" },
];

export default function SiteHeader() {
	return (
		<header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
			<div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
				<Link href="/" className="group inline-flex items-center gap-3">
					<span className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-sky-300/25 bg-sky-400/10 shadow-lg shadow-sky-950/30">
						<span className="h-4 w-4 rounded-full border-2 border-white bg-rose-400 shadow-[0_0_22px_rgba(251,113,133,0.8)]" />
					</span>
					<span>
						<span className="block text-lg font-semibold tracking-tight text-white group-hover:text-sky-100">
							Pokedex Drift
						</span>
						<span className="block text-xs uppercase tracking-[0.22em] text-slate-500">
							Scout. Build. Battle.
						</span>
					</span>
				</Link>

				<nav
					aria-label="Primary navigation"
					className="flex flex-wrap items-center gap-2"
				>
					{navItems.map((item) => (
						<Link
							key={item.href}
							href={item.href}
							className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 hover:border-sky-200/40 hover:bg-sky-300/10 hover:text-sky-100"
						>
							{item.label}
						</Link>
					))}
				</nav>
			</div>
		</header>
	);
}
