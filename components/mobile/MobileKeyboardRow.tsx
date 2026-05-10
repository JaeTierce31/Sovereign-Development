"use client";
export default function MobileKeyboardRow({ editorRef }: { editorRef: any }) {
  const insertText = (text: string) => {
    if (!editorRef.current) return;
    const editor = editorRef.current;
    editor.executeEdits("keyboard", [{
      range: editor.getSelection(),
      text,
      forceMoveMarkers: true,
    }]);
    editor.focus();
  };

  return (
    <div className="flex items-center gap-2 px-2 py-1 bg-peregrine-gray border-t border-peregrine-gray/70 overflow-x-auto">
      <button onClick={() => insertText('{')} className="text-white text-sm px-2 py-1 bg-gray-700 rounded">{'{'}</button>
      <button onClick={() => insertText('}')} className="text-white text-sm px-2 py-1 bg-gray-700 rounded">{'}'}</button>
      <button onClick={() => insertText('(')} className="text-white text-sm px-2 py-1 bg-gray-700 rounded">{'('}</button>
      <button onClick={() => insertText(')')} className="text-white text-sm px-2 py-1 bg-gray-700 rounded">{')'}</button>
      <button onClick={() => insertText(';')} className="text-white text-sm px-2 py-1 bg-gray-700 rounded">{';'}</button>
      <button onClick={() => insertText('\t')} className="text-white text-sm px-2 py-1 bg-gray-700 rounded">Tab</button>
      <button onClick={() => insertText('\n')} className="text-white text-sm px-2 py-1 bg-gray-700 rounded">↵</button>
      <button onClick={() => {/* AI trigger */}} className="ml-auto bg-peregrine-orange text-white text-sm px-3 py-1 rounded-full">
        ✨ AI
      </button>
    </div>
  );
}
