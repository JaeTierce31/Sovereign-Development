"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import MobileEditor from "./MobileEditor";
import MobileTerminal from "./MobileTerminal";
import MobileActionBar from "./MobileActionBar";
import MobileAiSheet from "./MobileAiSheet";

export default function EditorDeck({ projectId }: { projectId: string }) {
  const [activePane, setActivePane] = useState<"editor" | "terminal">("editor");
  const [aiOpen, setAiOpen] = useState(false);
  const [activeFileContent, setActiveFileContent] = useState("");
  const [activeFileLang, setActiveFileLang] = useState("plaintext");
  const [activeFilePath, setActiveFilePath] = useState<string | undefined>(undefined);

  const handleDragEnd = (_: unknown, info: { offset: { y: number } }) => {
    if (info.offset.y > 50 && activePane === "editor") setActivePane("terminal");
    else if (info.offset.y < -50 && activePane === "terminal") setActivePane("editor");
  };

  return (
    <div className="h-full w-full relative overflow-hidden">
      <AnimatePresence mode="wait">
        {activePane === "editor" && (
          <motion.div
            key="editor"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "-100%" }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            onDragEnd={handleDragEnd}
            className="absolute inset-0"
          >
            <MobileEditor
              projectId={projectId}
              onFileChange={(content, lang) => {
                setActiveFileContent(content);
                setActiveFileLang(lang);
              }}
              onActiveFileChange={setActiveFilePath}
            />
          </motion.div>
        )}
        {activePane === "terminal" && (
          <motion.div
            key="terminal"
            initial={{ y: "-100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            onDragEnd={handleDragEnd}
            className="absolute inset-0 z-10 bg-gray-950"
          >
            <MobileTerminal projectId={projectId} activeFilePath={activeFilePath} />
          </motion.div>
        )}
      </AnimatePresence>
      <MobileActionBar
        activePane={activePane}
        onPaneChange={setActivePane}
        onAiOpen={() => setAiOpen(true)}
      />
      {aiOpen && (
        <MobileAiSheet
          fileContent={activeFileContent}
          language={activeFileLang}
          onClose={() => setAiOpen(false)}
        />
      )}
    </div>
  );
}
