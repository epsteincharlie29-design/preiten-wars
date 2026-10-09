// PreitenWars-Börse: Fenster mit Aktien, Krypto und Shitcoins (Kurse aus Market.ts)
import { html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import { EventBus } from "../../../core/EventBus";
import { GameUpdateType, MarketTradeUpdate } from "../../../core/game/GameUpdates";
import {
  MARKET_ASSETS,
  MARKET_CATEGORY_NAMES,
  MARKET_FEE,
  MarketCategory,
  marketHistory,
  marketPrice,
  marketRugged,
  marketSeed,
  marketStep,
} from "../../../core/game/Market";
import { Controller } from "../../Controller";
import { SendMarketTradeIntentEvent } from "../../Transport";
import { renderNumber } from "../../Utils";
import { GameView } from "../../view";

type Tab = MarketCategory | "depot";

@customElement("preiten-market")
export class MarketPanel extends LitElement implements Controller {
  public game: GameView;
  public eventBus: EventBus;

  @state() private open = false;
  @state() private tab: Tab = "aktie";
  @state() private step = -1;
  @state() private flash = "";
  private held: number[] = [];
  private seed = 0;

  createRenderRoot() {
    return this; // Tailwind-Klassen der Seite benutzen
  }

  init() {
    this.seed = marketSeed(String(this.game.gameID()));
  }

  tick() {
    if (!this.game) return;
    const me = this.game.myPlayer();
    const ups = this.game.updatesSinceLastTick();
    const trades = (ups?.[GameUpdateType.MarketTradeEvent] ?? []) as MarketTradeUpdate[];
    for (const t of trades) {
      if (!me || t.playerId !== me.id()) continue;
      this.held[t.asset] = t.held;
      const a = MARKET_ASSETS[t.asset];
      this.flash =
        t.delta > 0
          ? `${t.delta}x ${a.name} gekauft (-${renderNumber(t.gold)} Gold)`
          : `${-t.delta}x ${a.name} verkauft (+${renderNumber(-t.gold)} Gold)`;
      this.requestUpdate();
    }
    const st = marketStep(this.game.ticks());
    if (st !== this.step) this.step = st;
  }

  private price(a: number) {
    return marketPrice(this.seed, a, this.game.ticks());
  }

  private gold(): number {
    const me = this.game?.myPlayer();
    return me ? Number(me.gold()) : 0;
  }

  private buy(a: number, part: number) {
    const n = Math.floor((this.gold() * part) / (this.price(a) * (1 + MARKET_FEE)));
    if (n > 0) this.eventBus.emit(new SendMarketTradeIntentEvent(a, n));
  }

  private sell(a: number, part: number) {
    const h = this.held[a] ?? 0;
    const n = part >= 1 ? h : Math.floor(h * part);
    if (n > 0) this.eventBus.emit(new SendMarketTradeIntentEvent(a, -n));
  }

  private spark(a: number) {
    const hist = marketHistory(this.seed, a, this.game.ticks(), 40);
    if (hist.length < 2) return html``;
    const lo = Math.min(...hist), hi = Math.max(...hist), span = hi - lo || 1;
    const pts = hist.map((p, i) => `${(i / (hist.length - 1)) * 78 + 1},${23 - ((p - lo) / span) * 22}`).join(" ");
    const up = hist[hist.length - 1] >= hist[0];
    return html`<svg width="80" height="24" viewBox="0 0 80 24" class="shrink-0">
      <polyline points=${pts} fill="none" stroke=${up ? "#4ade80" : "#f87171"} stroke-width="1.5" />
    </svg>`;
  }

  private row(a: number) {
    const asset = MARKET_ASSETS[a];
    const p = this.price(a);
    const hist = marketHistory(this.seed, a, this.game.ticks(), 16);
    const ch = hist.length > 1 ? (p / hist[0] - 1) * 100 : 0;
    const rug = asset.cat === "shitcoin" && marketRugged(this.seed, a, this.game.ticks());
    const h = this.held[a] ?? 0;
    const btn = "rounded px-2 py-1 text-xs font-bold";
    return html`<div class="border-b border-white/10 py-2">
      <div class="flex items-center gap-2">
        <div class="min-w-0 flex-1">
          <div class="truncate text-sm font-bold text-white">
            ${asset.name} <span class="text-xs text-white/50">${asset.id}</span>
            ${rug ? html`<span class="ml-1 rounded bg-red-600 px-1 text-xs">RUG PULL!</span>` : ""}
          </div>
          <div class="text-xs text-white/80">
            ${renderNumber(p)} Gold
            <span class=${ch >= 0 ? "text-green-400" : "text-red-400"}>${ch >= 0 ? "▲" : "▼"} ${ch.toFixed(1)}%</span>
          </div>
        </div>
        ${this.spark(a)}
      </div>
      ${h > 0
        ? html`<div class="mt-1 text-xs text-yellow-300">Du hast ${h} Stück = ${renderNumber(h * p)} Gold</div>`
        : ""}
      <div class="mt-1 flex flex-wrap gap-1">
        <button class="${btn} bg-green-700 hover:bg-green-600" @click=${() => this.buy(a, 0.1)}>Kaufen 10%</button>
        <button class="${btn} bg-green-700 hover:bg-green-600" @click=${() => this.buy(a, 0.5)}>Kaufen 50%</button>
        <button class="${btn} bg-red-800 hover:bg-red-700 disabled:opacity-40" ?disabled=${h <= 0} @click=${() => this.sell(a, 0.5)}>Verk. 50%</button>
        <button class="${btn} bg-red-800 hover:bg-red-700 disabled:opacity-40" ?disabled=${h <= 0} @click=${() => this.sell(a, 1)}>Alles verk.</button>
      </div>
    </div>`;
  }

  render() {
    if (!this.game || !this.game.myPlayer()) return html``;
    const toggle = html`<button
      class="fixed left-2 top-1/2 z-[1000] -translate-y-1/2 rounded-lg border border-yellow-400/60 bg-slate-900/90 px-3 py-2 text-sm font-bold text-yellow-300 shadow-lg hover:bg-slate-800"
      @click=${() => (this.open = !this.open)}
    >📈 BÖRSE</button>`;
    if (!this.open) return toggle;
    const idx = MARKET_ASSETS.map((_, i) => i);
    const list = this.tab === "depot" ? idx.filter((i) => (this.held[i] ?? 0) > 0) : idx.filter((i) => MARKET_ASSETS[i].cat === this.tab);
    const total = idx.reduce((s, i) => s + (this.held[i] ?? 0) * this.price(i), 0);
    const tabs: Tab[] = ["aktie", "krypto", "shitcoin", "depot"];
    return html`${toggle}
      <div class="fixed left-2 top-16 z-[1000] flex max-h-[75vh] w-[360px] max-w-[92vw] flex-col rounded-xl border border-white/15 bg-slate-900/95 p-3 text-white shadow-2xl">
        <div class="mb-2 flex items-center justify-between">
          <div class="text-lg font-bold">📈 Preiten-Börse</div>
          <button class="text-white/60 hover:text-white" @click=${() => (this.open = false)}>✕</button>
        </div>
        <div class="mb-2 text-xs text-white/70">
          Depot-Wert: <b class="text-yellow-300">${renderNumber(total)} Gold</b> · Gebühr ${MARKET_FEE * 100}% · Kurse alle 2 s
        </div>
        <div class="mb-2 flex gap-1">
          ${tabs.map(
            (t) => html`<button
              class="flex-1 rounded px-1 py-1 text-xs font-bold ${this.tab === t ? "bg-yellow-400 text-black" : "bg-white/10 hover:bg-white/20"}"
              @click=${() => (this.tab = t)}
            >${t === "depot" ? "Depot" : MARKET_CATEGORY_NAMES[t]}</button>`,
          )}
        </div>
        ${this.tab === "shitcoin"
          ? html`<div class="mb-1 text-xs text-orange-300">Achtung: Shitcoins können x4 machen - oder über Nacht rug-gepullt werden!</div>`
          : ""}
        <div class="overflow-y-auto pr-1">
          ${list.length ? list.map((i) => this.row(i)) : html`<div class="py-4 text-center text-sm text-white/60">Noch nichts im Depot.</div>`}
        </div>
        ${this.flash ? html`<div class="mt-2 text-xs text-green-300">${this.flash}</div>` : ""}
      </div>`;
  }
}
