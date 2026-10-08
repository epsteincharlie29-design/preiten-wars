import { LitElement, html } from "lit";
import { customElement } from "lit/decorators.js";
import type { HostLobbyModal } from "../HostLobbyModal";
import type { JoinLobbyModal } from "../JoinLobbyModal";
import type { SinglePlayerModal } from "../SinglePlayerModal";
import type { UsernameInput } from "../UsernameInput";
import "./CosmeticBackground";
import "./PreitenLogo";

// Reduzierte Startseite: Name, Solo-Spiel und private Lobbys mit Freunden.
// Öffentliche Lobbys, Ranked, News, Streams, Shop und Links sind entfernt.
@customElement("play-page")
export class PlayPage extends LitElement {
  createRenderRoot() {
    return this;
  }

  private canPlay(): boolean {
    const usernameInput = document.querySelector(
      "username-input",
    ) as UsernameInput | null;
    return !usernameInput || usernameInput.canPlay();
  }

  private startSolo = () => {
    if (!this.canPlay()) return;
    (
      document.querySelector("single-player-modal") as SinglePlayerModal | null
    )?.open();
  };

  private hostLobby = () => {
    if (!this.canPlay()) return;
    (
      document.querySelector("host-lobby-modal") as HostLobbyModal | null
    )?.open();
  };

  private joinLobby = () => {
    if (!this.canPlay()) return;
    (
      document.querySelector("join-lobby-modal") as JoinLobbyModal | null
    )?.open();
  };

  private openPage(id: string) {
    window.showPage?.(id);
  }

  render() {
    return html`
      <div
        id="page-play"
        class="flex flex-col items-center justify-center gap-6 w-full min-h-dvh px-4 py-10"
      >
        <token-login class="absolute"></token-login>

        <preiten-logo class="mb-4"></preiten-logo>

        <div
          class="relative w-full max-w-md bg-surface border border-white/10 rounded-xl overflow-visible"
        >
          <cosmetic-background
            class="absolute inset-0 z-0 overflow-hidden rounded-xl pointer-events-none"
          ></cosmetic-background>
          <div class="relative z-10 flex items-center bg-surface/80 p-1 rounded-xl">
            <username-input class="flex-1 min-w-0 h-[50px]"></username-input>
          </div>
        </div>

        <button
          @click=${this.startSolo}
          class="w-full max-w-md h-16 bg-blue-600 text-white text-3xl uppercase"
        >
          Solo spielen
        </button>

        <div class="w-full max-w-md flex flex-col gap-2">
          <div
            class="font-display text-center text-sm text-yellow-400 tracking-widest mt-2"
          >
            Mit Freunden spielen
          </div>
          <div class="grid grid-cols-2 gap-3">
            <button
              @click=${this.hostLobby}
              class="h-14 bg-green-600 text-white text-base sm:text-xl uppercase"
            >
              Lobby erstellen
            </button>
            <button
              @click=${this.joinLobby}
              class="h-14 bg-red-600 text-white text-base sm:text-xl uppercase"
            >
              Lobby beitreten
            </button>
          </div>
        </div>

        <!-- Optionen wie im Original: Einstellungen, Anleitung, Sprache -->
        <div class="w-full max-w-md grid grid-cols-3 gap-3 mt-2">
          <button
            @click=${() => this.openPage("page-settings")}
            class="h-12 bg-gray-700 text-white text-sm sm:text-base uppercase"
          >
            ⚙ Optionen
          </button>
          <button
            @click=${() => this.openPage("page-help")}
            class="h-12 bg-gray-700 text-white text-sm sm:text-base uppercase"
          >
            ? Hilfe
          </button>
          <button
            @click=${() => this.openPage("page-language")}
            class="h-12 bg-gray-700 text-white text-sm sm:text-base uppercase"
          >
            🌐 Sprache
          </button>
        </div>

        <!-- Pflicht-Hinweis laut OpenFront-Lizenz (AGPL-3.0, Abschnitt 7) -->
        <p class="mt-6 text-center text-xs text-gray-300/80">
          PreitenWars basiert auf OpenFront (AGPL-3.0) ·
          <span class="font-[Arial]">©</span> OpenFront and Contributors
        </p>
      </div>
    `;
  }
}
