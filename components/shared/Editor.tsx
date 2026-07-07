"use client";
import MonacoEditor from "@monaco-editor/react";

interface EditorProps {
  value?: string;
  language?: string;
  onChange?: (value: string | undefined) => void;
  readOnly?: boolean;
}

export default function Editor({ value, language = "javascript", onChange, readOnly }: EditorProps) {
  return (
    <MonacoEditor
      height="100%"
      language={language}
      value={value}
      theme="vs-dark"
      onChange={onChange}
      options={{
        fontSize: 14,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        readOnly,
      }}
    />
  );
}
