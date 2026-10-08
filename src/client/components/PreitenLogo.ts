import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";

// Pixel-Logo im Retro-Stil: jeder Buchstabe in einer der vier N64-Farben,
// harte Pixel-Kontur, Treppenschatten und ein kurzes Reinfallen beim Laden.
const COLORS = ["#e0262c", "#ffc800", "#1fa83d", "#1f4fd8"];

@customElement("preiten-logo")
export class PreitenLogo extends LitElement {
  @property({ type: Boolean }) small = false;

  static styles = css`
    :host {
      display: block;
      font-family: "Press Start 2P", "Pixelify Sans", monospace;
      line-height: 1;
      text-align: center;
      user-select: none;
      -webkit-font-smoothing: none;
      font-smooth: never;
    }
    .row {
      display: flex;
      justify-content: center;
      gap: 0.06em;
    }
    .top {
      font-size: var(--logo-size, clamp(1.9rem, 8.5vw, 4rem));
    }
    .bottom {
      font-size: calc(var(--logo-size, clamp(1.9rem, 8.5vw, 4rem)) * 1.25);
      margin-top: 0.25em;
    }
    :host([small]) .top,
    :host([small]) .bottom {
      font-size: 1.1rem;
    }
    span {
      display: inline-block;
      color: var(--c);
      /* harte Pixel-Kontur + Pixel-Treppe nach unten rechts, kein Blur */
      text-shadow:
        -4px 0 0 #0b0720, 4px 0 0 #0b0720, 0 -4px 0 #0b0720, 0 4px 0 #0b0720,
        4px 4px 0 #0b0720, 8px 8px 0 #0b0720, 12px 12px 0 rgba(11, 7, 32, 0.45);
      animation: drop 0.5s steps(4) both;
      animation-delay: var(--d);
    }
    .bottom span {
      --c: #ffc800;
    }
    @keyframes drop {
      from {
        transform: translateY(-0.6em);
        opacity: 0;
      }
      to {
        transform: none;
        opacity: 1;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      span {
        animation: none;
      }
    }
  `;

  private letters(word: string, offset: number, colored = true) {
    return [...word].map(
      (ch, i) =>
        html`<span
          style="${colored
            ? `--c:${COLORS[(i + offset) % COLORS.length]};`
            : ""}--d:${(i + offset) * 0.06}s"
          >${ch}</span
        >`,
    );
  }

  render() {
    return html`
      <div class="row top">${this.letters("PREITEN", 0)}</div>
      <div class="row bottom">${this.letters("WARS", 3, false)}</div>
    `;
  }
}
