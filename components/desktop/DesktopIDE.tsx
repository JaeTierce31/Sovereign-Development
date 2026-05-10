"use client";
import { useState } from "react";
import Editor from "@monaco-editor/react";

export default function DesktopIDE() {
  const [activeFile, setActiveFile] = useState("index.js");

  return (
    <div className="h-full w-full flex bg-peregrine-dark">
      {/* Sidebar */}
      <div className="w-56 bg-peregrine-gray-900 border-r border-peregrine-gray-700 flex flex-col">
        <div className="p-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Explorer
        </div>
        <div className="flex-1 overflow-auto">
          {['index.js', 'package.json', 'README.md'].map((file) => (
            <button
              key={file}
              onClick={() => setActiveFile(file)}
              className={`w-full text-left px-4 py-1.5 text-sm ${
                activeFile === file
                  ? 'bg-peregrine-gray-700 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-peregrine-gray-800'
              }`}
            >
              {file}
            </button>
          ))}
        </div>
      </div>

      {/* Editor pane */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center px-4 py-2 bg-peregrine-gray-900 border-b border-peregrine-gray-700 text-sm text-gray-300">
          {activeFile}
        </div>
        <div className="flex-1">
          <Editor
            height="100%"
            defaultLanguage="javascript"
            theme="vs-dark"
            options={{
              fontSize: 14,
              minimap: { enabled: true },
              automaticLayout: true,
            }}
          />
        </div>
      </div>
    </div>
  );
}
