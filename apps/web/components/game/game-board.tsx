'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  createGame,
  tick,
  dragTileAndAutoClaim,
  canPlaceAt,
  getTileCells,
  loadDictionaryClient,
  nextStartingBoardIndex,
  randomStartingBoardIndex,
  type GameState,
  type GameMode,
  type Move,
  type Tile,
  type WordDictionary,
} from '@lexiform/engine/browser';
import {
  GRID_SIZE,
  readBoardMetrics,
  cellFromClient,
  getGrabAnchorOffset,
  placementFromGrab,
  tileGridStyle,
  type BoardMetrics,
} from '@/lib/board-layout';
import { TilePiece } from './tile-piece';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import { displayWord } from '@/lib/display-word';

const CLAIM_FLASH_MS = 320;
const EMPTY_HOVER = new Set<string>();

interface GameBoardProps {
  mode: GameMode;
  playerId: string;
  onGameOver?: (state: GameState, moves: Move[]) => void;
  onNewGame?: () => void;
}

type DragSession = {
  tileId: string;
  tile: Tile;
  grabOffsetX: number;
  grabOffsetY: number;
  pointerX: number;
  pointerY: number;
  width: number;
  height: number;
  originRow: number;
  originCol: number;
  anchorOffsetRow: number;
  anchorOffsetCol: number;
};

