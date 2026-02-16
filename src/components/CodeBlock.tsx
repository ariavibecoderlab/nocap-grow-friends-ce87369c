import React, { useState, useMemo } from 'react';
import { Check, Copy } from 'lucide-react';

interface CodeBlockProps {
  children: string;
}

const highlight = (code: string): React.ReactNode[] => {
  const trimmed = code.trim();
  return trimmed.split('\n').map((line, i) => {
    // Tokenize each line
    const parts: React.ReactNode[] = [];
    let remaining = line;
    let key = 0;

    const push = (match: string, cls: string) => {
      parts.push(<span key={key++} className={cls}>{match}</span>);
    };

    while (remaining.length > 0) {
      let matched = false;

      // Comments (# or //)
      const commentMatch = remaining.match(/^(#.*|\/\/.*)$/);
      if (commentMatch) { push(commentMatch[0], 'text-muted-foreground/60 italic'); remaining = ''; matched = true; }

      // Strings (double-quoted)
      if (!matched) {
        const strMatch = remaining.match(/^"(?:[^"\\]|\\.)*"/);
        if (strMatch) { push(strMatch[0], 'text-emerald-400'); remaining = remaining.slice(strMatch[0].length); matched = true; }
      }

      // Numbers
      if (!matched) {
        const numMatch = remaining.match(/^-?\b\d+(\.\d+)?\b/);
        if (numMatch) { push(numMatch[0], 'text-amber-400'); remaining = remaining.slice(numMatch[0].length); matched = true; }
      }

      // Booleans / null
      if (!matched) {
        const boolMatch = remaining.match(/^\b(true|false|null)\b/);
        if (boolMatch) { push(boolMatch[0], 'text-violet-400'); remaining = remaining.slice(boolMatch[0].length); matched = true; }
      }

      // curl flags (-X, -H, -d, --header, etc.)
      if (!matched) {
        const flagMatch = remaining.match(/^--?[a-zA-Z][\w-]*/);
        if (flagMatch) { push(flagMatch[0], 'text-sky-400'); remaining = remaining.slice(flagMatch[0].length); matched = true; }
      }

      // HTTP methods
      if (!matched) {
        const httpMatch = remaining.match(/^\b(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/);
        if (httpMatch) { push(httpMatch[0], 'text-rose-400 font-semibold'); remaining = remaining.slice(httpMatch[0].length); matched = true; }
      }

      // URLs
      if (!matched) {
        const urlMatch = remaining.match(/^https?:\/\/[^\s'"\\]+/);
        if (urlMatch) { push(urlMatch[0], 'text-sky-300 underline decoration-sky-300/30'); remaining = remaining.slice(urlMatch[0].length); matched = true; }
      }

      // JSON keys (word before colon)
      if (!matched) {
        const keyMatch = remaining.match(/^"(?:[^"\\]|\\.)*"\s*(?=:)/);
        if (keyMatch) { push(keyMatch[0], 'text-sky-300'); remaining = remaining.slice(keyMatch[0].length); matched = true; }
      }

      // curl command
      if (!matched) {
        const curlMatch = remaining.match(/^\bcurl\b/);
        if (curlMatch) { push(curlMatch[0], 'text-orange-400 font-semibold'); remaining = remaining.slice(curlMatch[0].length); matched = true; }
      }

      // Braces / brackets / colon / comma
      if (!matched) {
        const punctMatch = remaining.match(/^[{}[\]:,]/);
        if (punctMatch) { push(punctMatch[0], 'text-muted-foreground/80'); remaining = remaining.slice(1); matched = true; }
      }

      // Default: consume one char
      if (!matched) {
        parts.push(<span key={key++}>{remaining[0]}</span>);
        remaining = remaining.slice(1);
      }
    }

    return <React.Fragment key={i}>{parts}{i < trimmed.split('\n').length - 1 ? '\n' : ''}</React.Fragment>;
  });
};

const CodeBlock = ({ children }: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);
  const highlighted = useMemo(() => highlight(children), [children]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(children.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <pre className="p-4 bg-muted rounded-md text-xs overflow-x-auto pr-12 leading-relaxed">
        <code>{highlighted}</code>
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 rounded-md bg-background/80 border border-border opacity-0 group-hover:opacity-100 transition-opacity hover:bg-accent"
        aria-label="Copy to clipboard"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-green-500" />
        ) : (
          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>
    </div>
  );
};

export default CodeBlock;
