import React from 'react';
import { marked } from 'marked';

interface MarkdownRendererProps {
  content: string;
  isMarkdown?: boolean;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  isMarkdown = false,
  className = ''
}) => {
  if (!isMarkdown) {
    return (
      <div className={`whitespace-pre-wrap leading-relaxed ${className}`}>
        {content}
      </div>
    );
  }

  // Parse markdown
  const html = marked.parse(content, { breaks: true, gfm: true }) as string;

  return (
    <div
      className={`prose prose-invert prose-p:my-2 prose-headings:my-2 prose-ul:my-2 prose-li:my-0.5 text-neutral-200 leading-relaxed max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
