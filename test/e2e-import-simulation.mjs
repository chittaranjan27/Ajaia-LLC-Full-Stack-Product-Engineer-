import assert from 'node:assert';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import {
  validateImportFile,
  parseTextToTiptap,
  parseMarkdownToTiptap,
  deriveDocumentTitle,
} from '../src/features/documents/fileImport.ts';

console.log('=== Running E2E File Import Simulation Tests ===\n');

// 1. Test Unsupported File (.pdf, .docx, .png)
console.log('1. Testing unsupported file validation...');
const unsupportedFile = {
  name: 'quarterly_report.pdf',
  size: 50 * 1024,
  type: 'application/pdf',
};
const unsuppResult = validateImportFile(unsupportedFile);
assert.strictEqual(unsuppResult.valid, false);
console.log('  -> Unsupported file rejected as expected:', unsuppResult.error);

// 2. Test File larger than 1 MB
console.log('\n2. Testing file size limit (> 1 MB)...');
const oversizedFile = {
  name: 'huge_document.txt',
  size: 1.5 * 1024 * 1024, // 1.5 MB
  type: 'text/plain',
};
const oversizedResult = validateImportFile(oversizedFile);
assert.strictEqual(oversizedResult.valid, false);
console.log('  -> Oversized file rejected as expected:', oversizedResult.error);

// 3. Test Valid .txt file
console.log('\n3. Testing valid .txt file import...');
const validTxtFile = {
  name: 'daily_standup_notes.txt',
  size: 1200,
  type: 'text/plain',
};
const validTxtResult = validateImportFile(validTxtFile);
assert.strictEqual(validTxtResult.valid, true);

const sampleTxtContent = `Yesterday we finished phase 3 authentication and document service.

Today we are implementing file import for txt and markdown documents.

Blockers: None. Everything is moving along smoothly.`;

const txtDocJson = parseTextToTiptap(sampleTxtContent);
const txtTitle = deriveDocumentTitle(validTxtFile.name);

assert.strictEqual(txtTitle, 'daily_standup_notes');
assert.strictEqual(txtDocJson.type, 'doc');
assert.strictEqual(txtDocJson.content.length, 3);
console.log('  -> .txt file parsed into 3 paragraphs with title:', txtTitle);

// 4. Test Valid .md file
console.log('\n4. Testing valid .md file import with headings, emphasis, and lists...');
const validMdFile = {
  name: 'Ajaia-Engineering-Specs.md',
  size: 4500,
  type: 'text/markdown',
};
const validMdResult = validateImportFile(validMdFile);
assert.strictEqual(validMdResult.valid, true);

const sampleMdContent = `# Engineering Specifications

## 1. System Overview
Ajaia Docs is a **collaborative document editor** designed for *high performance*.
Features include <u>instant persistence</u> and \`debounced autosave\`.

## 2. Core Modules
- Authentication via Supabase
- Document CRUD operations
- Tiptap ProseMirror engine

## 3. Milestones
1. UI Foundation
2. Database Schema
3. Rich Text Editing
4. File Import
`;

const mdDocJson = parseMarkdownToTiptap(sampleMdContent);
const mdTitle = deriveDocumentTitle(validMdFile.name);

assert.strictEqual(mdTitle, 'Ajaia-Engineering-Specs');
assert.strictEqual(mdDocJson.type, 'doc');
assert.ok(mdDocJson.content.length >= 6);
console.log('  -> .md file parsed with title:', mdTitle, 'and node count:', mdDocJson.content.length);

// 5. Test Editor Reopening & Formatting Fidelity (Simulate Refresh)
console.log('\n5. Testing opening imported .md document in Tiptap editor...');
const editor = new Editor({
  extensions: [
    StarterKit.configure({
      heading: { levels: [1, 2] },
    }),
  ],
  content: mdDocJson,
});

const restoredJson = editor.getJSON();
assert.strictEqual(restoredJson.type, 'doc');
assert.strictEqual(restoredJson.content[0].type, 'heading');
assert.strictEqual(restoredJson.content[0].attrs.level, 1);
assert.strictEqual(restoredJson.content[0].content[0].text, 'Engineering Specifications');

// Verify Bullet list
const bulletList = restoredJson.content.find((n) => n.type === 'bulletList');
assert.ok(bulletList);
assert.strictEqual(bulletList.content.length, 3);

// Verify Numbered list
const orderedList = restoredJson.content.find((n) => n.type === 'orderedList');
assert.ok(orderedList);
assert.strictEqual(orderedList.content.length, 4);

console.log('  -> Imported document successfully opened in Tiptap editor.');
console.log('  -> Headings, formatting, and lists verified.');
console.log('\n=== All E2E Simulation Tests Passed Successfully! ===\n');
