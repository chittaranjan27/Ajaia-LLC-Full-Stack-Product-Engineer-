import { DEFAULT_TIPTAP_DOC } from './documentService';

export const MAX_IMPORT_FILE_SIZE_BYTES = 1024 * 1024; // 1 MB = 1,048,576 bytes

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates file extension, MIME type, and file size.
 * Rejects unsupported file types and files exceeding 1 MB.
 */
export function validateImportFile(file: File): FileValidationResult {
  if (!file) {
    return { valid: false, error: 'No file selected.' };
  }

  // 1. File size check (Max 1 MB)
  if (file.size > MAX_IMPORT_FILE_SIZE_BYTES) {
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `File size (${sizeInMb} MB) exceeds the 1 MB limit. Please select a smaller file.`,
    };
  }

  // 2. File extension check
  const filename = file.name || '';
  const dotIndex = filename.lastIndexOf('.');
  const ext = dotIndex !== -1 ? filename.slice(dotIndex).toLowerCase() : '';
  const allowedExtensions = ['.txt', '.md', '.markdown', '.text'];

  if (!allowedExtensions.includes(ext)) {
    return {
      valid: false,
      error: 'Unsupported file type. Only .txt and .md files are supported.',
    };
  }

  // 3. MIME type check: Reject obvious non-text binary types while tolerating browser variance on .md
  const mime = file.type ? file.type.toLowerCase() : '';
  const prohibitedMimePrefixes = [
    'image/',
    'video/',
    'audio/',
    'application/pdf',
    'application/zip',
    'application/x-zip',
    'application/vnd.openxmlformats',
    'application/msword',
  ];

  for (const prefix of prohibitedMimePrefixes) {
    if (mime.startsWith(prefix)) {
      return {
        valid: false,
        error: 'Unsupported file type. Please upload a plain text or Markdown file.',
      };
    }
  }

  return { valid: true };
}

/**
 * Derives a human-readable title from the uploaded filename.
 */
export function deriveDocumentTitle(filename: string): string {
  if (!filename) return 'Imported document';
  const base = filename.replace(/\.[^/.]+$/, '').trim();
  return base || 'Imported document';
}

/**
 * Reads a File object as UTF-8 text using FileReader.
 */
export function readImportFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        resolve(result);
      } else {
        reject(new Error('Failed to read file as text encoding.'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Error reading file. The file may be unreadable or corrupted.'));
    };

    reader.onabort = () => {
      reject(new Error('File reading was aborted.'));
    };

    try {
      reader.readAsText(file, 'UTF-8');
    } catch (err: unknown) {
      reject(err instanceof Error ? err : new Error('Unable to read file contents.'));
    }
  });
}

/**
 * Parses inline markdown marks (bold, italic, underline, inline code).
 */
