"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders AI markdown responses — bold, tables, lists, italics, code.
 * Used in Virtual MR chat and Drug Details sidebar.
 */
export default function MarkdownMessage({ content, className = "" }) {
  return (
    <div className={`prose prose-sm max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headings
          h1: ({ children }) => <h1 className="text-sm font-bold text-[#2D2A6A] mb-1 mt-2">{children}</h1>,
          h2: ({ children }) => <h2 className="text-sm font-bold text-[#2D2A6A] mb-1 mt-2">{children}</h2>,
          h3: ({ children }) => <h3 className="text-xs font-bold text-[#2D2A6A] mb-1 mt-1.5">{children}</h3>,

          // Paragraphs
          p: ({ children }) => <p className="text-sm leading-relaxed mb-2 last:mb-0">{children}</p>,

          // Bold & italic
          strong: ({ children }) => <strong className="font-bold text-[#2D2A6A]">{children}</strong>,
          em: ({ children }) => <em className="italic text-gray-600">{children}</em>,

          // Lists
          ul: ({ children }) => <ul className="list-disc list-inside space-y-0.5 mb-2 text-sm">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside space-y-0.5 mb-2 text-sm">{children}</ol>,
          li: ({ children }) => <li className="text-sm leading-relaxed">{children}</li>,

          // Tables — scrollable for long dosage tables
          table: ({ children }) => (
            <div className="overflow-x-auto my-2 rounded-lg border border-purple-100">
              <table className="w-full text-xs border-collapse">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-[#5b2bce]/10">{children}</thead>,
          tbody: ({ children }) => <tbody className="divide-y divide-purple-50">{children}</tbody>,
          tr: ({ children }) => <tr className="hover:bg-purple-50/30">{children}</tr>,
          th: ({ children }) => <th className="px-2.5 py-2 text-left text-[11px] font-bold text-[#2D2A6A] whitespace-nowrap">{children}</th>,
          td: ({ children }) => <td className="px-2.5 py-2 text-[11px] text-gray-700 align-top">{children}</td>,

          // Inline code
          code: ({ inline, children }) =>
            inline ? (
              <code className="bg-purple-50 text-[#5b2bce] px-1 py-0.5 rounded text-[11px] font-mono">{children}</code>
            ) : (
              <pre className="bg-gray-800 text-gray-100 rounded-lg p-3 text-[11px] font-mono overflow-x-auto my-2">
                <code>{children}</code>
              </pre>
            ),

          // Blockquote
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-[#5b2bce]/40 pl-3 italic text-gray-500 text-xs my-2">{children}</blockquote>
          ),

          // Horizontal rule
          hr: () => <hr className="border-purple-100 my-2" />,

          // Links
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#5b2bce] underline hover:text-[#4318d1]">{children}</a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
