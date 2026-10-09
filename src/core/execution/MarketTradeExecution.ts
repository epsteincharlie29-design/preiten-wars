// PreitenWars-Börse: Aktien / Krypto / Shitcoins kaufen und verkaufen.
// Läuft wie alle Befehle auf allen PCs gleich (Kurs = feste Formel, siehe Market.ts).
import { z } from "zod";
import { Execution, Game, Player } from "../game/Game";
import { GameUpdateType } from "../game/GameUpdates";
import {
  MARKET_ASSETS,
  MARKET_FEE,
  marketPrice,
  marketSeed,
} from "../game/Market";
import { execSnapshotType } from "../snapshot/ExecutionSnapshot";
import type {
  ExecRecord,
  SnapshotReader,
  SnapshotWriter,
} from "../snapshot/SnapshotContext";
import { zPlayerRef } from "../snapshot/SnapshotType";

export class MarketTradeExecution implements Execution {
  private mg: Game;
  private active = true;

  constructor(
    private player: Player,
    private asset: number,
    private shares: number,
    private gameID: string,
  ) {}

  init(mg: Game, ticks: number): void {
    this.mg = mg;
  }

  tick(ticks: number): void {
    this.active = false;
    const a = this.asset;
    if (!Number.isInteger(a) || a < 0 || a >= MARKET_ASSETS.length) return;
    if (!Number.isInteger(this.shares) || this.shares === 0) return;
    if (!this.player.isAlive()) return;
    const price = marketPrice(marketSeed(this.gameID), a, this.mg.ticks());
    const held = this.player.marketShares()[a] ?? 0;
    if (this.shares > 0) {
      // so viele kaufen, wie das Gold reicht (höchstens die gewünschte Anzahl)
      const each = price * (1 + MARKET_FEE);
      const afford = Math.floor(Number(this.player.gold()) / each);
      const n = Math.min(this.shares, afford);
      if (n <= 0) return;
      const cost = BigInt(Math.ceil(each * n));
      if (this.player.gold() < cost) return;
      this.player.removeGold(cost);
      this.player.setMarketShares(a, held + n);
      this.emit(a, n, held + n, Number(cost));
    } else {
      const n = Math.min(-this.shares, held);
      if (n <= 0) return;
      const got = BigInt(Math.floor(price * n * (1 - MARKET_FEE)));
      this.player.setMarketShares(a, held - n);
      if (got > 0n) this.player.addGold(got);
      this.emit(a, -n, held - n, -Number(got));
    }
  }

  private emit(asset: number, delta: number, held: number, gold: number) {
    this.mg.addUpdate({
      type: GameUpdateType.MarketTradeEvent,
      playerId: this.player.id(),
      asset,
      delta,
      held,
      gold,
    });
  }

  isActive(): boolean {
    return this.active;
  }

  activeDuringSpawnPhase(): boolean {
    return false;
  }

  snapshot(w: SnapshotWriter): ExecRecord {
    return MarketTradeExecutionSnapshot.write({
      active: this.active,
      initialized: this.mg !== undefined,
      player: w.player(this.player),
      asset: this.asset,
      shares: this.shares,
      gameID: this.gameID,
    });
  }

  restoreSnapshot(s: MarketTradeState, r: SnapshotReader): void {
    this.active = s.active;
    if (s.initialized) this.mg = r.game;
    this.player = r.player(s.player);
    this.asset = s.asset;
    this.shares = s.shares;
    this.gameID = s.gameID;
  }
}

const MarketTradeStateSchema = z.object({
  active: z.boolean(),
  initialized: z.boolean(),
  player: zPlayerRef(),
  asset: z.number(),
  shares: z.number(),
  gameID: z.string(),
});
type MarketTradeState = z.infer<typeof MarketTradeStateSchema>;

export const MarketTradeExecutionSnapshot = execSnapshotType({
  name: "MarketTrade",
  version: 1,
  schema: MarketTradeStateSchema,
  cls: () => MarketTradeExecution,
});
