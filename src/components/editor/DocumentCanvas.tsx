import React from 'react';
import { Editor, EditorContent } from '@tiptap/react';

interface DocumentCanvasProps {
  editor: Editor | null;
}

export const DocumentCanvas: React.FC<DocumentCanvasProps> = ({ editor }) => {
  return (
    <div
      className="flex-1 bg-slate-100/70 overflow-y-auto px-4 py-8 sm:py-12 flex justify-center cursor-text"
      onClick={() => {
        if (editor && !editor.isFocused) {
          editor.commands.focus('end');
        }
      }}
    >
      <div
        className="w-full max-w-[850px] min-h-[900px] bg-white rounded-lg shadow-md hover:shadow-lg border border-slate-200/80 px-8 py-10 sm:px-16 sm:py-16 transition-shadow duration-200 relative flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle decorative page header guide line */}
        <div className="absolute top-4 left-8 right-8 flex justify-between items-center text-[11px] text-slate-300 select-none pointer-events-none">
          <span>Ajaia Document Canvas</span>
          <span>100%</span>
        </div>

        {/* Tiptap rich text container */}
        <div className="pt-2 flex-1">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
};