export function parseInlineMarkdown(
  text: string
): Array<{ type: string; text: string; marks?: Array<{ type: string }> }> {
  if (!text) return [];

  // Match bold+italic (*** or ___), bold (** or __), italic (* or _), code (`), underline (<u> or <ins>)
  const inlineRegex =
    /(\*\*\*[^*]+?\*\*\*|___[^_]+?___|\*\*[^*]+?\*\*|__[^_]+?__|\*[^*]+?\*|_[^_]+?_|`[^`]+?`|<u>.*?<\/u>|<ins>.*?<\/ins>)/g;

  const results: Array<{ type: string; text: string; marks?: Array<{ type: string }> }> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = inlineRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const plain = text.slice(lastIndex, match.index);
      if (plain) {
        results.push({ type: 'text', text: plain });
      }
    }

    const raw = match[0];
    if (
      (raw.startsWith('***') && raw.endsWith('***')) ||
      (raw.startsWith('___') && raw.endsWith('___'))
    ) {
      const inner = raw.slice(3, -3);
      if (inner) {
        results.push({
          type: 'text',
          text: inner,
          marks: [{ type: 'bold' }, { type: 'italic' }],
        });
      }
    } else if (
      (raw.startsWith('**') && raw.endsWith('**')) ||
      (raw.startsWith('__') && raw.endsWith('__'))
    ) {
      const inner = raw.slice(2, -2);
      if (inner) {
        results.push({
          type: 'text',
          text: inner,
          marks: [{ type: 'bold' }],
        });
      }
    } else if (
      (raw.startsWith('*') && raw.endsWith('*')) ||
      (raw.startsWith('_') && raw.endsWith('_'))
    ) {
      const inner = raw.slice(1, -1);
      if (inner) {
        results.push({
          type: 'text',
          text: inner,
          marks: [{ type: 'italic' }],
        });
      }
    } else if (raw.startsWith('`') && raw.endsWith('`')) {
      const inner = raw.slice(1, -1);
      if (inner) {
        results.push({
          type: 'text',
          text: inner,
          marks: [{ type: 'code' }],
        });
      }
    } else if (raw.startsWith('<u>') && raw.endsWith('</u>')) {
      const inner = raw.slice(3, -4);
      if (inner) {
        results.push({
          type: 'text',
          text: inner,
          marks: [{ type: 'underline' }],
        });
      }
    } else if (raw.startsWith('<ins>') && raw.endsWith('</ins>')) {
      const inner = raw.slice(5, -6);
      if (inner) {
        results.push({
          type: 'text',
          text: inner,
          marks: [{ type: 'underline' }],
        });
      }
    }

    lastIndex = inlineRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    const trailing = text.slice(lastIndex);
    if (trailing) {
      results.push({ type: 'text', text: trailing });
    }
  }

  return results;
}

/**
 * Converts a plain .txt file's string content into valid Tiptap JSON.
 */
export function parseTextToTiptap(text: string): Record<string, unknown> {
  const trimmed = text.trim();
  if (!trimmed) {
    return DEFAULT_TIPTAP_DOC;
  }

  // Normalize line breaks
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Split into paragraphs by blank lines
  const paragraphs = normalized
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) {
    return DEFAULT_TIPTAP_DOC;
  }

  const contentNodes = paragraphs.map((para) => ({
    type: 'paragraph',
    content: [{ type: 'text', text: para }],
  }));

  return {
    type: 'doc',
    content: contentNodes,
  };
}

/**
 * Converts Markdown string content into valid Tiptap JSON.
 * Preserves Headings (H1 and H2), paragraphs, bold, italic, underline,
 * bullet lists, numbered lists, blockquotes, code blocks, and horizontal rules.
 */
export function parseMarkdownToTiptap(markdown: string): Record<string, unknown> {
  const trimmed = markdown.trim();
  if (!trimmed) {
    return DEFAULT_TIPTAP_DOC;
  }

  const normalized = markdown.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n');

  const docContent: Array<Record<string, unknown>> = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // 1. Skip empty lines
    if (!trimmedLine) {
      i++;
      continue;
    }

    // 2. Fenced Code Block: ```
    if (trimmedLine.startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) {
        i++; // consume closing ```
      }

      docContent.push({
        type: 'codeBlock',
        content: codeLines.length > 0 ? [{ type: 'text', text: codeLines.join('\n') }] : [],
      });
      continue;
    }

    // 3. Headings: #, ##, ###
    const headingMatch = trimmedLine.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = Math.min(headingMatch[1].length, 2); // Map to level 1 or 2
      const textContent = headingMatch[2].trim();
      const inlineNodes = parseInlineMarkdown(textContent);

      docContent.push({
        type: 'heading',
        attrs: { level },
        content: inlineNodes.length > 0 ? inlineNodes : [{ type: 'text', text: textContent }],
      });
      i++;
      continue;
    }

    // 4. Horizontal Rule: ---, ***, ___
    if (/^(\*{3,}|-{3,}|_{3,})$/.test(trimmedLine)) {
      docContent.push({
        type: 'horizontalRule',
      });
      i++;
      continue;
    }

    // 5. Blockquote: > Text
    if (trimmedLine.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      const quoteText = quoteLines.join(' ');
      const inlineNodes = parseInlineMarkdown(quoteText);

      docContent.push({
        type: 'blockquote',
        content: [
          {
            type: 'paragraph',
            content: inlineNodes.length > 0 ? inlineNodes : [{ type: 'text', text: quoteText }],
          },
        ],
      });
      continue;
    }

    // 6. Unordered List: - Item, * Item, + Item
    if (/^[-*+]\s+/.test(trimmedLine)) {
      const listItems: Array<Record<string, unknown>> = [];
      while (i < lines.length && /^[-*+]\s+/.test(lines[i].trim())) {
        const itemText = lines[i].trim().replace(/^[-*+]\s+/, '');
        const inlineNodes = parseInlineMarkdown(itemText);
        listItems.push({
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: inlineNodes.length > 0 ? inlineNodes : [{ type: 'text', text: itemText }],
            },
          ],
        });
        i++;
      }

      docContent.push({
        type: 'bulletList',
        content: listItems,
      });
      continue;
    }

    // 7. Ordered List: 1. Item, 2. Item
    if (/^\d+\.\s+/.test(trimmedLine)) {
      const listItems: Array<Record<string, unknown>> = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        const itemText = lines[i].trim().replace(/^\d+\.\s+/, '');
        const inlineNodes = parseInlineMarkdown(itemText);
        listItems.push({
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: inlineNodes.length > 0 ? inlineNodes : [{ type: 'text', text: itemText }],
            },
          ],
        });
        i++;
      }

      docContent.push({
        type: 'orderedList',
        content: listItems,
      });
      continue;
    }

    // 8. Normal Paragraph: Collect consecutive non-empty lines
    const paragraphLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith('```') &&
      !lines[i].trim().startsWith('#') &&
      !/^(\*{3,}|-{3,}|_{3,})$/.test(lines[i].trim()) &&
      !lines[i].trim().startsWith('>') &&
      !/^[-*+]\s+/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim())
    ) {
      paragraphLines.push(lines[i].trim());
      i++;
    }

    const fullParaText = paragraphLines.join(' ');
    const inlineNodes = parseInlineMarkdown(fullParaText);

    docContent.push({
      type: 'paragraph',
      content: inlineNodes.length > 0 ? inlineNodes : [{ type: 'text', text: fullParaText }],
    });
  }

  if (docContent.length === 0) {
    return DEFAULT_TIPTAP_DOC;
  }

  return {
    type: 'doc',
    content: docContent,
  };
}
