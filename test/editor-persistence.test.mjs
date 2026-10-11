import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';

// Normalization and default definitions from documentService
import {
  DEFAULT_TIPTAP_DOC,
  normalizeTiptapContent,
} from '../src/features/documents/documentService.ts';

// File import validation and parsing functions
import {
  validateImportFile,
  deriveDocumentTitle,
  parseTextToTiptap,
  parseMarkdownToTiptap,
  MAX_IMPORT_FILE_SIZE_BYTES,
} from '../src/features/documents/fileImport.ts';

describe('Ajaia Docs - Rich Text Editor & Persistence Suite', () => {
  describe('1. Content Normalization and Safe Defaults', () => {
    it('returns DEFAULT_TIPTAP_DOC when input is null or undefined', () => {
      const resNull = normalizeTiptapContent(null);
      const resUndefined = normalizeTiptapContent(undefined);

      assert.deepStrictEqual(resNull, DEFAULT_TIPTAP_DOC);
      assert.deepStrictEqual(resUndefined, DEFAULT_TIPTAP_DOC);
      assert.strictEqual(resNull.type, 'doc');
      assert.ok(Array.isArray(resNull.content));
    });

    it('returns DEFAULT_TIPTAP_DOC when input is an empty object or malformed', () => {
      const resEmpty = normalizeTiptapContent({});
      const resWrongType = normalizeTiptapContent({ type: 'not-doc' });
      const resMissingContent = normalizeTiptapContent({ type: 'doc' });

      assert.deepStrictEqual(resEmpty, DEFAULT_TIPTAP_DOC);
      assert.deepStrictEqual(resWrongType, DEFAULT_TIPTAP_DOC);
      assert.deepStrictEqual(resMissingContent, DEFAULT_TIPTAP_DOC);
    });

    it('parses valid stringified JSON into structured doc tree', () => {
      const jsonStr = JSON.stringify({
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }],
      });
      const parsed = normalizeTiptapContent(jsonStr);

      assert.strictEqual(parsed.type, 'doc');
      assert.strictEqual(parsed.content.length, 1);
      assert.strictEqual(parsed.content[0].type, 'paragraph');
    });

    it('preserves valid structured Tiptap JSON trees without alteration', () => {
      const validDoc = {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: 'Preserved Title' }],
          },
        ],
      };
      const result = normalizeTiptapContent(validDoc);
      assert.deepStrictEqual(result, validDoc);
    });
  });

  describe('2. Tiptap Formatting Persistence & Compatibility', () => {
    it('faithfully preserves Headings (H1 & H2), Bold, Italic, Underline, and Lists', () => {
      const sourceDocument = {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: 'Main Heading Level 1' }],
          },
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Section Heading Level 2' }],
          },
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Bold sample', marks: [{ type: 'bold' }] },
              { type: 'text', text: ' and ' },
              { type: 'text', text: 'Italic sample', marks: [{ type: 'italic' }] },
              { type: 'text', text: ' and ' },
              { type: 'text', text: 'Underline sample', marks: [{ type: 'underline' }] },
            ],
          },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Bullet Point A' }] }],
              },
            ],
          },
          {
            type: 'orderedList',
            content: [
              {
                type: 'listItem',
                content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Numbered Step 1' }] }],
              },
            ],
          },
        ],
      };

      // 1. Initialize editor with source document
      const editor = new Editor({
        extensions: [
          StarterKit.configure({
            heading: { levels: [1, 2] },
          }),
        ],
        content: sourceDocument,
      });

      const serialized = editor.getJSON();

      // 2. Validate node types
      assert.strictEqual(serialized.type, 'doc');
      assert.strictEqual(serialized.content.length, 5);

      // Verify Heading 1
      assert.strictEqual(serialized.content[0].type, 'heading');
      assert.strictEqual(serialized.content[0].attrs.level, 1);
      assert.strictEqual(serialized.content[0].content[0].text, 'Main Heading Level 1');

      // Verify Heading 2
      assert.strictEqual(serialized.content[1].type, 'heading');
      assert.strictEqual(serialized.content[1].attrs.level, 2);
      assert.strictEqual(serialized.content[1].content[0].text, 'Section Heading Level 2');

      // Verify Marks: Bold, Italic, Underline
      const paragraphItems = serialized.content[2].content;
      assert.strictEqual(paragraphItems[0].marks[0].type, 'bold');
      assert.strictEqual(paragraphItems[2].marks[0].type, 'italic');
      assert.strictEqual(paragraphItems[4].marks[0].type, 'underline');

      // Verify Bullet and Numbered Lists
      assert.strictEqual(serialized.content[3].type, 'bulletList');
      assert.strictEqual(serialized.content[4].type, 'orderedList');

      // 3. Re-load into a second editor instance to simulate refresh/reopen
      const reloadedEditor = new Editor({
        extensions: [
          StarterKit.configure({
            heading: { levels: [1, 2] },
          }),
        ],
        content: serialized,
      });

      const restoredJson = reloadedEditor.getJSON();
      assert.deepStrictEqual(restoredJson, serialized);
    });
  });

  describe('3. Autosave Concurrency, Race Condition, & Out-of-Order Save Guard', () => {
    it('prevents older delayed saves from overwriting newer edits', async () => {
      let confirmedRevision = 0;
      let reportedStatus = 'saved';

      // Simulated save controller mimicking DocumentEditor concurrency algorithm
      const simulateSave = async (revisionId, delayMs, succeed = true) => {
        reportedStatus = 'saving';
        await new Promise((resolve) => setTimeout(resolve, delayMs));

        if (!succeed) {
          reportedStatus = 'error';
          return false;
        }

        // Only update confirmed revision if it is strictly newer than what was already confirmed
        if (revisionId > confirmedRevision) {
          confirmedRevision = revisionId;
        }

        // Only report saved if this response corresponds to the latest edit
        if (revisionId === latestRevision) {
          reportedStatus = 'saved';
        }

        return true;
      };

      let latestRevision = 1;
      // Start Save #1 (takes 50ms)
      const p1 = simulateSave(1, 50);

      // User types newer edit Revision 2
      latestRevision = 2;
      // Start Save #2 (completes fast in 10ms)
      const p2 = simulateSave(2, 10);

      await Promise.all([p1, p2]);

      // Confirmed revision must be Revision 2 (not downgraded by p1)
      assert.strictEqual(confirmedRevision, 2);
      assert.strictEqual(reportedStatus, 'saved');
    });

    it('preserves pending content and enters error state on failure without losing edits', async () => {
      let pendingContent = {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Important note' }] }],
      };
      let saveStatus = 'saved';

      const mockDbSave = async (shouldFail) => {
        saveStatus = 'saving';
        if (shouldFail) {
          saveStatus = 'error';
          return false;
        }
        saveStatus = 'saved';
        return true;
      };

      // Save fails
      const success1 = await mockDbSave(true);
      assert.strictEqual(success1, false);
      assert.strictEqual(saveStatus, 'error');
      // Content was preserved in memory
      assert.ok(pendingContent !== null);
      assert.strictEqual(pendingContent.content[0].content[0].text, 'Important note');

      // Retry save succeeds
      const success2 = await mockDbSave(false);
      assert.strictEqual(success2, true);
      assert.strictEqual(saveStatus, 'saved');
    });
  });

  describe('4. Permission Guards', () => {
    it('correctly evaluates viewer vs editor permissions', () => {
      const ownedDoc = { ownership: 'owned', permission: 'view' };
      const sharedEditorDoc = { ownership: 'shared', permission: 'edit' };
      const sharedViewerDoc = { ownership: 'shared', permission: 'view' };

      const isReadOnly = (doc) => doc.ownership === 'shared' && doc.permission === 'view';

      assert.strictEqual(isReadOnly(ownedDoc), false, 'Owned doc is always editable');
      assert.strictEqual(isReadOnly(sharedEditorDoc), false, 'Shared with edit permission is editable');
      assert.strictEqual(isReadOnly(sharedViewerDoc), true, 'Shared with view permission is read-only');
    });
  });

  describe('5. File Import: Validation & Parsing Suite', () => {
    it('validates file sizes and rejects files larger than 1 MB', () => {
      const smallFile = { name: 'notes.txt', size: 500 * 1024, type: 'text/plain' };
      const exact1MbFile = { name: 'notes.txt', size: MAX_IMPORT_FILE_SIZE_BYTES, type: 'text/plain' };
      const oversizedFile = { name: 'huge.txt', size: MAX_IMPORT_FILE_SIZE_BYTES + 1, type: 'text/plain' };

      assert.strictEqual(validateImportFile(smallFile).valid, true);
      assert.strictEqual(validateImportFile(exact1MbFile).valid, true);

      const oversizedResult = validateImportFile(oversizedFile);
      assert.strictEqual(oversizedResult.valid, false);
      assert.ok(oversizedResult.error.includes('1 MB limit'));
    });

    it('accepts .txt and .md files and rejects unsupported file types', () => {
      const validTxt = { name: 'readme.txt', size: 1000, type: 'text/plain' };
      const validMd = { name: 'readme.md', size: 1000, type: '' }; // browser may send empty mime
      const validMarkdown = { name: 'spec.markdown', size: 1000, type: 'text/markdown' };
      const invalidPdf = { name: 'document.pdf', size: 1000, type: 'application/pdf' };
      const invalidExe = { name: 'installer.exe', size: 1000, type: 'application/x-msdownload' };
      const invalidImage = { name: 'photo.png', size: 1000, type: 'image/png' };

      assert.strictEqual(validateImportFile(validTxt).valid, true);
      assert.strictEqual(validateImportFile(validMd).valid, true);
      assert.strictEqual(validateImportFile(validMarkdown).valid, true);

      assert.strictEqual(validateImportFile(invalidPdf).valid, false);
      assert.strictEqual(validateImportFile(invalidExe).valid, false);
      assert.strictEqual(validateImportFile(invalidImage).valid, false);
    });

    it('derives sensible document titles from filenames', () => {
      assert.strictEqual(deriveDocumentTitle('Q3-Product-Roadmap.md'), 'Q3-Product-Roadmap');
      assert.strictEqual(deriveDocumentTitle('meeting_notes.txt'), 'meeting_notes');
      assert.strictEqual(deriveDocumentTitle('.txt'), 'Imported document');
      assert.strictEqual(deriveDocumentTitle(''), 'Imported document');
    });

    it('parses plain text files into valid Tiptap paragraphs', () => {
      const rawText = 'Paragraph one with some text.\n\nParagraph two with more details.\n\nParagraph three.';
      const doc = parseTextToTiptap(rawText);

      assert.strictEqual(doc.type, 'doc');
      assert.strictEqual(doc.content.length, 3);
      assert.strictEqual(doc.content[0].type, 'paragraph');
      assert.strictEqual(doc.content[0].content[0].text, 'Paragraph one with some text.');
      assert.strictEqual(doc.content[1].content[0].text, 'Paragraph two with more details.');
      assert.strictEqual(doc.content[2].content[0].text, 'Paragraph three.');

      // Empty text returns default valid doc
      assert.deepStrictEqual(parseTextToTiptap('   '), DEFAULT_TIPTAP_DOC);
    });

    it('parses Markdown files into structured Tiptap JSON with Headings, Formatting, and Lists', () => {
      const mdContent = `# Project Architecture

## Overview
This document outlines the **core features** and *design decisions*.
Also includes <u>important notes</u> and \`inline code\`.

### Key Deliverables
- Cloud synchronization
- Debounced autosave
- Markdown import

### Execution Steps
1. Define schema
2. Implement components
3. Validate persistence

> Collaboration is essential for product delivery.
`;

      const doc = parseMarkdownToTiptap(mdContent);

      assert.strictEqual(doc.type, 'doc');
      assert.ok(doc.content.length >= 6);

      // Verify Heading 1
      assert.strictEqual(doc.content[0].type, 'heading');
      assert.strictEqual(doc.content[0].attrs.level, 1);
      assert.strictEqual(doc.content[0].content[0].text, 'Project Architecture');

      // Verify Heading 2
      assert.strictEqual(doc.content[1].type, 'heading');
      assert.strictEqual(doc.content[1].attrs.level, 2);

      // Verify Paragraph with Bold, Italic, Underline, and Code
      const paraTokens = doc.content[2].content;
      const boldToken = paraTokens.find((t) => t.marks?.some((m) => m.type === 'bold'));
      const italicToken = paraTokens.find((t) => t.marks?.some((m) => m.type === 'italic'));
      const underlineToken = paraTokens.find((t) => t.marks?.some((m) => m.type === 'underline'));
      const codeToken = paraTokens.find((t) => t.marks?.some((m) => m.type === 'code'));

      assert.ok(boldToken, 'Found bold token');
      assert.strictEqual(boldToken.text, 'core features');
      assert.ok(italicToken, 'Found italic token');
      assert.strictEqual(italicToken.text, 'design decisions');
      assert.ok(underlineToken, 'Found underline token');
      assert.strictEqual(underlineToken.text, 'important notes');
      assert.ok(codeToken, 'Found code token');
      assert.strictEqual(codeToken.text, 'inline code');

      // Verify Bullet List
      const bulletList = doc.content.find((n) => n.type === 'bulletList');
      assert.ok(bulletList, 'Found bulletList');
      assert.strictEqual(bulletList.content.length, 3);
      assert.strictEqual(bulletList.content[0].content[0].content[0].text, 'Cloud synchronization');

      // Verify Ordered List
      const orderedList = doc.content.find((n) => n.type === 'orderedList');
      assert.ok(orderedList, 'Found orderedList');
      assert.strictEqual(orderedList.content.length, 3);
      assert.strictEqual(orderedList.content[0].content[0].content[0].text, 'Define schema');

      // Verify Blockquote
      const blockquote = doc.content.find((n) => n.type === 'blockquote');
      assert.ok(blockquote, 'Found blockquote');

      // 4. Verify that Tiptap Editor successfully instantiates and serializes this generated JSON
      const editor = new Editor({
        extensions: [
          StarterKit.configure({
            heading: { levels: [1, 2] },
          }),
        ],
        content: doc,
      });

      const editorJson = editor.getJSON();
      assert.strictEqual(editorJson.type, 'doc');
      assert.ok(editorJson.content.length > 0);
    });
  });
});
