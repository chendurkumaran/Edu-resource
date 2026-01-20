import React from "react";

interface MarkdownEditorProps {
  markdown: string;
  onMarkdownChange: (value: string) => void;
}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ markdown, onMarkdownChange }) => {
  return (
    <div className="w-1/2 p-2 flex flex-col">
      <h4 className="text-neutral-700 font-semibold mb-2">Editor</h4>
      <textarea
        className="w-full flex-1 border border-gray-300 p-4 rounded shadow focus:outline-none resize-none focus:ring-2 focus:ring-neutral-700"
        value={markdown}
        onChange={(e) => onMarkdownChange(e.target.value)}
        placeholder="Write your markdown here..."
      />
    </div>
  );
};

export default MarkdownEditor;
