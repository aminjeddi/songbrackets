"use client";

import { useEffect, useMemo, useState } from "react";
import { seedOrder, roundName } from "./lib/bracket";
import { ARTISTS, getArtist } from "./lib/data";
import { playPick, playSoft, playWin } from "./lib/sounds";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 768px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isMobile;
}

type Song = { title: string; seed: number };
type Slot = Song | null;
type Phase = "landing" | "playing";

// Largest power of 2 <= songCount, capped at 64, floored at 16.
function bracketSizeFor(songCount: number): number {
  for (const size of [64, 32, 16]) {
    if (songCount >= size) return size;
  }
  return 0;
}

function buildEmptyRounds(leaves: Slot[]): Slot[][] {
  const totalRounds = Math.log2(leaves.length);
  const init: Slot[][] = [leaves];
  for (let r = 1; r <= totalRounds; r++) {
    init.push(new Array(leaves.length / 2 ** r).fill(null));
  }
  return init;
}

export default function Page() {
  const [phase, setPhase] = useState<Phase>("landing");
  const [artist, setArtist] = useState("");
  const [rounds, setRounds] = useState<Slot[][]>([]);

  function start(name: string) {
    const a = getArtist(name);
    if (!a) return;
    playSoft();
    const allSongs: Song[] = a.songs.map((title, i) => ({
      title: cleanTitle(title),
      seed: i + 1,
    }));
    const size = bracketSizeFor(allSongs.length);
    if (!size) return;
    const songs = allSongs.slice(0, size);
    const order = seedOrder(size);
    const leaves: Slot[] = order.map((s) => songs[s - 1]);
    setArtist(a.name);
    setRounds(buildEmptyRounds(leaves));
    setPhase("playing");
  }

  function pick(level: number, parentIdx: number, winner: Song) {
    playPick();
    const totalRounds = rounds.length - 1;
    if (level + 1 === totalRounds && parentIdx === 0) {
      // Champion just decided — chase the pick tick with a brief two-note rise.
      setTimeout(playWin, 90);
    }
    setRounds((prev) => {
      const next = prev.map((row) => row.slice());
      const replaced = next[level + 1][parentIdx];
      if (replaced && replaced.seed !== winner.seed) {
        clearAncestors(next, level + 1, parentIdx);
      }
      next[level + 1][parentIdx] = winner;
      return next;
    });
  }

  function reset() {
    playSoft();
    setPhase("landing");
    setArtist("");
    setRounds([]);
  }

  function shuffle() {
    playSoft();
    setRounds((prev) => {
      if (prev.length === 0) return prev;
      const leaves = prev[0].slice();
      for (let i = leaves.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [leaves[i], leaves[j]] = [leaves[j], leaves[i]];
      }
      return buildEmptyRounds(leaves);
    });
  }

  return (
    <main
      className={`w-screen flex flex-col ${
        phase === "playing" ? "h-screen overflow-hidden" : "min-h-screen"
      }`}
    >
      {phase === "landing" && <Landing onPick={start} />}
      {phase === "playing" && (
        <PlayingView
          artist={artist}
          rounds={rounds}
          onPick={pick}
          onReset={reset}
          onShuffle={shuffle}
        />
      )}
    </main>
  );
}

// Strip parentheticals that are annotations (features, collabs, release notes),
// but keep parentheticals that are part of the actual song title (subtitles,
// reprises, alternate names like "(Hell Ya Fuckin' Right)" or "(With Me)").
function cleanTitle(raw: string): string {
  return censorSwears(
    raw
      // Remove any parenthetical containing a feature/collab marker, anywhere inside it.
      .replace(/\s*\([^)]*\b(?:ft\.?|feat\.?|featuring|w\/)[^)]*\)/gi, "")
      // Remove release-status annotations.
      .replace(/\s*\((?:unreleased|rare|leaked|leaked\s+demo|demo)\)/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim()
  );
}

// Replace the second letter of common swear roots with a single asterisk.
// Pre-censored variants (F**k, Sh!t, N****s) are left untouched.
const SWEAR_ROOTS = ["fuck", "shit", "bitch", "pussy", "nigga", "nigger", "cunt"];
function censorSwears(text: string): string {
  let out = text;
  for (const root of SWEAR_ROOTS) {
    const re = new RegExp(`\\b(${root})(\\w*)\\b`, "gi");
    out = out.replace(re, (_m, base: string, suffix: string) => {
      return base[0] + "*" + base.slice(2) + suffix;
    });
  }
  return out;
}

