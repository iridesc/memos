import { useInstance } from "@/contexts/InstanceContext";
import { colorToHex } from "@/lib/color";
import { findTagMetadata } from "@/lib/tag";
import { cn } from "@/lib/utils";

interface MemoTagsProps {
  tags: readonly string[] | null | undefined;
  className?: string;
  /** When provided, each chip becomes a button and calls back with the tag name. */
  onTagClick?: (tag: string) => void;
}

/**
 * Renders memo tags as chips outside the Markdown pipeline.
 *
 * Memo content is rendered through `remark-tag` in the normal memo views, but compact
 * plain-text previews (e.g. the calendar day dialog) never run that plugin, so tags
 * have to be rendered from `memo.tags` directly. Colors follow the instance tag metadata.
 */
export const MemoTags: React.FC<MemoTagsProps> = ({ tags, className, onTagClick }) => {
  const { tagsSetting } = useInstance();

  if (!tags || tags.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {tags.map((tag) => {
        const bgHex = colorToHex(findTagMetadata(tag, tagsSetting)?.backgroundColor);
        // Dynamic hex values must use inline styles because Tailwind can't scan constructed class names.
        const tagStyle: React.CSSProperties | undefined = bgHex
          ? {
              borderColor: bgHex,
              color: `color-mix(in srgb, ${bgHex} 60%, black)`,
              backgroundColor: `color-mix(in srgb, ${bgHex} 15%, transparent)`,
            }
          : undefined;
        const chip = (
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2 py-0.5 text-xs leading-none",
              !bgHex && "border-primary bg-primary/15 text-primary",
            )}
            style={tagStyle}
            data-tag={tag}
          >
            #{tag}
          </span>
        );

        if (!onTagClick) {
          return <span key={tag}>{chip}</span>;
        }

        const handleClick = (event: React.MouseEvent) => {
          // Chips live inside a clickable card in most callers; keep the click local.
          event.preventDefault();
          event.stopPropagation();
          onTagClick(tag);
        };

        return (
          <button
            key={tag}
            type="button"
            className="cursor-pointer rounded-full transition-opacity hover:opacity-75 focus-visible:outline-2 focus-visible:outline-primary"
            onClick={handleClick}
          >
            {chip}
          </button>
        );
      })}
    </div>
  );
};

export default MemoTags;
