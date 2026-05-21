import type { CSSProperties } from 'react';
import type { Tile } from '@lexiform/engine/browser';

export const GRID_SIZE = 9;
export const GRID_GAP_PX = 2;

export type BoardMetrics = {
  left: number;
  top: number;
  width: number;
  height: number;
  cellW: number;
  cellH: number;
};

export function readBoardMetrics(boardEl: HTMLElement): BoardMetrics {
  const rect = boardEl.getBoundingClientRect();
  const cellW = (rect.width - GRID_GAP_PX * (GRID_SIZE - 1)) / GRID_SIZE;
  const cellH = (rect.height - GRID_GAP_PX * (GRID_SIZE - 1)) / GRID_SIZE;
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    cellW,
    cellH,
  };
}

export function cellFromClient(
  clientX: number,
  clientY: number,
  metrics: BoardMetrics,
): { row: number; col: number } | null {
  const x = clientX - metrics.left;
  const y = clientY - metrics.top;
  if (x < 0 || y < 0 || x > metrics.width || y > metrics.height) return null;
  const col = Math.min(GRID_SIZE - 1, Math.floor((x / metrics.width) * GRID_SIZE));
  const row = Math.min(GRID_SIZE - 1, Math.floor((y / metrics.height) * GRID_SIZE));
  return { row, col };
}

export function getBoardMetrics(boardEl: HTMLElement) {
  const m = readBoardMetrics(boardEl);
  return {
    rect: { left: m.left, top: m.top, width: m.width, height: m.height } as DOMRect,
    cellW: m.cellW,
    cellH: m.cellH,
  };
}

export function tileSpan(shape: Tile['shape']): { colSpan: number; rowSpan: number } {
  if (shape.kind === 'pair') {
    return shape.orientation === 'horizontal'
      ? { colSpan: 2, rowSpan: 1 }
      : { colSpan: 1, rowSpan: 2 };
  }
  return { colSpan: 1, rowSpan: 1 };
}

export function getPlacementBounds(
  row: number,
  col: number,
  shape: Tile['shape'],
  boardEl: HTMLElement,
): { left: number; top: number; width: number; height: number } {
  const { rect, cellW, cellH } = getBoardMetrics(boardEl);
  const { colSpan, rowSpan } = tileSpan(shape);
  const width = colSpan * cellW + (colSpan - 1) * GRID_GAP_PX;
  const height = rowSpan * cellH + (rowSpan - 1) * GRID_GAP_PX;
  const left = rect.left + col * (cellW + GRID_GAP_PX);
  const top = rect.top + row * (cellH + GRID_GAP_PX);
  return { left, top, width, height };
}

export function tileGridStyle(tile: Tile): CSSProperties {
  if (!tile.position) return { display: 'none' };
  const { row, col } = tile.position;
  const colStart = col + 1;
  const rowStart = row + 1;

  if (tile.shape.kind === 'pair' && tile.shape.orientation === 'horizontal') {
    return { gridColumn: `${colStart} / span 2`, gridRow: `${rowStart}` };
  }
  if (tile.shape.kind === 'pair' && tile.shape.orientation === 'vertical') {
    return { gridColumn: `${colStart}`, gridRow: `${rowStart} / span 2` };
  }
  return { gridColumn: `${colStart}`, gridRow: `${rowStart}` };
}

export function getGrabAnchorOffset(
  tile: Tile,
  clientX: number,
  clientY: number,
  boardEl: HTMLElement,
): { anchorOffsetRow: number; anchorOffsetCol: number } {
  if (tile.shape.kind !== 'pair' || !tile.position) {
    return { anchorOffsetRow: 0, anchorOffsetCol: 0 };
  }

  const full = getPlacementBounds(tile.position.row, tile.position.col, tile.shape, boardEl);
  const { cellW, cellH } = getBoardMetrics(boardEl);

  if (tile.shape.orientation === 'horizontal') {
    const rightCellLeft = full.left + cellW + GRID_GAP_PX;
    return clientX >= rightCellLeft
      ? { anchorOffsetRow: 0, anchorOffsetCol: 1 }
      : { anchorOffsetRow: 0, anchorOffsetCol: 0 };
  }

  const bottomCellTop = full.top + cellH + GRID_GAP_PX;
  return clientY >= bottomCellTop
    ? { anchorOffsetRow: 1, anchorOffsetCol: 0 }
    : { anchorOffsetRow: 0, anchorOffsetCol: 0 };
}

export function placementFromGrab(
  hoverRow: number,
  hoverCol: number,
  anchorOffsetRow: number,
  anchorOffsetCol: number,
): { row: number; col: number } {
  return {
    row: hoverRow - anchorOffsetRow,
    col: hoverCol - anchorOffsetCol,
  };
}
