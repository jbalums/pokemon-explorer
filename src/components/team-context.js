"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

const TEAM_STORAGE_KEY = "pokedex-drift-team";
const MAX_TEAM_SIZE = 6;

const TeamContext = createContext(null);

export function TeamProvider({ children }) {
  const [team, setTeam] = useState([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(TEAM_STORAGE_KEY);

      if (saved) {
        const parsed = JSON.parse(saved);

        if (Array.isArray(parsed)) {
          setTeam(parsed.slice(0, MAX_TEAM_SIZE));
        }
      }
    } catch {
      setTeam([]);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    window.localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(team));
  }, [isHydrated, team]);

  const value = useMemo(
    () => ({
      team,
      isHydrated,
      isInTeam(name) {
        return team.some((member) => member.name === name);
      },
      addToTeam(member) {
        setTeam((current) => {
          if (current.some((entry) => entry.name === member.name)) {
            return current;
          }

          if (current.length >= MAX_TEAM_SIZE) {
            return current;
          }

          return [...current, member];
        });
      },
      removeFromTeam(name) {
        setTeam((current) => current.filter((member) => member.name !== name));
      },
      toggleTeamMember(member) {
        setTeam((current) => {
          if (current.some((entry) => entry.name === member.name)) {
            return current.filter((entry) => entry.name !== member.name);
          }

          if (current.length >= MAX_TEAM_SIZE) {
            return current;
          }

          return [...current, member];
        });
      },
      clearTeam() {
        setTeam([]);
      },
      isTeamFull: team.length >= MAX_TEAM_SIZE,
      maxTeamSize: MAX_TEAM_SIZE,
    }),
    [isHydrated, team],
  );

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
}

export function useTeam() {
  const context = useContext(TeamContext);

  if (!context) {
    throw new Error("useTeam must be used inside TeamProvider");
  }

  return context;
}