const BoardCellGrid = memo(function BoardCellGrid({
  hoverCells,
}: {
  hoverCells: ReadonlySet<string>;
}) {
  return (
    <div
      className="absolute inset-0 grid gap-0.5"
      style={{
        gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
        gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`,
      }}
    >
      {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => {
        const row = Math.floor(i / GRID_SIZE);
        const col = i % GRID_SIZE;
        const key = `${row},${col}`;
        const highlighted = hoverCells.has(key);
        return (
          <div
            key={key}
            className={cn(
              'rounded-sm border border-dotted border-white/20 transition-colors duration-100',
              highlighted && 'border-teal/80 bg-teal/35',
            )}
          />
        );
      })}
    </div>
  );
});

const BoardTileSlot = memo(function BoardTileSlot({
  tile,
  hidden,
  flashLetters,
  onPointerDown,
}: {
  tile: Tile;
  hidden: boolean;
  flashLetters?: boolean[];
  onPointerDown: (e: React.PointerEvent, tileId: string) => void;
}) {
  return (
    <div
      style={tileGridStyle(tile)}
      className={cn(
        'relative min-h-0 min-w-0',
        hidden ? 'z-0' : 'z-10 cursor-grab',
      )}
      onPointerDown={(e) => onPointerDown(e, tile.id)}
    >
      <TilePiece tile={tile} size="fill" dragging={hidden} flashLetters={flashLetters} />
    </div>
  );
});

export function GameBoard({ mode, playerId, onGameOver, onNewGame }: GameBoardProps) {
  const boardIndexRef = useRef(mode === 'daily' ? -1 : randomStartingBoardIndex());

  const [state, setState] = useState<GameState>(() =>
    createGame({
      mode,
      playerIds: [playerId],
      startingBoardIndex: boardIndexRef.current >= 0 ? boardIndexRef.current : undefined,
      now: Date.now(),
    }),
  );
  const [moves, setMoves] = useState<Move[]>([]);
  const [dictionary, setDictionary] = useState<WordDictionary | null>(null);
  const [draggingTileId, setDraggingTileId] = useState<string | null>(null);
  const [hoverCells, setHoverCells] = useState<ReadonlySet<string>>(EMPTY_HOVER);
  const [lastClaims, setLastClaims] = useState<{ word: string; points: number }[]>([]);
  const [flashCells, setFlashCells] = useState<ReadonlySet<string>>(EMPTY_HOVER);
  const [clockTick, setClockTick] = useState(0);
  const [mounted, setMounted] = useState(false);

  const boardRef = useRef<HTMLDivElement>(null);
  const floatRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragSession | null>(null);
  const metricsRef = useRef<BoardMetrics | null>(null);
  const hoverKeyRef = useRef<string | null>(null);
  const pendingPointerRef = useRef<{ x: number; y: number } | null>(null);
  const rafRef = useRef<number | null>(null);
  const endDragRef = useRef<(e: PointerEvent) => void>(() => {});
  const stateRef = useRef(state);
  const movesRef = useRef(moves);
  const onGameOverRef = useRef(onGameOver);

  stateRef.current = state;
  movesRef.current = moves;
  onGameOverRef.current = onGameOver;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    void loadDictionaryClient().then(setDictionary).catch(() => setDictionary(null));
  }, []);

  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const refresh = () => {
      metricsRef.current = readBoardMetrics(el);
    };
    refresh();
    const ro = new ResizeObserver(refresh);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (state.durationMs === Infinity || state.isOver) return;
    const id = window.setInterval(() => {
      const now = Date.now();
      const elapsed = now - state.startedAt;
      if (elapsed >= state.durationMs) {
        setState((s) => {
          if (s.isOver) return s;
          const { state: next } = tick(s, now);
          onGameOverRef.current?.(next, movesRef.current);
          return next;
        });
        return;
      }
      setClockTick((t) => t + 1);
    }, 250);
    return () => window.clearInterval(id);
  }, [state.durationMs, state.isOver, state.startedAt]);

  const timeLeft = useMemo(() => {
    if (state.durationMs === Infinity) return null;
    if (state.isOver) return 0;
    const elapsed = Date.now() - state.startedAt;
    return Math.max(0, state.durationMs - elapsed);
  }, [state.durationMs, state.startedAt, state.isOver, clockTick]);

  const formatTime = (ms: number) => {
    const s = Math.ceil(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const score = state.scoresByPlayer[playerId] ?? 0;
  const wordCount = state.wordsClaimedByPlayer[playerId]?.length ?? 0;
  const words = state.wordsClaimedByPlayer[playerId] ?? [];

  const boardTiles = useMemo(
    () => Object.values(state.board.tiles).filter((t) => t.position),
    [state.board.tiles],
  );

  const hiddenTileId = draggingTileId;

  const canDropAt = useCallback((row: number, col: number, tileId: string) => {
    const tile = stateRef.current.board.tiles[tileId];
    if (!tile) return false;
    return canPlaceAt(stateRef.current.board.occupancy, tile.shape, row, col, tileId);
  }, []);

  const commitDrop = useCallback(
    (row: number, col: number, tileId: string) => {
      if (!dictionary || stateRef.current.isOver) return;
      if (!canDropAt(row, col, tileId)) return;

      const now = Date.now();
      const current = stateRef.current;
      const move: Move = { playerId, type: 'drag', tileId, to: { row, col }, timestamp: now };

      try {
        const { state: next, claims } = dragTileAndAutoClaim(
          current,
          playerId,
          tileId,
          { row, col },
          now,
          dictionary,
        );
        setState(next);
        setMoves((m) => [...m, move]);
        if (claims.length > 0) {
          const flash = new Set(
            claims.flatMap((c) => c.cells.map((cell) => `${cell.row},${cell.col}`)),
          );
          setFlashCells(flash);
          setLastClaims(claims.map(({ word, points }) => ({ word, points })));
          window.setTimeout(() => setFlashCells(EMPTY_HOVER), CLAIM_FLASH_MS);
          window.setTimeout(() => setLastClaims([]), 1800);
        }
      } catch {
        /* invalid drop */
      }
    },
    [dictionary, playerId, canDropAt],
  );

  const computeHoverCells = useCallback(
    (session: DragSession, cell: { row: number; col: number } | null): ReadonlySet<string> => {
      if (!cell) return EMPTY_HOVER;
      const placement = placementFromGrab(
        cell.row,
        cell.col,
        session.anchorOffsetRow,
        session.anchorOffsetCol,
      );
      if (!canDropAt(placement.row, placement.col, session.tileId)) return EMPTY_HOVER;
      const cells = getTileCells({ ...session.tile, position: placement });
      return new Set(cells.map((c) => `${c.row},${c.col}`));
    },
    [canDropAt],
  );

  const syncFloatPosition = useCallback((clientX: number, clientY: number) => {
    const el = floatRef.current;
    const session = dragRef.current;
    if (!el || !session) return;
    el.style.transition = 'none';
    el.style.width = `${session.width}px`;
    el.style.height = `${session.height}px`;
    el.style.transform = `translate3d(${clientX - session.grabOffsetX}px, ${clientY - session.grabOffsetY}px, 0)`;
  }, []);

  const updateHoverFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const session = dragRef.current;
      const metrics = metricsRef.current;
      if (!session || !metrics) return;

      const cell = cellFromClient(clientX, clientY, metrics);
      const key = cell ? `${cell.row},${cell.col}` : '';
      if (key === hoverKeyRef.current) return;
      hoverKeyRef.current = key;
      setHoverCells(computeHoverCells(session, cell));
    },
    [computeHoverCells],
  );

  const finishDrag = useCallback(
    (clientX: number, clientY: number) => {
      const session = dragRef.current;
      if (!session) return;

      dragRef.current = null;
      window.removeEventListener('pointerup', endDragRef.current);
      window.removeEventListener('pointercancel', endDragRef.current);

      hoverKeyRef.current = null;
      setHoverCells(EMPTY_HOVER);
      setDraggingTileId(null);

      const metrics = metricsRef.current;
      const cell = metrics ? cellFromClient(clientX, clientY, metrics) : null;
      if (!cell) return;

      const placement = placementFromGrab(
        cell.row,
        cell.col,
        session.anchorOffsetRow,
        session.anchorOffsetCol,
      );
      if (!canDropAt(placement.row, placement.col, session.tileId)) return;

      commitDrop(placement.row, placement.col, session.tileId);
    },
    [canDropAt, commitDrop],
  );

  endDragRef.current = (e: PointerEvent) => {
    finishDrag(e.clientX, e.clientY);
  };

  const onPointerDown = useCallback(
    (e: React.PointerEvent, tileId: string) => {
      if (stateRef.current.isOver || draggingTileId) return;
    const tile = stateRef.current.board.tiles[tileId];
    const boardEl = boardRef.current;
    if (!tile?.position || !boardEl) return;

    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    metricsRef.current = readBoardMetrics(boardEl);
    const tileEl = e.currentTarget as HTMLElement;
    const rect = tileEl.getBoundingClientRect();
    const { anchorOffsetRow, anchorOffsetCol } = getGrabAnchorOffset(
      tile,
      e.clientX,
      e.clientY,
      boardEl,
    );

    const session: DragSession = {
      tileId,
      tile,
      grabOffsetX: e.clientX - rect.left,
      grabOffsetY: e.clientY - rect.top,
      pointerX: e.clientX,
      pointerY: e.clientY,
      width: rect.width,
      height: rect.height,
      originRow: tile.position.row,
      originCol: tile.position.col,
      anchorOffsetRow,
      anchorOffsetCol,
    };

    dragRef.current = session;
    setDraggingTileId(tileId);
    syncFloatPosition(e.clientX, e.clientY);
    updateHoverFromPointer(e.clientX, e.clientY);

    window.addEventListener('pointerup', endDragRef.current);
    window.addEventListener('pointercancel', endDragRef.current);
  }, [draggingTileId, syncFloatPosition, updateHoverFromPointer]);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const session = dragRef.current;
      if (!session) return;

      session.pointerX = e.clientX;
      session.pointerY = e.clientY;
      pendingPointerRef.current = { x: e.clientX, y: e.clientY };
      syncFloatPosition(e.clientX, e.clientY);

      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const point = pendingPointerRef.current;
        if (point) updateHoverFromPointer(point.x, point.y);
      });
    },
    [syncFloatPosition, updateHoverFromPointer],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      finishDrag(e.clientX, e.clientY);
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }
    },
    [finishDrag],
  );

  const startNewGame = useCallback(() => {
    const nextIndex = nextStartingBoardIndex(boardIndexRef.current);
    boardIndexRef.current = nextIndex;
    setState(
      createGame({
        mode,
        playerIds: [playerId],
        startingBoardIndex: nextIndex,
        now: Date.now(),
      }),
    );
    setMoves([]);
    dragRef.current = null;
    setDraggingTileId(null);
    hoverKeyRef.current = null;
    setHoverCells(EMPTY_HOVER);
    setLastClaims([]);
    setFlashCells(EMPTY_HOVER);
    onNewGame?.();
  }, [mode, playerId, onNewGame]);

  const flashCellSet = flashCells;

  const flashLettersForTile = useCallback(
    (tile: Tile): boolean[] | undefined => {
      if (flashCellSet.size === 0 || !tile.position) return undefined;
      const cells = getTileCells(tile);
      const mask = cells.map((c) => flashCellSet.has(`${c.row},${c.col}`));
      return mask.some(Boolean) ? mask : undefined;
    },
    [flashCellSet],
  );

  const floatingTile =
    draggingTileId && dragRef.current ? (
      <TilePiece tile={dragRef.current.tile} size="fill" lifted />
    ) : null;

  useEffect(() => {
    return () => {
      window.removeEventListener('pointerup', endDragRef.current);
      window.removeEventListener('pointercancel', endDragRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-5">
      {mounted
        ? createPortal(
            <div
              ref={floatRef}
              className={cn(
                'pointer-events-none fixed left-0 top-0 z-[200] will-change-transform',
                !draggingTileId && 'invisible',
              )}
            >
              {floatingTile}
            </div>,
            document.body,
          )
        : null}

      <div className="relative w-full max-w-[540px]">
        <div className="mx-auto flex max-w-md items-end justify-between gap-3 rounded-lg bg-white px-5 py-3 shadow-md">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">
              Words: {wordCount}
            </p>
            <p className="font-mono text-4xl font-black tracking-tight text-ink">
              {score.toString().padStart(4, '0')}
            </p>
            <p className="text-[10px] font-semibold uppercase text-ink-soft">Score</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {timeLeft !== null && (
              <div className="rounded-md bg-ink px-3 py-1.5 font-mono text-lg font-bold text-white">
                {formatTime(timeLeft)}
              </div>
            )}
            <Button type="button" variant="secondary" size="sm" onClick={startNewGame}>
              <RotateCcw className="mr-1.5 h-4 w-4" />
              New game
            </Button>
          </div>
        </div>
      </div>

      <div
        className="relative rounded-xl p-2 shadow-lg"
        style={{ backgroundColor: '#5B8FD4', width: 'min(540px, 92vw)' }}
      >
        <div
          ref={boardRef}
          className="relative aspect-square w-full touch-none"
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <BoardCellGrid hoverCells={hoverCells} />

          <div
            className="absolute inset-0 grid gap-0.5"
            style={{
              gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
              gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`,
            }}
          >
            {boardTiles.map((tile) => (
              <BoardTileSlot
                key={tile.id}
                tile={tile}
                hidden={hiddenTileId === tile.id}
                flashLetters={flashLettersForTile(tile)}
                onPointerDown={onPointerDown}
              />
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {lastClaims.length > 0 && (
          <motion.div
            key={lastClaims.map((c) => c.word).join(',')}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex min-h-[3.5rem] w-full max-w-[540px] flex-wrap items-center justify-center gap-3"
          >
            {lastClaims.map((c, i) => (
              <div
                key={i}
                className="rounded-xl bg-white px-5 py-2 text-center shadow-md ring-1 ring-teal/20"
              >
                <span className="text-xl font-black text-ink">{displayWord(c.word)}</span>
                <span className="ml-2 font-mono text-lg font-bold text-teal">+{c.points}</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <p className="max-w-md text-center text-sm text-ink-soft">
        Drag tiles to line up words — valid words score automatically.
      </p>

      {words.length > 0 && (
        <div className="w-full max-w-[540px] rounded-xl bg-white/80 px-4 py-3 shadow-sm">
          <p className="mb-2 text-xs font-bold uppercase text-ink-soft">Words found</p>
          <div className="flex flex-wrap gap-2">
            {words.map((w, i) => (
              <span
                key={i}
                className="rounded-full bg-[#E8C49A]/60 px-3 py-1 text-sm font-bold text-ink"
              >
                {displayWord(w.word)}{' '}
                <span className="font-mono text-teal">+{w.points}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {state.isOver && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="rounded-xl bg-ink px-8 py-5 text-center text-white shadow-lg"
        >
          <p className="text-xl font-bold">Time&apos;s up!</p>
          <p className="font-mono text-4xl font-black">{score}</p>
          <p className="text-sm text-white/70">{wordCount} words</p>
        </motion.div>
      )}
    </div>
  );
}
