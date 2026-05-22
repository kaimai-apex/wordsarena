'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  canPlaceAt,
  getTileCells,
  type GameState,
  type GridPosition,
  type Move,
  type Tile,
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

const EMPTY = new Set<string>();

type DragSession = {
  tileId: string;
  tile: Tile;
  grabOffsetX: number;
  grabOffsetY: number;
  pointerX: number;
  pointerY: number;
  originRow: number;
  originCol: number;
  anchorOffsetRow: number;
  anchorOffsetCol: number;
};

interface MultiplayerBoardProps {
  state: GameState;
  playerId: string;
  disabled?: boolean;
  onMove: (move: Move) => void;
  onClaim: (cells: GridPosition[]) => void;
  claimableCells: GridPosition[] | null;
  flashWord?: string | null;
}

export function MultiplayerBoard({
  state,
  playerId,
  disabled,
  onMove,
  onClaim,
  claimableCells,
  flashWord,
}: MultiplayerBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const metricsRef = useRef<BoardMetrics | null>(null);
  const dragRef = useRef<DragSession | null>(null);
  const floatRef = useRef<HTMLDivElement>(null);
  const [draggingTileId, setDraggingTileId] = useState<string | null>(null);
  const [hoverCells, setHoverCells] = useState<Set<string>>(EMPTY);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const tilesOnBoard = useMemo(
    () => Object.values(state.board.tiles).filter((t) => t.position),
    [state.board.tiles],
  );

  const computeHover = useCallback(
    (tile: Tile, anchorOffsetRow: number, anchorOffsetCol: number, cell: GridPosition | null) => {
      if (!cell || !tile.position) return EMPTY;
      const placement = placementFromGrab(cell.row, cell.col, anchorOffsetRow, anchorOffsetCol);
      if (
        !canPlaceAt(
          state.board.occupancy,
          tile.shape,
          placement.row,
          placement.col,
          tile.id,
        )
      ) {
        return EMPTY;
      }
      const moved = { ...tile, position: placement };
      return new Set(getTileCells(moved).map((c) => `${c.row},${c.col}`));
    },
    [state.board.occupancy],
  );

  const finishDrag = useCallback(
    (clientX: number, clientY: number) => {
      const session = dragRef.current;
      dragRef.current = null;
      setDraggingTileId(null);
      setHoverCells(EMPTY);
      if (!session || disabled) return;

      const metrics = metricsRef.current;
      if (!metrics) return;
      const cell = cellFromClient(clientX, clientY, metrics);
      if (!cell) return;

      const placement = placementFromGrab(cell.row, cell.col, session.anchorOffsetRow, session.anchorOffsetCol);
      if (placement.row === session.originRow && placement.col === session.originCol) return;

      onMove({
        playerId,
        type: 'drag',
        tileId: session.tileId,
        to: placement,
        timestamp: Date.now(),
      });
    },
    [disabled, onMove, playerId],
  );

  const onTilePointerDown = useCallback(
    (e: React.PointerEvent, tile: Tile) => {
      if (disabled || !tile.position || !boardRef.current) return;
      e.preventDefault();
      const metrics = readBoardMetrics(boardRef.current);
      metricsRef.current = metrics;
      const anchor = getGrabAnchorOffset(tile, e.clientX, e.clientY, boardRef.current);
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      dragRef.current = {
        tileId: tile.id,
        tile,
        grabOffsetX: e.clientX - rect.left,
        grabOffsetY: e.clientY - rect.top,
        pointerX: e.clientX,
        pointerY: e.clientY,
        originRow: tile.position.row,
        originCol: tile.position.col,
        anchorOffsetRow: anchor.anchorOffsetRow,
        anchorOffsetCol: anchor.anchorOffsetCol,
      };
      setDraggingTileId(tile.id);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [disabled],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const session = dragRef.current;
      if (!session) return;
      session.pointerX = e.clientX;
      session.pointerY = e.clientY;
      if (floatRef.current) {
        floatRef.current.style.transform = `translate(${e.clientX - session.grabOffsetX}px, ${e.clientY - session.grabOffsetY}px)`;
      }
      const metrics = metricsRef.current;
      if (!metrics) return;
      const cell = cellFromClient(e.clientX, e.clientY, metrics);
      setHoverCells(computeHover(session.tile, session.anchorOffsetRow, session.anchorOffsetCol, cell));
    },
    [computeHover],
  );

  const flashSet = useMemo(
    () =>
      flashWord && claimableCells
        ? new Set(claimableCells.map((c) => `${c.row},${c.col}`))
        : EMPTY,
    [claimableCells, flashWord],
  );

  return (
    <div className="flex flex-col items-center gap-4">
      {claimableCells && claimableCells.length > 0 && !disabled && (
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={() => onClaim(claimableCells)}
          className="animate-pulse-soft"
        >
          Claim {flashWord ?? 'word'}
        </Button>
      )}

      {mounted && draggingTileId && dragRef.current
        ? createPortal(
            <div
              ref={floatRef}
              className="pointer-events-none fixed left-0 top-0 z-[200] will-change-transform"
              style={{
                transform: `translate(${dragRef.current.pointerX - dragRef.current.grabOffsetX}px, ${dragRef.current.pointerY - dragRef.current.grabOffsetY}px)`,
              }}
            >
              <TilePiece tile={dragRef.current.tile} size="fill" lifted />
            </div>,
            document.body,
          )
        : null}

      <div
        className="relative rounded-sm p-1 shadow-board"
        style={{ backgroundColor: '#486b3a', width: 'min(540px, 92vw)' }}
      >
        <div
          ref={boardRef}
          className="relative aspect-square w-full touch-none select-none"
          onPointerMove={onPointerMove}
          onPointerUp={(e) => finishDrag(e.clientX, e.clientY)}
          onPointerCancel={(e) => finishDrag(e.clientX, e.clientY)}
        >
          <div
            className="absolute inset-0 grid gap-px"
            style={{
              gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
              gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`,
            }}
          >
            {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => {
              const row = Math.floor(i / GRID_SIZE);
              const col = i % GRID_SIZE;
              const key = `${row},${col}`;
              const highlighted = hoverCells.has(key) || flashSet.has(key);
              return (
                <div
                  key={key}
                  className={cn(
                    'rounded-[2px] border border-black/10',
                    highlighted && 'border-brand/80 bg-brand/30',
                  )}
                />
              );
            })}
          </div>

          <div
            className="pointer-events-none absolute inset-0 grid gap-px"
            style={{
              gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
              gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`,
            }}
          >
            {tilesOnBoard.map((tile) => (
              <BoardTileSlot
                key={tile.id}
                tile={tile}
                hidden={draggingTileId === tile.id}
                onPointerDown={onTilePointerDown}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const BoardTileSlot = memo(function BoardTileSlot({
  tile,
  hidden,
  onPointerDown,
}: {
  tile: Tile;
  hidden: boolean;
  onPointerDown: (e: React.PointerEvent, tile: Tile) => void;
}) {
  if (!tile.position) return null;
  return (
    <div
      className={cn('pointer-events-auto touch-none select-none', hidden && 'invisible')}
      style={tileGridStyle(tile)}
      onPointerDown={(e) => onPointerDown(e, tile)}
    >
      <TilePiece tile={tile} size="fill" />
    </div>
  );
});
