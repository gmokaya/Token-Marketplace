import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  ChevronDown,
  Globe2,
  ShieldCheck,
  WalletCards,
  X,
} from "lucide-react";
import "./_group.css";

const newAgeStyles = `
  .th-new-age {
    --th-new-ink: #082e31;
    --th-new-deep: #0d4545;
    --th-new-mint: #b7e7d0;
    --th-new-paper: #f3f1e8;
    --th-new-coral: #ff7d63;
    --th-new-sun: #f5bf71;
    --th-new-line: rgba(231, 246, 234, .17);
    min-height: 100dvh;
    height: 860px;
    position: relative;
    overflow: hidden;
    isolation: isolate;
    background: var(--th-new-ink);
    color: var(--th-new-paper);
  }

  .th-new-age,
  .th-new-age button,
  .th-new-age a {
    font-family: "TokenHarvest Futura", Inter, sans-serif;
  }

  .th-new-age button,
  .th-new-age a {
    -webkit-tap-highlight-color: transparent;
  }

  .th-new-age::after {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 7;
    pointer-events: none;
    opacity: .16;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.82' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.42'/%3E%3C/svg%3E");
    mix-blend-mode: soft-light;
  }

  .th-new-aurora,
  .th-new-grid,
  .th-new-orb {
    position: absolute;
    pointer-events: none;
  }

  .th-new-aurora {
    inset: -35% -15% auto auto;
    width: 78vw;
    height: 112vh;
    z-index: -2;
    opacity: .78;
    background:
      radial-gradient(circle at 63% 34%, rgba(183, 231, 208, .25), transparent 27%),
      radial-gradient(circle at 25% 78%, rgba(255, 125, 99, .2), transparent 32%),
      conic-gradient(from 145deg at 55% 48%, transparent 0 28%, rgba(21, 117, 103, .58) 45%, transparent 69%);
    filter: blur(26px);
    animation: th-new-breathe 12s ease-in-out infinite alternate;
  }

  .th-new-grid {
    inset: 0;
    z-index: -1;
    opacity: .44;
    background-image:
      linear-gradient(var(--th-new-line) 1px, transparent 1px),
      linear-gradient(90deg, var(--th-new-line) 1px, transparent 1px);
    background-size: 84px 84px;
    mask-image: linear-gradient(105deg, rgba(0,0,0,.8), transparent 68%);
  }

  .th-new-orb {
    width: 28vw;
    aspect-ratio: 1;
    right: -14vw;
    bottom: -18vw;
    border: 1px solid rgba(183, 231, 208, .25);
    border-radius: 50%;
    box-shadow:
      0 0 0 52px rgba(183, 231, 208, .05),
      0 0 0 106px rgba(183, 231, 208, .04),
      0 0 0 180px rgba(183, 231, 208, .025);
    transform: rotate(-22deg);
  }

  .th-new-nav {
    position: relative;
    z-index: 5;
    display: flex;
    align-items: center;
    justify-content: space-between;
    max-width: 1380px;
    height: 86px;
    margin: 0 auto;
    padding: 0 54px;
    border-bottom: 1px solid rgba(231, 246, 234, .13);
    animation: th-new-rise .8s .05s both cubic-bezier(.2,.75,.25,1);
  }

  .th-new-brand {
    display: inline-flex;
    align-items: center;
    gap: 11px;
    color: var(--th-new-paper);
    font-size: 19px;
    font-weight: 700;
    letter-spacing: -.045em;
    text-decoration: none;
  }

  .th-new-brand-mark {
    display: grid;
    width: 28px;
    height: 28px;
    place-items: center;
    color: var(--th-new-ink);
    background: var(--th-new-mint);
    border-radius: 9px 9px 9px 2px;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: -.08em;
  }

  .th-new-nav-links {
    display: flex;
    align-items: center;
    gap: 32px;
    margin-left: auto;
    margin-right: 30px;
  }

  .th-new-nav-links a,
  .th-new-nav-meta {
    color: rgba(243, 241, 232, .6);
    font-size: 11px;
    font-weight: 500;
    letter-spacing: .15em;
    text-decoration: none;
    text-transform: uppercase;
    transition: color .25s ease;
  }

  .th-new-nav-links a:hover,
  .th-new-nav-links a:focus-visible {
    color: var(--th-new-mint);
  }

  .th-new-nav-meta {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: rgba(243, 241, 232, .42);
    white-space: nowrap;
  }

  .th-new-nav-meta::before {
    content: "";
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--th-new-coral);
    box-shadow: 0 0 0 5px rgba(255, 125, 99, .11);
    animation: th-new-pulse 2.4s ease-in-out infinite;
  }

  .th-new-layout {
    display: grid;
    grid-template-columns: minmax(390px, .82fr) minmax(510px, 1.18fr);
    align-items: center;
    gap: clamp(48px, 7vw, 112px);
    max-width: 1380px;
    min-height: calc(100% - 86px);
    margin: 0 auto;
    padding: 52px 54px 62px;
  }

  .th-new-copy {
    position: relative;
    z-index: 3;
    max-width: 565px;
  }

  .th-new-eyebrow {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 26px;
    color: var(--th-new-mint);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: .2em;
    line-height: 1.2;
    text-transform: uppercase;
    animation: th-new-rise .8s .18s both cubic-bezier(.2,.75,.25,1);
  }

  .th-new-eyebrow-line {
    width: 30px;
    height: 1px;
    background: var(--th-new-coral);
  }

  .th-new-title {
    max-width: 680px;
    margin: 0;
    color: var(--th-new-paper);
    font-size: clamp(4rem, 7vw, 7.8rem);
    font-weight: 300;
    letter-spacing: -.075em;
    line-height: .86;
    text-wrap: balance;
    animation: th-new-rise .95s .26s both cubic-bezier(.2,.75,.25,1);
  }

  .th-new-title span,
  .th-new-title em {
    display: block;
  }

  .th-new-title em {
    color: var(--th-new-coral);
    font-style: normal;
  }

  .th-new-title strong {
    position: relative;
    display: inline-block;
    font-weight: 500;
  }

  .th-new-title strong::after {
    content: "";
    position: absolute;
    right: 2%;
    bottom: -8px;
    left: 2%;
    height: 2px;
    background: var(--th-new-sun);
    transform: skewX(-30deg);
    transform-origin: left;
    animation: th-new-line-in 1s .9s both cubic-bezier(.2,.75,.25,1);
  }

  .th-new-rule {
    width: 49px;
    height: 2px;
    margin: 35px 0 23px;
    background: var(--th-new-coral);
    animation: th-new-expand .75s .52s both cubic-bezier(.2,.75,.25,1);
  }

  .th-new-copy-text {
    max-width: 465px;
    margin: 0 0 31px;
    color: rgba(243, 241, 232, .66);
    font-size: 17px;
    font-weight: 300;
    line-height: 1.58;
    animation: th-new-rise .8s .48s both cubic-bezier(.2,.75,.25,1);
  }

  .th-new-actions {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
    animation: th-new-rise .8s .6s both cubic-bezier(.2,.75,.25,1);
  }

  .th-new-primary,
  .th-new-secondary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 17px;
    min-height: 52px;
    padding: 0 20px;
    border: 1px solid transparent;
    border-radius: 2px;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: .015em;
    text-decoration: none;
    transition: transform .25s ease, background-color .25s ease, border-color .25s ease, color .25s ease;
  }

  .th-new-primary {
    min-width: 205px;
    color: var(--th-new-ink);
    background: var(--th-new-mint);
  }

  .th-new-secondary {
    color: var(--th-new-paper);
    background: transparent;
    border-color: rgba(243, 241, 232, .22);
    cursor: pointer;
  }

  .th-new-primary svg,
  .th-new-secondary svg {
    transition: transform .25s ease;
  }

  .th-new-primary:hover,
  .th-new-primary:focus-visible {
    color: var(--th-new-ink);
    background: #d3f3e1;
    transform: translateY(-3px);
  }

  .th-new-secondary:hover,
  .th-new-secondary:focus-visible {
    background: rgba(243, 241, 232, .1);
    border-color: rgba(243, 241, 232, .42);
    transform: translateY(-3px);
  }

  .th-new-primary:hover svg,
  .th-new-primary:focus-visible svg,
  .th-new-secondary:hover svg,
  .th-new-secondary:focus-visible svg {
    transform: translateX(4px);
  }

  .th-new-primary:focus-visible,
  .th-new-secondary:focus-visible,
  .th-new-brand:focus-visible,
  .th-new-nav-links a:focus-visible,
  .th-new-close:focus-visible {
    outline: 2px solid var(--th-new-sun);
    outline-offset: 5px;
  }

  .th-new-audience {
    display: flex;
    align-items: center;
    gap: 15px;
    margin-top: 35px;
    color: rgba(243, 241, 232, .38);
    font-size: 10px;
    font-weight: 500;
    letter-spacing: .15em;
    text-transform: uppercase;
    animation: th-new-rise .8s .72s both cubic-bezier(.2,.75,.25,1);
  }

  .th-new-audience-rule {
    width: 40px;
    height: 1px;
    background: rgba(243, 241, 232, .27);
  }

  .th-new-audience strong {
    color: rgba(243, 241, 232, .63);
    font-weight: 500;
  }

  .th-new-stage-wrap {
    position: relative;
    z-index: 2;
    min-width: 0;
    perspective: 1200px;
    animation: th-new-rise 1s .32s both cubic-bezier(.2,.75,.25,1);
  }

  .th-new-stage {
    --mx: 0deg;
    --my: 0deg;
    position: relative;
    width: min(100%, 650px);
    min-height: 550px;
    margin: 0 auto;
    transform: rotateY(calc(var(--mx) * .22)) rotateX(calc(var(--my) * -.16));
    transition: transform .45s ease-out;
  }

  .th-new-photo-frame {
    position: absolute;
    inset: 0 34px 25px 0;
    overflow: hidden;
    border: 1px solid rgba(243, 241, 232, .27);
    border-radius: 2px 54px 2px 54px;
    background: var(--th-new-deep);
    box-shadow: 23px 25px 0 rgba(255, 125, 99, .13);
  }

  .th-new-photo-frame::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 1;
    background:
      linear-gradient(115deg, rgba(8, 46, 49, .81) 0%, rgba(8, 46, 49, .18) 47%, rgba(8, 46, 49, .2) 100%),
      linear-gradient(0deg, rgba(8, 46, 49, .82), transparent 40%);
  }

  .th-new-photo-frame::after {
    content: "";
    position: absolute;
    inset: 11px;
    z-index: 2;
    border: 1px solid rgba(243, 241, 232, .19);
    border-radius: 1px 44px 1px 44px;
    pointer-events: none;
  }

  .th-new-photo {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
    object-position: 49% center;
    filter: saturate(.82) contrast(1.04);
    transform: scale(1.08);
    animation: th-new-photo-breathe 16s ease-in-out infinite alternate;
  }

  .th-new-scanline {
    position: absolute;
    inset: 0;
    z-index: 3;
    pointer-events: none;
    opacity: .24;
    background: repeating-linear-gradient(0deg, transparent 0 7px, rgba(183, 231, 208, .08) 8px, transparent 9px);
    mix-blend-mode: screen;
  }

  .th-new-stage-top {
    position: absolute;
    top: 31px;
    right: 61px;
    left: 31px;
    z-index: 4;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .th-new-stage-label,
  .th-new-stage-code {
    color: rgba(243, 241, 232, .75);
    font-size: 9px;
    font-weight: 500;
    letter-spacing: .17em;
    text-transform: uppercase;
  }

  .th-new-stage-label {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 9px 11px;
    color: var(--th-new-paper);
    background: rgba(8, 46, 49, .66);
    border: 1px solid rgba(243, 241, 232, .24);
    backdrop-filter: blur(12px);
  }

  .th-new-stage-label::before {
    content: "";
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--th-new-coral);
  }

  .th-new-stage-code {
    color: rgba(243, 241, 232, .54);
    writing-mode: vertical-rl;
  }

  .th-new-stage-caption {
    position: absolute;
    right: 80px;
    bottom: 50px;
    left: 32px;
    z-index: 4;
  }

  .th-new-stage-kicker {
    margin: 0 0 12px;
    color: var(--th-new-sun);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: .18em;
    text-transform: uppercase;
  }

  .th-new-stage-heading {
    max-width: 350px;
    margin: 0 0 14px;
    color: var(--th-new-paper);
    font-size: clamp(1.8rem, 3vw, 2.8rem);
    font-weight: 300;
    letter-spacing: -.045em;
    line-height: .98;
  }

  .th-new-stage-meta {
    display: flex;
    align-items: center;
    gap: 9px;
    color: rgba(243, 241, 232, .54);
    font-size: 11px;
    letter-spacing: .04em;
  }

  .th-new-stage-meta span {
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: var(--th-new-coral);
  }

  .th-new-float-card {
    position: absolute;
    z-index: 5;
    min-width: 173px;
    padding: 16px 17px;
    background: rgba(243, 241, 232, .95);
    color: var(--th-new-ink);
    box-shadow: 11px 14px 0 rgba(8, 46, 49, .3);
    backdrop-filter: blur(8px);
    animation: th-new-float 5s 1.4s ease-in-out infinite;
  }

  .th-new-price-card {
    top: 132px;
    right: 0;
  }

  .th-new-finance-card {
    right: 37px;
    bottom: -2px;
    min-width: 195px;
    animation-delay: 2s;
  }

  .th-new-float-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    margin-bottom: 11px;
    color: rgba(8, 46, 49, .5);
    font-size: 9px;
    font-weight: 600;
    letter-spacing: .13em;
    text-transform: uppercase;
  }

  .th-new-float-top svg {
    color: var(--th-new-deep);
  }

  .th-new-float-value {
    margin: 0;
    font-size: 25px;
    font-weight: 500;
    letter-spacing: -.045em;
    line-height: 1;
  }

  .th-new-float-value small {
    color: rgba(8, 46, 49, .48);
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0;
  }

  .th-new-float-change {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    margin-top: 11px;
    color: #19745b;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: .08em;
  }

  .th-new-float-change::before {
    content: "";
    width: 22px;
    height: 1px;
    background: currentColor;
  }

  .th-new-terminal {
    position: absolute;
    right: 0;
    bottom: 26px;
    z-index: 6;
    display: flex;
    align-items: stretch;
    width: min(92%, 410px);
    background: rgba(8, 46, 49, .86);
    border: 1px solid rgba(183, 231, 208, .24);
    box-shadow: 14px 17px 0 rgba(8, 46, 49, .36);
    backdrop-filter: blur(18px);
  }

  .th-new-terminal-cell {
    flex: 1;
    padding: 15px 13px 13px;
    border-right: 1px solid rgba(183, 231, 208, .16);
  }

  .th-new-terminal-cell:last-child {
    border-right: 0;
  }

  .th-new-terminal-label {
    display: block;
    margin-bottom: 11px;
    color: rgba(243, 241, 232, .45);
    font-size: 8px;
    font-weight: 600;
    letter-spacing: .15em;
    text-transform: uppercase;
  }

  .th-new-terminal-value {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--th-new-paper);
    font-size: 10px;
    font-weight: 500;
    white-space: nowrap;
  }

  .th-new-terminal-value::before {
    content: "";
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--th-new-mint);
  }

  .th-new-flow {
    position: absolute;
    bottom: 0;
    left: 0;
    z-index: 9;
    width: min(490px, calc(100vw - 48px));
    padding: 22px 22px 20px;
    color: var(--th-new-paper);
    background: #0e4a49;
    border: 1px solid rgba(183, 231, 208, .32);
    box-shadow: 14px 17px 0 rgba(8, 46, 49, .34);
    animation: th-new-rise .35s both cubic-bezier(.2,.75,.25,1);
  }

  .th-new-flow-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 18px;
  }

  .th-new-flow-title {
    margin: 0;
    font-size: 18px;
    font-weight: 500;
    letter-spacing: -.025em;
  }

  .th-new-close {
    display: grid;
    width: 28px;
    height: 28px;
    padding: 0;
    place-items: center;
    color: rgba(243, 241, 232, .7);
    background: transparent;
    border: 1px solid rgba(243, 241, 232, .25);
    cursor: pointer;
  }

  .th-new-flow-list {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 7px;
  }

  .th-new-flow-item {
    min-height: 92px;
    padding: 13px 12px;
    border: 1px solid rgba(183, 231, 208, .17);
    background: rgba(8, 46, 49, .35);
  }

  .th-new-flow-item svg {
    margin-bottom: 14px;
    color: var(--th-new-coral);
  }

  .th-new-flow-item strong {
    display: block;
    margin-bottom: 5px;
    font-size: 11px;
    font-weight: 600;
  }

  .th-new-flow-item span {
    display: block;
    color: rgba(243, 241, 232, .5);
    font-size: 10px;
    line-height: 1.3;
  }

  @keyframes th-new-rise {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes th-new-expand {
    from { opacity: 0; transform: scaleX(0); transform-origin: left; }
    to { opacity: 1; transform: scaleX(1); transform-origin: left; }
  }

  @keyframes th-new-line-in {
    from { opacity: 0; transform: scaleX(0) skewX(-30deg); }
    to { opacity: 1; transform: scaleX(1) skewX(-30deg); }
  }

  @keyframes th-new-breathe {
    from { transform: translate3d(-3%, -2%, 0) scale(1); }
    to { transform: translate3d(4%, 3%, 0) scale(1.08); }
  }

  @keyframes th-new-photo-breathe {
    from { transform: scale(1.08) translate3d(0, 0, 0); }
    to { transform: scale(1.16) translate3d(-1.6%, -1%, 0); }
  }

  @keyframes th-new-float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-9px); }
  }

  @keyframes th-new-pulse {
    0%, 100% { opacity: .55; transform: scale(.8); }
    50% { opacity: 1; transform: scale(1.15); }
  }

  @media (max-width: 980px) {
    .th-new-age {
      height: auto;
      min-height: 100dvh;
    }

    .th-new-nav {
      padding: 0 30px;
    }

    .th-new-nav-links {
      gap: 19px;
      margin-right: 20px;
    }

    .th-new-layout {
      grid-template-columns: minmax(315px, .8fr) minmax(400px, 1.2fr);
      gap: 34px;
      padding: 45px 30px 58px;
    }

    .th-new-title {
      font-size: clamp(3.8rem, 7vw, 5.8rem);
    }

    .th-new-stage {
      min-height: 500px;
    }
  }

  @media (max-width: 720px) {
    .th-new-age {
      min-height: 100dvh;
      overflow: hidden;
    }

    .th-new-aurora {
      top: 14%;
      right: -38%;
      width: 125vw;
      height: 82vh;
    }

    .th-new-grid {
      background-size: 53px 53px;
      opacity: .31;
      mask-image: linear-gradient(180deg, rgba(0,0,0,.58), transparent 74%);
    }

    .th-new-orb {
      right: -27vw;
      bottom: 4vw;
      width: 48vw;
    }

    .th-new-nav {
      height: 72px;
      padding: 0 22px;
    }

    .th-new-nav-links,
    .th-new-nav-meta {
      display: none;
    }

    .th-new-layout {
      display: block;
      min-height: 0;
      padding: 58px 22px 45px;
    }

    .th-new-copy {
      max-width: none;
    }

    .th-new-eyebrow {
      margin-bottom: 23px;
      font-size: 9px;
      letter-spacing: .16em;
    }

    .th-new-title {
      max-width: 420px;
      font-size: clamp(3.65rem, 17vw, 5.7rem);
      letter-spacing: -.085em;
      line-height: .88;
    }

    .th-new-title strong::after {
      bottom: -5px;
    }

    .th-new-rule {
      margin: 28px 0 18px;
    }

    .th-new-copy-text {
      max-width: 390px;
      margin-bottom: 25px;
      font-size: 15px;
      line-height: 1.5;
    }

    .th-new-actions {
      align-items: stretch;
      gap: 9px;
    }

    .th-new-primary,
    .th-new-secondary {
      min-height: 48px;
      padding: 0 15px;
      font-size: 11px;
    }

    .th-new-primary {
      min-width: 181px;
    }

    .th-new-audience {
      gap: 10px;
      margin-top: 22px;
      font-size: 8px;
      letter-spacing: .1em;
    }

    .th-new-audience-rule {
      width: 23px;
    }

    .th-new-stage-wrap {
      margin-top: 48px;
    }

    .th-new-stage {
      min-height: 335px;
    }

    .th-new-photo-frame {
      inset: 0 26px 18px 0;
      border-radius: 2px 33px 2px 33px;
      box-shadow: 13px 15px 0 rgba(255, 125, 99, .13);
    }

    .th-new-photo-frame::after {
      inset: 8px;
      border-radius: 1px 25px 1px 25px;
    }

    .th-new-stage-top {
      top: 19px;
      right: 42px;
      left: 19px;
    }

    .th-new-stage-label {
      padding: 7px 8px;
      font-size: 7px;
    }

    .th-new-stage-code {
      font-size: 8px;
    }

    .th-new-stage-caption {
      right: 46px;
      bottom: 35px;
      left: 20px;
    }

    .th-new-stage-kicker {
      margin-bottom: 8px;
      font-size: 8px;
    }

    .th-new-stage-heading {
      max-width: 220px;
      margin-bottom: 9px;
      font-size: 1.65rem;
    }

    .th-new-stage-meta {
      font-size: 9px;
    }

    .th-new-price-card {
      top: 80px;
      right: 0;
    }

    .th-new-finance-card {
      right: 14px;
      bottom: -3px;
      min-width: 154px;
    }

    .th-new-float-card {
      min-width: 142px;
      padding: 11px 12px;
    }

    .th-new-float-top {
      margin-bottom: 8px;
      font-size: 7px;
    }

    .th-new-float-value {
      font-size: 19px;
    }

    .th-new-float-value small {
      font-size: 9px;
    }

    .th-new-float-change {
      margin-top: 8px;
      font-size: 8px;
    }

    .th-new-terminal {
      right: 0;
      bottom: 14px;
      width: min(86%, 300px);
    }

    .th-new-terminal-cell {
      padding: 10px 8px 9px;
    }

    .th-new-terminal-label {
      margin-bottom: 7px;
      font-size: 6px;
    }

    .th-new-terminal-value {
      gap: 4px;
      font-size: 7px;
    }

    .th-new-terminal-value::before {
      width: 4px;
      height: 4px;
    }

    .th-new-flow {
      position: fixed;
      right: 16px;
      bottom: 16px;
      left: 16px;
      width: auto;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .th-new-age *,
    .th-new-age *::before,
    .th-new-age *::after {
      animation-duration: .01ms !important;
      animation-iteration-count: 1 !important;
      scroll-behavior: auto !important;
      transition-duration: .01ms !important;
    }
  }
`;

