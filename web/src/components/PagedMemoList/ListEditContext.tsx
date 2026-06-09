import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";

/**
 * Context that lets any MemoEditor inside a PagedMemoList report when it's being edited,
 * so the list can disable drag-and-drop during editing.
 */
interface ListEditContextValue {
  /** Returns a cleanup function; call it to exit editing. */
  enterEdit: () => () => void;
  /** >0 when any editor is active. */
  isEditing: boolean;
}

const ListEditContext = createContext<ListEditContextValue>({
  enterEdit: () => () => {},
  isEditing: false,
});

export function ListEditProvider({ children }: { children: ReactNode }) {
  const [editingCount, setEditingCount] = useState(0);
  const countRef = useRef(0);

  const enterEdit = useCallback(() => {
    countRef.current += 1;
    setEditingCount(countRef.current);
    return () => {
      countRef.current -= 1;
      setEditingCount(countRef.current);
    };
  }, []);

  return <ListEditContext.Provider value={{ enterEdit, isEditing: editingCount > 0 }}>{children}</ListEditContext.Provider>;
}

/** Hook for MemoEditor to report when it enters/leaves editing state. */
export function useListEditReporter() {
  const { enterEdit } = useContext(ListEditContext);
  return enterEdit;
}

/** Hook for components inside the list to know if editing is happening. */
export function useListIsEditing() {
  const { isEditing } = useContext(ListEditContext);
  return isEditing;
}

/**
 * Bridge component: reads isEditing from context and notifies parent.
 * Placed inside ListEditProvider in PagedMemoList, so PagedMemoList
 * (which renders the provider) can still react to editing state.
 */
export function ListEditBridge({ onChange }: { onChange: (isEditing: boolean) => void }) {
  const isEditing = useListIsEditing();
  useEffect(() => {
    onChange(isEditing);
  }, [isEditing, onChange]);
  return null;
}
