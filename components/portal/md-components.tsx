import type { Components } from "react-markdown";

/**
 * Shared react-markdown renderers that keep wide content from scrolling the whole page
 * on a phone. The portal has no `@tailwindcss/typography` plugin, so a bare GFM `<table>`
 * or a long `<pre>` line has no width cap and no scroll container — on a ~375px screen it
 * forces horizontal PAGE scroll. These wrap the two offenders in their own
 * `overflow-x-auto` box (and give the otherwise-unstyled table minimal legibility), so
 * the content scrolls inside itself and the page never does.
 */
export const mdComponents: Components = {
  table: ({ node, ...props }) => (
    <div className="my-3 overflow-x-auto">
      <table className="w-full border-collapse text-sm [&_td]:border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_th]:font-semibold" {...props} />
    </div>
  ),
  pre: ({ node, ...props }) => <pre className="my-3 overflow-x-auto rounded-md bg-secondary/40 p-3 text-xs" {...props} />,
};