function clearAncestors(rounds: Slot[][], level: number, idx: number) {
  let l = level;
  let i = idx;
  while (l < rounds.length - 1) {
    const parent = Math.floor(i / 2);
    if (rounds[l + 1][parent] === null) break;
    rounds[l + 1][parent] = null;
    l += 1;
    i = parent;
  }
}

/* ---------- Landing ---------- */

function Landing({ onPick }: { onPick: (name: string) => void }) {
  return (
    <div className="flex-1 flex flex-col px-5 pt-10 pb-6">
      <div className="flex-1 flex items-center justify-center w-full">
        <div className="w-full max-w-3xl space-y-10 text-center fade-up">
          <h1 className="text-2xl tracking-tight">songbrackets.xyz</h1>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-2.5">
            {ARTISTS.map((a, i) => (
              <button
                key={a.name}
                onClick={() => onPick(a.name)}
                style={{ animationDelay: `${i * 35}ms` }}
                className="card clickable card-enter rounded-xl border-2 border-black px-3 py-3 text-sm leading-tight"
              >
                {a.name}
              </button>
            ))}
          </div>
        </div>
      </div>
      <footer className="text-center text-xs text-black pt-10 md:pt-6">
        Built by{" "}
        <a
          href="https://aminjeddi.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-black hover:text-black/40 transition-colors duration-200"
          style={{ transitionTimingFunction: "var(--ease-out)" }}
        >
          Amin Jeddi
        </a>
      </footer>
    </div>
  );
}

/* ---------- Bracket geometry ----------
   Columns: totalRounds on left + 1 center (champion) + totalRounds on right.
   Per-side leaf count = bracketSize / 2.
*/
const CARD_PAD_X = 0.5;
const COL_GAP_X = 1.6;
const PAIR_EXTRA = 0.5; // extra rows of space between consecutive pairs
const CARD_RATIO = 0.72; // fraction of one row that the card itself occupies

type Layout = {
  totalRounds: number;
  leavesPerSide: number;
  totalCols: number;
  centerCol: number;
  colW: number;
  cardHPct: number;
  slotYsPct: number[][];
};

function getLayout(bracketSize: number): Layout {
  const totalRounds = Math.log2(bracketSize);
  const leavesPerSide = bracketSize / 2;
  const totalCols = 2 * totalRounds + 1;
  const centerCol = totalRounds;
  const colW = 100 / totalCols;

  const leafYs: number[] = [];
  let cursor = 0;
  for (let i = 0; i < leavesPerSide; i++) {
    if (i > 0 && i % 2 === 0) cursor += PAIR_EXTRA;
    leafYs.push(cursor + 0.5);
    cursor += 1;
  }
  const totalRows = leavesPerSide + (leavesPerSide / 2 - 1) * PAIR_EXTRA;
  const scale = 100 / totalRows;
  const cardHPct = CARD_RATIO * scale;

  const slotYsPct: number[][] = [leafYs.map((y) => y * scale)];
  for (let L = 1; L <= totalRounds - 1; L++) {
    const prev = slotYsPct[L - 1];
    const cur: number[] = [];
    for (let k = 0; k < prev.length / 2; k++) {
      cur.push((prev[2 * k] + prev[2 * k + 1]) / 2);
    }
    slotYsPct.push(cur);
  }

  return { totalRounds, leavesPerSide, totalCols, centerCol, colW, cardHPct, slotYsPct };
}

function cardGeom(layout: Layout, col: number, slotInSide: number, level: number) {
  const yCenter = layout.slotYsPct[level][slotInSide];
  return {
    top: yCenter - layout.cardHPct / 2,
    left: col * layout.colW + CARD_PAD_X,
    width: layout.colW - 2 * CARD_PAD_X,
    height: layout.cardHPct,
    centerY: yCenter,
  };
}

/* Mobile vs desktop switcher */
function PlayingView(props: {
  artist: string;
  rounds: Slot[][];
  onPick: (level: number, parentIdx: number, winner: Song) => void;
  onReset: () => void;
  onShuffle: () => void;
}) {
  const isMobile = useIsMobile();
  return isMobile ? <MobileBracket {...props} /> : <Bracket {...props} />;
}

/* Find the next decidable matchup in bracket order (round by round). */
function findNextMatchup(rounds: Slot[][]) {
  for (let L = 0; L < rounds.length - 1; L++) {
    for (let p = 0; p < rounds[L + 1].length; p++) {
      const a = rounds[L][p * 2];
      const b = rounds[L][p * 2 + 1];
      if (a && b && rounds[L + 1][p] == null) {
        return { level: L, parentIdx: p, a, b };
      }
    }
  }
  return null;
}

