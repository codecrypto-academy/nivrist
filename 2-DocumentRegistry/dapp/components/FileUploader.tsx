"use client";

import { useCallback, useRef, useState } from "react";
import { UploadCloud, FileText } from "lucide-react";
import { hashFile } from "@/hooks/useContract";

interface FileUploaderProps {
  onHash: (hash: string, file: File) => void;
  label?: string;
}

export default function FileUploader({ onHash, label = "Select or drop a file" }: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [hash, setHash] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const process = useCallback(
    async (file: File) => {
      setFileName(file.name);
      const h = await hashFile(file);
      setHash(h);
      onHash(h, file);
    },
    [onHash]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) void process(file);
    },
    [process]
  );

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition ${
          dragging ? "border-indigo-500 bg-indigo-50" : "border-slate-300 hover:border-indigo-400"
        }`}
      >
        <UploadCloud className="h-8 w-8 text-indigo-500" />
        <p className="text-sm font-medium text-slate-700">{label}</p>
        <p className="text-xs text-slate-400">Any file — its bytes are hashed locally, never uploaded</p>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void process(file);
          }}
        />
      </div>

      {fileName && (
        <div className="mt-4 rounded-lg bg-slate-50 p-3">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <FileText className="h-4 w-4" /> {fileName}
          </div>
          {hash && (
            <p className="mono mt-1 text-slate-500">
              keccak256: <span className="text-indigo-600">{hash}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
