import { createContext } from "react";

export const MemoMoveContext = createContext<{
  canMoveUp: boolean;
  canMoveDown: boolean;
  moving: boolean;
  move: (direction: -1 | 1) => void;
} | null>(null);