export function NewAge() {
  const [flowOpen, setFlowOpen] = useState(false);

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 12;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 12;
    event.currentTarget.style.setProperty("--mx", `${x}deg`);
    event.currentTarget.style.setProperty("--my", `${y}deg`);
  };

  const handlePointerLeave = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.style.setProperty("--mx", "0deg");
    event.currentTarget.style.setProperty("--my", "0deg");
  };

  return (
    <main className="th-hero-scope th-new-age">
      <style>{newAgeStyles}</style>
      <div className="th-new-aurora" aria-hidden="true" />
      <div className="th-new-grid" aria-hidden="true" />
      <div className="th-new-orb" aria-hidden="true" />

      <nav className="th-new-nav" aria-label="TokenHarvest primary navigation">
        <a className="th-new-brand" href="#th-marketplace-access">
          <span className="th-new-brand-mark" aria-hidden="true">TH</span>
          <span>TokenHarvest</span>
        </a>
        <div className="th-new-nav-links">
          <a href="#th-marketplace-access">Marketplace</a>
          <a href="#th-how-it-works">How it works</a>
          <a href="#th-network">Our network</a>
        </div>
        <span className="th-new-nav-meta">East Africa / Live</span>
      </nav>

      <div className="th-new-layout">
        <section className="th-new-copy" aria-labelledby="th-new-title">
          <div className="th-new-eyebrow">
            <span className="th-new-eyebrow-line" aria-hidden="true" />
            East Africa / Digital commodities
          </div>

          <h1 className="th-new-title" id="th-new-title">
            <span>Trade what</span>
            <em>matters.</em>
            <strong>Move what&apos;s next.</strong>
          </h1>

          <div className="th-new-rule" aria-hidden="true" />

          <p className="th-new-copy-text">
            The trusted market layer connecting producers, brokers, buyers, and
            financiers — from first harvest to final settlement.
          </p>

          <div className="th-new-actions" id="th-marketplace-access">
            <a className="th-new-primary" href="#th-network">
              Join the marketplace
              <ArrowUpRight size={16} strokeWidth={1.8} aria-hidden="true" />
            </a>
            <button
              className="th-new-secondary"
              type="button"
              aria-expanded={flowOpen}
              aria-controls="th-how-it-works"
              onClick={() => setFlowOpen((open) => !open)}
            >
              See how it works
              <ChevronDown
                size={16}
                strokeWidth={1.8}
                aria-hidden="true"
                style={{ transform: flowOpen ? "rotate(180deg)" : undefined }}
              />
            </button>
          </div>

          <div className="th-new-audience" id="th-network">
            <span className="th-new-audience-rule" aria-hidden="true" />
            <span>Built for <strong>producers</strong> / brokers / buyers / financiers</span>
          </div>

          {flowOpen && (
            <aside className="th-new-flow" id="th-how-it-works" aria-label="How TokenHarvest works">
              <div className="th-new-flow-header">
                <h2 className="th-new-flow-title">One connected trade flow.</h2>
                <button
                  className="th-new-close"
                  type="button"
                  aria-label="Close how it works"
                  onClick={() => setFlowOpen(false)}
                >
                  <X size={15} strokeWidth={1.8} aria-hidden="true" />
                </button>
              </div>
              <div className="th-new-flow-list">
                <div className="th-new-flow-item">
                  <Globe2 size={15} strokeWidth={1.7} aria-hidden="true" />
                  <strong>Source</strong>
                  <span>Verified origin and quality.</span>
                </div>
                <div className="th-new-flow-item">
                  <BarChart3 size={15} strokeWidth={1.7} aria-hidden="true" />
                  <strong>Trade</strong>
                  <span>Clear prices and live demand.</span>
                </div>
                <div className="th-new-flow-item">
                  <WalletCards size={15} strokeWidth={1.7} aria-hidden="true" />
                  <strong>Settle</strong>
                  <span>Capital and delivery aligned.</span>
                </div>
              </div>
            </aside>
          )}
        </section>

        <section
          className="th-new-stage-wrap"
          aria-label="Live TokenHarvest market signal"
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
        >
          <div className="th-new-stage">
            <div className="th-new-photo-frame">
              <img
                className="th-new-photo"
                src="/__mockup/images/hero-soybean-farmer.jpg"
                alt="Producer inspecting a soybean harvest in East Africa"
              />
              <div className="th-new-scanline" aria-hidden="true" />
              <div className="th-new-stage-top">
                <span className="th-new-stage-label">Market signal / live</span>
                <span className="th-new-stage-code">01 — 03</span>
              </div>
              <div className="th-new-stage-caption">
                <p className="th-new-stage-kicker">Origin / Kakamega, Kenya</p>
                <h2 className="th-new-stage-heading">Good trade starts at the source.</h2>
                <div className="th-new-stage-meta">
                  <span aria-hidden="true" />
                  Harvest verified
                  <span aria-hidden="true" />
                  04:12 EAT
                </div>
              </div>
            </div>

            <div className="th-new-float-card th-new-price-card" aria-label="Maize market price">
              <div className="th-new-float-top">
                Maize / Grade A
                <ArrowRight size={13} strokeWidth={1.8} aria-hidden="true" />
              </div>
              <p className="th-new-float-value">KES 43.80<small> / kg</small></p>
              <span className="th-new-float-change">4.6% this week</span>
            </div>

            <div className="th-new-float-card th-new-finance-card" aria-label="Finance readiness">
              <div className="th-new-float-top">
                Trade finance
                <ShieldCheck size={13} strokeWidth={1.8} aria-hidden="true" />
              </div>
              <p className="th-new-float-value">KES 18.4M</p>
              <span className="th-new-float-change">Escrow ready</span>
            </div>

            <div className="th-new-terminal" aria-label="Trade flow status">
              <div className="th-new-terminal-cell">
                <span className="th-new-terminal-label">Source</span>
                <span className="th-new-terminal-value">Verified</span>
              </div>
              <div className="th-new-terminal-cell">
                <span className="th-new-terminal-label">Match</span>
                <span className="th-new-terminal-value">2.8K buyers</span>
              </div>
              <div className="th-new-terminal-cell">
                <span className="th-new-terminal-label">Settle</span>
                <span className="th-new-terminal-value">Protected</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