function MobileBracket({
  artist,
  rounds,
  onPick,
  onReset,
  onShuffle,
}: {
  artist: string;
  rounds: Slot[][];
  onPick: (level: number, parentIdx: number, winner: Song) => void;
  onReset: () => void;
  onShuffle: () => void;
}) {
  const decided = useMemo(
    () => rounds.slice(1).reduce((acc, row) => acc + row.filter(Boolean).length, 0),
    [rounds]
  );
  const next = findNextMatchup(rounds);
  const bracketSize = rounds[0]?.length || 0;
  const totalRounds = rounds.length - 1;
  const totalMatchups = bracketSize - 1;
  const champion = rounds[totalRounds]?.[0] || null;
  // round name: derive from the current matchup's level (round size = entrants at that level)
  const roundSize = next ? rounds[next.level].length : 0;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Header
        artist={artist}
        decided={decided}
        total={totalMatchups}
        onReset={onReset}
        onShuffle={onShuffle}
      />

      <div className="flex-1 flex flex-col px-5 pt-3 pb-4 gap-2.5 min-h-0 overflow-hidden">
        {next && (
          <>
            <div className="text-center text-[10px] uppercase tracking-widest opacity-60 fade-up">
              {roundName(roundSize)} · matchup {decided + 1} / {totalMatchups}
            </div>
            <div className="flex flex-col gap-2">
              <MobilePickButton
                key={`a-${next.a.seed}`}
                song={next.a}
                onPick={() => onPick(next.level, next.parentIdx, next.a)}
              />
              <div className="text-center text-[10px] uppercase tracking-widest opacity-40">
                vs
              </div>
              <MobilePickButton
                key={`b-${next.b.seed}`}
                song={next.b}
                onPick={() => onPick(next.level, next.parentIdx, next.b)}
              />
            </div>
          </>
        )}

        {!next && champion && (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 champion-in">
            <div className="text-[10px] uppercase tracking-widest opacity-60">
              {artist} champion
            </div>
            <div className="text-3xl leading-tight">{champion.title}</div>
            <button
              onClick={onReset}
              className="card clickable rounded-xl border-2 border-black text-xs uppercase tracking-widest px-4 py-2 mt-4"
            >
              start over
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function MobilePickButton({ song, onPick }: { song: Song; onPick: () => void }) {
  return (
    <button
      onClick={onPick}
      className="card clickable card-enter rounded-2xl border-2 border-black flex items-center justify-center px-5 text-center"
      style={{ height: "min(26vh, 190px)" }}
    >
      <span className="text-base leading-snug">{song.title}</span>
    </button>
  );
}

function Bracket({
  artist,
  rounds,
  onPick,
  onReset,
  onShuffle,
}: {
  artist: string;
  rounds: Slot[][];
  onPick: (level: number, parentIdx: number, winner: Song) => void;
  onReset: () => void;
  onShuffle: () => void;
}) {
  const decided = useMemo(
    () => rounds.slice(1).reduce((acc, row) => acc + row.filter(Boolean).length, 0),
    [rounds]
  );
  const bracketSize = rounds[0]?.length || 0;
  const layout = useMemo(() => getLayout(bracketSize), [bracketSize]);
  const { totalRounds, totalCols, centerCol, cardHPct, colW } = layout;
  const totalMatchups = bracketSize - 1;
  const champion = rounds[totalRounds]?.[0] || null;

  // Build positions for every slot in the tree.
  type CardPos = {
    level: number;
    parentIdx: number;
    side: "left" | "right" | "center";
    col: number;
    slot: Slot;
    sibling: Slot;
    parent: Slot;
    isTop: boolean; // top level (champion)
    geom: ReturnType<typeof cardGeom>;
    globalIdx: number;
  };

  const cards: CardPos[] = [];
  const connectors: { left: number; top: number; width?: number; height?: number }[] = [];

  // Left side cols 0..totalRounds-1, right side cols totalCols-1..centerCol+1,
  // center col = champion.
  for (let level = 0; level <= totalRounds - 1; level++) {
    const totalAtLevel = rounds[level].length;
    const half = totalAtLevel / 2;
    for (let g = 0; g < totalAtLevel; g++) {
      const isLeft = g < half;
      const slotInSide = isLeft ? g : g - half;
      const col = isLeft ? level : totalCols - 1 - level;
      const geom = cardGeom(layout, col, slotInSide, level);
      const siblingG = g % 2 === 0 ? g + 1 : g - 1;
      const parentIdx = Math.floor(g / 2);
      cards.push({
        level,
        parentIdx,
        side: isLeft ? "left" : "right",
        col,
        slot: rounds[level][g],
        sibling: rounds[level][siblingG],
        parent: rounds[level + 1]?.[parentIdx] || null,
        isTop: false,
        geom,
        globalIdx: g,
      });
    }
  }

  // Champion (top level, single slot) in center column
  const champGeom = {
    top: 50 - cardHPct / 2,
    left: centerCol * colW + CARD_PAD_X,
    width: colW - 2 * CARD_PAD_X,
    height: cardHPct,
    centerY: 50,
  };
  cards.push({
    level: totalRounds,
    parentIdx: 0,
    side: "center",
    col: centerCol,
    slot: rounds[totalRounds][0],
    sibling: null,
    parent: null,
    isTop: true,
    geom: champGeom,
    globalIdx: 0,
  });

  // Connectors: per-side pairs, plus a special two-stub connector for the
  // championship (left finalist + right finalist into the center column).
  for (let level = 0; level <= totalRounds - 1; level++) {
    if (level === totalRounds - 1) {
      const leftFinal = cardGeom(layout, centerCol - 1, 0, level);
      const rightFinal = cardGeom(layout, centerCol + 1, 0, level);
      const champLeft = champGeom.left;
      const champRight = champGeom.left + champGeom.width;
      connectors.push({
        left: leftFinal.left + leftFinal.width,
        top: leftFinal.centerY,
        width: champLeft - (leftFinal.left + leftFinal.width),
      });
      connectors.push({
        left: champRight,
        top: rightFinal.centerY,
        width: rightFinal.left - champRight,
      });
      continue;
    }

    const totalAtLevel = rounds[level].length;
    const half = totalAtLevel / 2;
    for (let pair = 0; pair < totalAtLevel / 2; pair++) {
      const g1 = pair * 2;
      const g2 = pair * 2 + 1;
      const isLeft = g1 < half;
      const slotIn1 = isLeft ? g1 : g1 - half;
      const slotIn2 = isLeft ? g2 : g2 - half;
      const parentSlotInSide = isLeft ? pair : pair - half / 2;

      const colCard = isLeft ? level : totalCols - 1 - level;
      const colParent = isLeft ? level + 1 : totalCols - 1 - (level + 1);

      const g1Geom = cardGeom(layout, colCard, slotIn1, level);
      const g2Geom = cardGeom(layout, colCard, slotIn2, level);
      const parentGeom = cardGeom(layout, colParent, parentSlotInSide, level + 1);

      const stubLen = (COL_GAP_X * 0.6); // horizontal stub length in %
      if (isLeft) {
        const stubStartX = g1Geom.left + g1Geom.width; // card right edge
        const stubEndX = stubStartX + stubLen;
        // horizontal stubs from each card
        connectors.push({ left: stubStartX, top: g1Geom.centerY, width: stubLen });
        connectors.push({ left: stubStartX, top: g2Geom.centerY, width: stubLen });
        // vertical at stubEndX between centers
        connectors.push({
          left: stubEndX,
          top: g1Geom.centerY,
          height: g2Geom.centerY - g1Geom.centerY,
        });
        // horizontal from vertical mid into parent
        const midY = (g1Geom.centerY + g2Geom.centerY) / 2;
        connectors.push({
          left: stubEndX,
          top: midY,
          width: parentGeom.left - stubEndX,
        });
      } else {
        // Right side: mirror
        const stubStartX = g1Geom.left; // card left edge
        const stubEndX = stubStartX - stubLen;
        connectors.push({ left: stubEndX, top: g1Geom.centerY, width: stubLen });
        connectors.push({ left: stubEndX, top: g2Geom.centerY, width: stubLen });
        connectors.push({
          left: stubEndX,
          top: g1Geom.centerY,
          height: g2Geom.centerY - g1Geom.centerY,
        });
        const midY = (g1Geom.centerY + g2Geom.centerY) / 2;
        const parentRight = parentGeom.left + parentGeom.width;
        connectors.push({
          left: parentRight,
          top: midY,
          width: stubEndX - parentRight,
        });
      }
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Header
        artist={artist}
        decided={decided}
        total={totalMatchups}
        onReset={onReset}
        onShuffle={onShuffle}
      />

      <div className="flex-1 relative min-h-0">
        <div className="absolute inset-0 px-2 py-3">
          <div className="relative w-full h-full">
            {/* Connector lines */}
            {connectors.map((c, i) => (
              <div
                key={`c-${i}`}
                className="absolute bg-black rounded-full"
                style={{
                  left: `${c.left}%`,
                  top: `${c.top}%`,
                  width: c.width != null ? `${c.width}%` : "2px",
                  height: c.height != null ? `${c.height}%` : "2px",
                  transform:
                    c.height != null ? "translateX(-1px)" : "translateY(-1px)",
                }}
              />
            ))}

            {/* Cards */}
            {cards.map((c, i) => (
              <BracketCard
                key={
                  c.level === 0 && c.slot
                    ? `seed-${c.slot.seed}`
                    : `card-${c.level}-${c.globalIdx}`
                }
                card={c}
                index={i}
                onPick={onPick}
              />
            ))}
          </div>
        </div>
      </div>

      {champion && <ChampionBanner artist={artist} champion={champion} />}
    </div>
  );
}

function Header({
  artist,
  decided,
  total,
  onReset,
  onShuffle,
}: {
  artist: string;
  decided: number;
  total: number;
  onReset: () => void;
  onShuffle: () => void;
}) {
  const pct = (decided / total) * 100;
  return (
    <div className="shrink-0 bg-white border-b-2 border-black/10 px-4 py-2 fade-up">
      <div className="max-w-6xl mx-auto flex items-center gap-3">
        <button
          onClick={onReset}
          className="card clickable rounded-lg border-2 border-black text-[10px] uppercase tracking-widest px-3 py-1"
        >
          ← back
        </button>
        <button
          onClick={onShuffle}
          className="card clickable rounded-lg border-2 border-black text-[10px] uppercase tracking-widest px-3 py-1 inline-flex items-center gap-1.5"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-3 h-3"
            aria-hidden
          >
            <path d="M16 3h5v5" />
            <path d="M4 20 21 3" />
            <path d="M21 16v5h-5" />
            <path d="m15 15 6 6" />
            <path d="m4 4 5 5" />
          </svg>
          shuffle
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between text-[10px] uppercase tracking-widest opacity-60 mb-1">
            <span className="truncate">{artist}</span>
            <span>
              {decided} / {total}
            </span>
          </div>
          <div className="h-[2px] w-full bg-black/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-black rounded-full"
              style={{ width: `${pct}%`, transition: "width 240ms var(--ease-out)" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function BracketCard({
  card,
  index,
  onPick,
}: {
  card: {
    level: number;
    parentIdx: number;
    side: "left" | "right" | "center";
    slot: Slot;
    sibling: Slot;
    parent: Slot;
    isTop: boolean;
    geom: ReturnType<typeof cardGeom>;
    globalIdx: number;
  };
  index: number;
  onPick: (level: number, parentIdx: number, winner: Song) => void;
}) {
  const { slot, sibling, parent, isTop, geom, level, parentIdx, side } = card;

  const decidable = !isTop && slot != null && sibling != null;
  const isWinnerHere = parent && slot && parent.seed === slot.seed;
  const isLoserHere = parent && slot && parent.seed !== slot.seed;
  const isChampion = isTop && slot != null;

  const style: React.CSSProperties = {
    position: "absolute",
    top: `${geom.top}%`,
    left: `${geom.left}%`,
    width: `${geom.width}%`,
    height: `${geom.height}%`,
    animationDelay: `${Math.min(level * 35 + (card.globalIdx % 16) * 10, 500)}ms`,
    textAlign: side === "right" ? "right" : "left",
  };

  if (!slot) {
    return (
      <div
        className="card empty rounded-md border-2 border-black flex items-center justify-center text-[8px] uppercase tracking-widest"
        style={style}
      >
        {isTop ? "champion" : ""}
      </div>
    );
  }

  return (
    <button
      onClick={() => decidable && onPick(level, parentIdx, slot)}
      disabled={!decidable}
      style={style}
      className={`card card-enter rounded-md border-2 border-black px-2 flex items-center leading-none ${
        decidable ? "clickable" : "cursor-default"
      } ${isWinnerHere || isChampion ? "winner" : ""} ${isLoserHere ? "eliminated" : ""}`}
    >
      <span className="text-[10px] truncate flex-1">{slot.title}</span>
    </button>
  );
}

function ChampionBanner({ artist, champion }: { artist: string; champion: Song }) {
  return (
    <div className="shrink-0 bg-white border-t-2 border-black px-4 py-2 champion-in">
      <div className="max-w-6xl mx-auto text-center">
        <div className="text-[9px] uppercase tracking-widest opacity-60">
          {artist} champion
        </div>
        <div className="text-base md:text-lg leading-tight">{champion.title}</div>
      </div>
    </div>
  );
}
