// PreitenWars: Einstellung "Bau-Anzahl pro Klick" (im Spielmenü änderbar, wird im Browser gespeichert)
export const PREITEN_BUILD_STACK_KEY = "preiten.buildStack";

export function preitenBuildStack(): number {
  try {
    const n = Number(localStorage.getItem(PREITEN_BUILD_STACK_KEY));
    return Number.isInteger(n) && n >= 1 && n <= 100 ? n : 1;
  } catch {
    return 1;
  }
}
