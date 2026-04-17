"use client";

import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";

const navItems = [
	{ href: "/", label: "Pokemon List" },
	{ href: "/battle", label: "Battle Simulator" },
];

const THEME_STORAGE_KEY = "pokedex-theme";
const THEME_CHANGE_EVENT = "pokedex-theme-change";

function getThemeServerSnapshot() {
	return "light";
}

function getThemeSnapshot() {
	const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
	return savedTheme === "dark" || savedTheme === "light"
		? savedTheme
		: "light";
}

function subscribeToThemeStore(callback) {
	window.addEventListener(THEME_CHANGE_EVENT, callback);
	window.addEventListener("storage", callback);

	return () => {
		window.removeEventListener(THEME_CHANGE_EVENT, callback);
		window.removeEventListener("storage", callback);
	};
}

function setStoredTheme(theme) {
	window.localStorage.setItem(THEME_STORAGE_KEY, theme);
	window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

export default function SiteHeader() {
	const theme = useSyncExternalStore(
		subscribeToThemeStore,
		getThemeSnapshot,
		getThemeServerSnapshot,
	);

	useEffect(() => {
		document.documentElement.dataset.theme = theme;
	}, [theme]);

	const isDark = theme === "dark";

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
					<button
						type="button"
						role="switch"
						aria-checked={isDark}
						aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
						onClick={() =>
							setStoredTheme(isDark ? "light" : "dark")
						}
						className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-slate-200 hover:border-amber-200/50 hover:bg-amber-300/10 hover:text-amber-100"
					>
						<span
							className={`relative h-6 w-11 rounded-full border border-white/10 p-0.5 shadow-inner ${
								isDark
									? "bg-slate-900/80"
									: "bg-gradient-to-r from-amber-200 to-sky-200"
							}`}
						>
							<span
								className={`absolute top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[11px] shadow-md transition-transform ${
									isDark
										? "translate-x-5 text-slate-800"
										: "translate-x-0 text-amber-500"
								}`}
							>
								{isDark ? "◐" : "☀"}
							</span>
						</span>
						<span className="min-w-10 text-left">
							{isDark ? "Dark" : "Light"}
						</span>
					</button>
				</nav>
			</div>
		</header>
	);
}
