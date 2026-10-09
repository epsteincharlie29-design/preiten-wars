// PreitenWars: Auswahl "Wirtschaft" wie bei FrontWars - wie schnell man Gold verdient.
// Setzt intern den vorhandenen Gold-Multiplikator (goldMultiplier) der Spiel-Einstellungen.
import { html, TemplateResult } from "lit";

export const ECONOMY_PRESETS: { label: string; value: number }[] = [
  { label: "Sehr langsam", value: 0.5 },
  { label: "Langsam", value: 0.75 },
  { label: "Normal", value: 1 },
  { label: "Schnell", value: 2 },
  { label: "Sehr schnell", value: 3 },
  { label: "Turbo", value: 5 },
];

/** current: aktiver Multiplikator (1 = normal) */
export function renderEconomyPicker(
  current: number,
  set: (value: number) => void,
): TemplateResult {
  return html`<div
    class="col-span-full rounded-lg border border-white/15 bg-black/30 p-3"
  >
    <div class="mb-2 text-sm font-bold uppercase tracking-wide text-white">
      💰 Wirtschaft
      <span class="ml-2 font-normal normal-case text-white/60"
        >wie schnell ihr Gold verdient (x${current})</span
      >
    </div>
    <div class="flex flex-wrap gap-2">
      ${ECONOMY_PRESETS.map(
        (p) =>
          html`<button
            type="button"
            class="rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${Math.abs(
              current - p.value,
            ) < 0.001
              ? "bg-yellow-400 text-black"
              : "bg-white/10 text-white hover:bg-white/20"}"
            @click=${() => set(p.value)}
          >
            ${p.label} <span class="opacity-70">x${p.value}</span>
          </button>`,
      )}
    </div>
  </div>`;
}
