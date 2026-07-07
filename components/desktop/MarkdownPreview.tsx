"use client";
import { useMemo } from "react";
import { marked } from "marked";

marked.setOptions({ gfm: true, breaks: true });

export default function MarkdownPreview({ content }: { content: string }) {
  const html = useMemo(() => {
    try {
      return marked.parse(content) as string;
    } catch {
      return "<p>Unable to render preview.</p>";
    }
  }, [content]);

  return (
    <div className="h-full overflow-auto bg-gray-950 px-8 py-6">
      <div
        className="prose prose-invert prose-sm max-w-none
          prose-headings:text-white prose-headings:font-semibold
          prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg
          prose-p:text-gray-300 prose-p:leading-relaxed
          prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
          prose-code:text-blue-300 prose-code:bg-gray-800 prose-code:px-1 prose-code:rounded prose-code:text-xs
          prose-pre:bg-gray-800 prose-pre:border prose-pre:border-gray-700 prose-pre:rounded-lg
          prose-blockquote:border-l-blue-500 prose-blockquote:text-gray-400
          prose-strong:text-white prose-em:text-gray-300
          prose-ul:text-gray-300 prose-ol:text-gray-300
          prose-li:text-gray-300
          prose-hr:border-gray-700
          prose-table:text-gray-300
          prose-th:text-gray-200 prose-td:border-gray-700 prose-th:border-gray-700"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
