'use client';

import { memo } from 'react';
import { cn } from '@/lib/utils';
import type { Tile } from '@lexiform/engine/browser';

const TILE_STYLE = {
  backgroundColor: '#E8C49A',
  borderBottom: '3px solid #C9A66B',
  color: '#2D1810',
} as const;

const CLAIMED_STYLE = {
  backgroundColor: '#FFFFFF',
  borderBottom: '3px solid #2E80FF',
  color: '#2E80FF',
} as const;

interface TilePieceProps {
  tile: Tile;
  size?: 'sm' | 'md' | 'fill';
  dragging?: boolean;
  lifted?: boolean;
  /** Per-letter flash — only indices in the scored word illuminate. */
  flashLetters?: boolean[];
}

export const TilePiece = memo(function TilePiece({
  tile,
  size = 'md',
  dragging,
  lifted,
  flashLetters,
}: TilePieceProps) {
  const dim =
    size === 'fill'
      ? 'h-full w-full min-h-[2rem] text-base sm:text-lg'
      : size === 'sm'
        ? 'h-9 w-9 text-sm'
        : 'h-14 w-14 text-xl';
  const isPair = tile.shape.kind === 'pair';
  const dragClass = lifted
    ? 'scale-[1.04] shadow-xl ring-2 ring-teal/30'
    : dragging
      ? 'opacity-0'
      : '';

  if (isPair && tile.letters.length === 2 && tile.shape.kind === 'pair') {
    const vertical = tile.shape.orientation === 'vertical';
    return (
      <div
        className={cn(
          'flex overflow-hidden rounded-md shadow-tile select-none transition-all duration-200',
          size === 'fill' ? 'h-full w-full' : '',
          vertical ? 'flex-col' : 'flex-row',
          dragClass,
        )}
      >
        {tile.letters.map((letter, i) => {
          const flashed = flashLetters?.[i] ?? false;
          const style = flashed ? CLAIMED_STYLE : TILE_STYLE;
          return (
            <span
              key={i}
              style={style}
              className={cn(
                dim,
                'flex flex-1 items-center justify-center font-extrabold transition-all duration-200',
                flashed && 'scale-[1.02] shadow-lg ring-2 ring-[#2E80FF]/40',
              )}
            >
              {letter}
            </span>
          );
        })}
      </div>
    );
  }

  const letter = tile.letters[0] ?? '?';
  const flashed = flashLetters?.[0] ?? false;
  const style = flashed ? CLAIMED_STYLE : TILE_STYLE;

  return (
    <div
      style={style}
      className={cn(
        dim,
        'flex items-center justify-center rounded-md font-extrabold shadow-tile select-none transition-all duration-200',
        size === 'fill' ? 'h-full w-full' : '',
        dragClass,
        flashed && 'scale-[1.02] shadow-lg ring-2 ring-[#2E80FF]/40',
      )}
    >
      {letter}
    </div>
  );
});
