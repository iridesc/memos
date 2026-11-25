import { createContext, useContext } from "react";

/**
 * Whether memo cards spell out their state word ("已完成" / "已归档").
 *
 * Homogeneous lists — the archive page, the completed tab and the collapsible
 * completed group — already express the state through the list itself, so
 * repeating the word on every row is noise. Mixed lists keep it, because the
 * state word is the only hint telling a completed memo apart from an active one.
 */
const MemoStateLabelContext = createContext(true);

export const MemoStateLabelProvider = MemoStateLabelContext.Provider;

export const useMemoStateLabel = (): boolean => useContext(MemoStateLabelContext);

export default MemoStateLabelContext;
