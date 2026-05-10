"use client";
import Editor from "@monaco-editor/react";
import { useRef } from "react";
import MobileKeyboardRow from "./MobileKeyboardRow";

export default function MobileEditor({ projectId }: { projectId: string }) {
  const editorRef = useRef<any>(null);

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1">
        <Editor
          height="100%"
          defaultLanguage="javascript"
          theme="vs-dark"
          onMount={(editor) => (editorRef.current = editor)}
          options={{
            fontSize: 16,
            lineNumbers: "off",
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
          }}
        />
      </div>
      <MobileKeyboardRow editorRef={editorRef} />
    </div>
  );
}
