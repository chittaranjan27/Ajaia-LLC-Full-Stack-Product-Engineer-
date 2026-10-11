import React from 'react';
import { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Quote,
  Code,
  Undo2,
  Redo2,
  RemoveFormatting,
  Eye,
} from 'lucide-react';

interface EditorToolbarProps {
  editor: Editor | null;
  isReadOnly?: boolean;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({ editor, isReadOnly = false }) => {
  if (!editor) {
    return (
      <div className="h-11 bg-white border-b border-slate-200 animate-pulse flex items-center px-4" />
    );
  }

  const isEditable = !isReadOnly && editor.isEditable;

  const currentHeading = editor.isActive('heading', { level: 1 })
    ? 'h1'
    : editor.isActive('heading', { level: 2 })
    ? 'h2'
    : 'p';

  const handleHeadingSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!isEditable) return;
    const val = e.target.value;
    if (val === 'p') {
      editor.chain().focus().setParagraph().run();
    } else if (val === 'h1') {
      editor.chain().focus().toggleHeading({ level: 1 }).run();
    } else if (val === 'h2') {
      editor.chain().focus().toggleHeading({ level: 2 }).run();
    }
  };

  const toolBtnClass = (isActive: boolean, isDisabled: boolean = !isEditable) =>
    `p-2 rounded-lg transition-all duration-150 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${
      isDisabled
        ? 'opacity-40 cursor-not-allowed text-slate-400 hover:bg-transparent'
        : isActive
        ? 'bg-blue-100 text-blue-700 font-semibold shadow-2xs ring-1 ring-blue-500/20'
        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200'
    }`;

  return (
    <div
      role="toolbar"
      aria-label="Document text formatting toolbar"
      className="sticky top-[53px] z-20 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-3 sm:px-6 py-1.5 shadow-2xs overflow-x-auto flex items-center justify-between gap-2"
    >
      <div className="flex items-center gap-1 sm:gap-1.5">
        {/* Undo / Redo */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!isEditable || !editor.can().undo()}
            title="Undo (Ctrl+Z)"
            aria-label="Undo"
            className={toolBtnClass(false, !isEditable || !editor.can().undo())}
          >
            <Undo2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!isEditable || !editor.can().redo()}
            title="Redo (Ctrl+Y or Ctrl+Shift+Z)"
            aria-label="Redo"
            className={toolBtnClass(false, !isEditable || !editor.can().redo())}
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        <div className="h-5 w-px bg-slate-200 mx-1 shrink-0" />

        {/* Heading Style Dropdown */}
        <div className="shrink-0">
          <select
            value={currentHeading}
            onChange={handleHeadingSelect}
            disabled={!isEditable}
            aria-label="Text style"
            className={`text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
              !isEditable ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-100 cursor-pointer'
            }`}
          >
            <option value="p">Normal text</option>
            <option value="h1">Heading 1</option>
            <option value="h2">Heading 2</option>
          </select>
        </div>

        {/* Quick Heading 1 & 2 Buttons */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            disabled={!isEditable}
            title="Heading 1 (Ctrl+Alt+1)"
            aria-label="Heading 1"
            aria-pressed={editor.isActive('heading', { level: 1 })}
            className={toolBtnClass(editor.isActive('heading', { level: 1 }))}
          >
            <Heading1 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            disabled={!isEditable}
            title="Heading 2 (Ctrl+Alt+2)"
            aria-label="Heading 2"
            aria-pressed={editor.isActive('heading', { level: 2 })}
            className={toolBtnClass(editor.isActive('heading', { level: 2 }))}
          >
            <Heading2 className="w-4 h-4" />
          </button>
        </div>

        <div className="h-5 w-px bg-slate-200 mx-1 shrink-0" />

        {/* Basic Inline Formatting: Bold, Italic, Underline */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            disabled={!isEditable}
            title="Bold (Ctrl+B)"
            aria-label="Bold text"
            aria-pressed={editor.isActive('bold')}
            className={toolBtnClass(editor.isActive('bold'))}
          >
            <Bold className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            disabled={!isEditable}
            title="Italic (Ctrl+I)"
            aria-label="Italic text"
            aria-pressed={editor.isActive('italic')}
            className={toolBtnClass(editor.isActive('italic'))}
          >
            <Italic className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            disabled={!isEditable}
            title="Underline (Ctrl+U)"
            aria-label="Underline text"
            aria-pressed={editor.isActive('underline')}
            className={toolBtnClass(editor.isActive('underline'))}
          >
            <UnderlineIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="h-5 w-px bg-slate-200 mx-1 shrink-0" />

        {/* Lists: Bullet List and Numbered List */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            disabled={!isEditable}
            title="Bullet list (Ctrl+Shift+8)"
            aria-label="Bullet list"
            aria-pressed={editor.isActive('bulletList')}
            className={toolBtnClass(editor.isActive('bulletList'))}
          >
            <List className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            disabled={!isEditable}
            title="Numbered list (Ctrl+Shift+7)"
            aria-label="Numbered list"
            aria-pressed={editor.isActive('orderedList')}
            className={toolBtnClass(editor.isActive('orderedList'))}
          >
            <ListOrdered className="w-4 h-4" />
          </button>
        </div>

        <div className="h-5 w-px bg-slate-200 mx-1 shrink-0" />

        {/* Extras: Blockquote, Code block, Clear formatting */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            disabled={!isEditable}
            title="Blockquote"
            aria-label="Quote block"
            aria-pressed={editor.isActive('blockquote')}
            className={toolBtnClass(editor.isActive('blockquote'))}
          >
            <Quote className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            disabled={!isEditable}
            title="Code block"
            aria-label="Code block"
            aria-pressed={editor.isActive('codeBlock')}
            className={toolBtnClass(editor.isActive('codeBlock'))}
          >
            <Code className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
            disabled={!isEditable}
            title="Clear formatting"
            aria-label="Clear formatting"
            className={toolBtnClass(false, !isEditable)}
          >
            <RemoveFormatting className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Read-only indicator pill */}
      {isReadOnly && (
        <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 rounded-full">
          <Eye className="w-3.5 h-3.5 text-amber-600" />
          <span>View only</span>
        </div>
      )}
    </div>
  );
};
