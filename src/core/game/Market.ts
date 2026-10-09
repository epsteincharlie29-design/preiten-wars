// PreitenWars: Fake-Börse mit Aktien, Krypto und Shitcoins.
// Die Kurse sind eine feste Zufallsformel aus (Spiel-ID, Wertpapier, Zeit):
// in jedem Spiel anders, aber für Server und alle Spieler exakt gleich -
// deshalb muss nichts übers Netz geschickt werden.
import { simpleHash } from "../Util";

export type MarketCategory = "aktie" | "krypto" | "shitcoin";

export interface MarketAsset {
  id: string;
  name: string;
  cat: MarketCategory;
  base: number; // Startkurs in Gold
  vol: number; // Schwankung pro Schritt
  drift: number; // Trend pro Schritt
}

export const MARKET_ASSETS: MarketAsset[] = [
  { id: "PRTN", name: "Preiten AG", cat: "aktie", base: 40000, vol: 0.012, drift: 0.0005 },
  { id: "SAFT", name: "Saft & Söhne", cat: "aktie", base: 25000, vol: 0.015, drift: 0.0004 },
  { id: "TBLD", name: "Tebleedd Corp", cat: "aktie", base: 60000, vol: 0.018, drift: 0.0003 },
  { id: "DÖNR", name: "Döner Holding", cat: "aktie", base: 15000, vol: 0.01, drift: 0.0006 },
  { id: "BITL", name: "Bitterlemon Inc", cat: "aktie", base: 30000, vol: 0.022, drift: 0.0 },
  { id: "BTC", name: "Bitcoin", cat: "krypto", base: 300000, vol: 0.035, drift: 0.0008 },
  { id: "ETH", name: "Ethereum", cat: "krypto", base: 90000, vol: 0.042, drift: 0.0007 },
  { id: "SOL", name: "Solana", cat: "krypto", base: 20000, vol: 0.055, drift: 0.0006 },
  { id: "XRP", name: "Ripple", cat: "krypto", base: 5000, vol: 0.05, drift: 0.0003 },
  { id: "GUNZ", name: "GunzerCoin", cat: "shitcoin", base: 400, vol: 0.12, drift: 0.002 },
  { id: "RHB", name: "HackerBoi Token", cat: "shitcoin", base: 900, vol: 0.14, drift: 0.002 },
  { id: "MOON", name: "ToTheMoon", cat: "shitcoin", base: 150, vol: 0.16, drift: 0.003 },
  { id: "PEPE", name: "PreitenPepe", cat: "shitcoin", base: 60, vol: 0.18, drift: 0.003 },
  { id: "KEBAB", name: "KebabInu", cat: "shitcoin", base: 250, vol: 0.15, drift: 0.0025 },
];

export const MARKET_STEP_TICKS = 20; // alle 2 Sekunden ein neuer Kurs
export const MARKET_FEE = 0.01; // 1% Gebühr beim Kaufen und Verkaufen
export const MARKET_CATEGORY_NAMES: Record<MarketCategory, string> = {
  aktie: "Aktien",
  krypto: "Krypto",
  shitcoin: "Shitcoins",
};

interface Series {
  price: number[];
  rug: number; // Schritt des Rug Pulls (-1 = keiner)
}
const cache = new Map<string, Series>();

// deterministischer Zufall 0..1
function rnd(seed: number, a: number, step: number, k: number): number {
  let h = (seed ^ Math.imul(a + 1, 0x9e3779b1) ^ Math.imul(step + 7, 0x85ebca6b) ^ Math.imul(k + 3, 0xc2b2ae35)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return h / 4294967296;
}

function series(seed: number, a: number, upTo: number): Series {
  const key = seed + ":" + a;
  let s = cache.get(key);
  if (!s) {
    const asset = MARKET_ASSETS[a];
    // Startkurs je Spiel etwas anders (+-35%)
    s = { price: [asset.base * (0.65 + rnd(seed, a, 0, 9) * 0.7)], rug: -1 };
    cache.set(key, s);
  }
  const asset = MARKET_ASSETS[a];
  while (s.price.length <= upTo) {
    const step = s.price.length;
    let p = s.price[step - 1];
    // Normalverteilung (ungefähr) aus 3 Zufallszahlen
    const z = (rnd(seed, a, step, 1) + rnd(seed, a, step, 2) + rnd(seed, a, step, 3) - 1.5) * 2;
    let vol = asset.vol;
    if (s.rug >= 0) vol = asset.vol * 0.3; // nach dem Rug Pull: tot
    // nur Grundrechenarten (Math.exp kann je Browser minimal abweichen -> Desync)
    const x = asset.drift + vol * z;
    p *= 1 + x + (x * x) / 2;
    if (asset.cat === "shitcoin" && s.rug < 0) {
      const r = rnd(seed, a, step, 4);
      if (step > 30 && r < 0.0035) {
        p *= 0.01 + rnd(seed, a, step, 5) * 0.03; // RUG PULL: minus 97-99%
        s.rug = step;
      } else if (r > 0.992) {
        p *= 1.6 + rnd(seed, a, step, 6) * 2.4; // Pump: x1.6 - x4
      }
    } else if (asset.cat === "krypto") {
      const r = rnd(seed, a, step, 4);
      if (r < 0.004) p *= 0.6 + rnd(seed, a, step, 5) * 0.2; // Crash
      else if (r > 0.996) p *= 1.3 + rnd(seed, a, step, 6) * 0.4; // Rallye
    }
    s.price.push(Math.max(0.01, p));
  }
  return s;
}

export function marketSeed(gameID: string): number {
  return simpleHash("preiten-markt:" + gameID) >>> 0;
}

export function marketStep(tick: number): number {
  return Math.max(0, Math.floor(tick / MARKET_STEP_TICKS));
}

/** Kurs in Gold zum Spiel-Tick */
export function marketPrice(seed: number, a: number, tick: number): number {
  const st = marketStep(tick);
  return series(seed, a, st).price[st];
}

/** die letzten n Kurse (für Charts) */
export function marketHistory(seed: number, a: number, tick: number, n: number): number[] {
  const st = marketStep(tick);
  const s = series(seed, a, st);
  return s.price.slice(Math.max(0, st - n + 1), st + 1);
}

/** wurde der Shitcoin bis jetzt rug-gepullt? */
export function marketRugged(seed: number, a: number, tick: number): boolean {
  const st = marketStep(tick);
  const s = series(seed, a, st);
  return s.rug >= 0 && s.rug <= st;
}
