"use client";

type MonacoEditor = {
  executeEdits: (source: string, edits: unknown[]) => void;
  getSelection: () => unknown;
  focus: () => void;
  trigger: (source: string, handlerId: string, payload: unknown) => void;
  getModel: () => { getLineCount: () => number } | null;
  getPosition: () => { lineNumber: number; column: number } | null;
  setPosition: (pos: { lineNumber: number; column: number }) => void;
  revealPosition: (pos: { lineNumber: number; column: number }) => void;
};

export default function MobileKeyboardRow({ editorRef }: { editorRef: { current: unknown } }) {
  const editor = () => editorRef.current as MonacoEditor | null;

  const insertText = (text: string) => {
    const ed = editor();
    if (!ed) return;
    ed.executeEdits("keyboard", [{ range: ed.getSelection(), text, forceMoveMarkers: true }]);
    ed.focus();
  };

  const trigger = (handlerId: string) => {
    const ed = editor();
    if (!ed) return;
    ed.trigger("keyboard", handlerId, null);
    ed.focus();
  };

  const moveCursor = (delta: number) => {
    const ed = editor();
    if (!ed) return;
    const pos = ed.getPosition();
    if (!pos) return;
    const model = ed.getModel();
    if (!model) return;
    const totalLines = model.getLineCount();
    const newLine = Math.max(1, Math.min(totalLines, pos.lineNumber + delta));
    ed.setPosition({ lineNumber: newLine, column: pos.column });
    ed.revealPosition({ lineNumber: newLine, column: pos.column });
    ed.focus();
  };

  const GROUP = "mx-0.5 h-px w-px bg-gray-600 shrink-0";
  const BTN = "text-white text-sm px-2 py-1 bg-gray-700 active:bg-gray-600 rounded shrink-0 select-none";
  const BTN_ACTION = "text-white text-xs px-2 py-1 bg-gray-800 active:bg-gray-600 rounded shrink-0 select-none";

  return (
    <div className="flex items-center gap-1 px-2 py-1 bg-gray-900 border-t border-gray-700 overflow-x-auto scrollbar-none" style={{ minHeight: "40px" }}>
      {/* Undo / Redo */}
      <button onClick={() => trigger("undo")} className={BTN_ACTION} title="Undo">↩</button>
      <button onClick={() => trigger("redo")} className={BTN_ACTION} title="Redo">↪</button>
      <div className={GROUP} />

      {/* Cursor movement */}
      <button onClick={() => moveCursor(-1)} className={BTN_ACTION} title="Line up">↑</button>
      <button onClick={() => moveCursor(1)} className={BTN_ACTION} title="Line down">↓</button>
      <button onClick={() => trigger("cursorWordLeft")} className={BTN_ACTION} title="Word left">⇤</button>
      <button onClick={() => trigger("cursorWordRight")} className={BTN_ACTION} title="Word right">⇥</button>
      <div className={GROUP} />

      {/* Common symbols */}
      <button onClick={() => insertText("{")} className={BTN}>{"{"}</button>
      <button onClick={() => insertText("}")} className={BTN}>{"}"}</button>
      <button onClick={() => insertText("(")} className={BTN}>{"("}</button>
      <button onClick={() => insertText(")")} className={BTN}>{")"}</button>
      <button onClick={() => insertText("[")} className={BTN}>{"["}</button>
      <button onClick={() => insertText("]")} className={BTN}>{"]"}</button>
      <div className={GROUP} />

      <button onClick={() => insertText(";")} className={BTN}>{";"}</button>
      <button onClick={() => insertText(":")} className={BTN}>{":"}</button>
      <button onClick={() => insertText("=")} className={BTN}>{"="}</button>
      <button onClick={() => insertText("=>")} className={BTN}>{"=>"}</button>
      <button onClick={() => insertText("!")} className={BTN}>{"!"}</button>
      <button onClick={() => insertText(".")} className={BTN}>{"."}</button>
      <button onClick={() => insertText("...")} className={BTN}>{"..."}</button>
      <div className={GROUP} />

      {/* Quotes */}
      <button onClick={() => insertText("'")} className={BTN}>{`'`}</button>
      <button onClick={() => insertText('"')} className={BTN}>{'"'}</button>
      <button onClick={() => insertText("`")} className={BTN}>{"`"}</button>
      <div className={GROUP} />

      {/* Whitespace */}
      <button onClick={() => insertText("\t")} className={BTN_ACTION}>Tab</button>
      <button onClick={() => insertText("\n")} className={BTN_ACTION}>↵</button>
    </div>
  );
}
