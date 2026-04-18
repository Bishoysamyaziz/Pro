'use client';

import { useState, useRef } from 'react';
import { storage, db } from '@/lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { FaFile, FaFilePdf, FaFileImage, FaFileWord, FaFileExcel,
  FaCloudUploadAlt, FaTimes, FaDownload, FaSpinner } from 'react-icons/fa';

interface FileInfo {
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedAt: string;
  uploadedBy: string;
  uploaderName: string;
}

interface Props {
  sessionId: string;
  userId: string;
  userName: string;
  existingFiles?: FileInfo[];
}

function getFileIcon(type: string) {
  if (type.includes('pdf')) return <FaFilePdf className="text-red-400 w-5 h-5" />;
  if (type.includes('image')) return <FaFileImage className="text-blue-400 w-5 h-5" />;
  if (type.includes('word') || type.includes('doc')) return <FaFileWord className="text-blue-500 w-5 h-5" />;
  if (type.includes('excel') || type.includes('sheet') || type.includes('xls')) return <FaFileExcel className="text-green-500 w-5 h-5" />;
  return <FaFile className="text-gray-400 w-5 h-5" />;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileUploader({ sessionId, userId, userName, existingFiles = [] }: Props) {
  const [files, setFiles] = useState<FileInfo[]>(existingFiles);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const ALLOWED_TYPES = ['image/', 'application/pdf', 'application/msword',
    'application/vnd.openxmlformats', 'application/vnd.ms-excel',
    'text/plain', 'application/zip'];
  const MAX_SIZE = 20 * 1024 * 1024; // 20MB

  const uploadFile = async (file: File) => {
    if (file.size > MAX_SIZE) { alert('حجم الملف يتجاوز 20MB'); return; }
    if (!ALLOWED_TYPES.some(t => file.type.startsWith(t))) { alert('نوع الملف غير مدعوم'); return; }

    setUploading(true);
    setProgress(0);

    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageRef = ref(storage, `sessions/${sessionId}/files/${timestamp}_${safeName}`);

    const task = uploadBytesResumable(storageRef, file);
    task.on('state_changed',
      snap => setProgress(Math.round(snap.bytesTransferred / snap.totalBytes * 100)),
      err => { console.error(err); setUploading(false); },
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        const fileInfo: FileInfo = {
          name: file.name, url, type: file.type,
          size: file.size, uploadedAt: new Date().toISOString(),
          uploadedBy: userId, uploaderName: userName
        };
        await updateDoc(doc(db, 'consultations', sessionId), { files: arrayUnion(fileInfo) });
        setFiles(prev => [...prev, fileInfo]);
        setUploading(false); setProgress(0);
      }
    );
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    Array.from(e.dataTransfer.files).forEach(uploadFile);
  };

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <FaCloudUploadAlt style={{ color: 'var(--color-accent)' }} />
        <span className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>الملفات المشتركة</span>
        <span className="mr-auto text-xs rounded-full px-2 py-0.5" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-2)' }}>
          {files.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className="mx-3 rounded-xl border-2 border-dashed p-4 text-center cursor-pointer transition-all"
        style={{
          borderColor: dragOver ? 'var(--color-accent)' : 'var(--color-border-2)',
          background: dragOver ? 'var(--color-accent-glow)' : 'transparent'
        }}>
        <input ref={inputRef} type="file" multiple className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.txt,.zip"
          onChange={e => Array.from(e.target.files || []).forEach(uploadFile)} />

        {uploading ? (
          <div className="space-y-2">
            <FaSpinner className="w-6 h-6 mx-auto animate-spin" style={{ color: 'var(--color-accent)' }} />
            <div className="w-full rounded-full h-2 overflow-hidden" style={{ background: 'var(--color-border)' }}>
              <div className="h-2 rounded-full transition-all" style={{ width: `${progress}%`, background: 'var(--color-accent)' }} />
            </div>
            <p className="text-sm" style={{ color: 'var(--color-text-2)' }}>{progress}%</p>
          </div>
        ) : (
          <>
            <FaCloudUploadAlt className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--color-text-3)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--color-text-2)' }}>اسحب الملفات هنا</p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-3)' }}>أو اضغط للاختيار • حد أقصى 20MB</p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-3)' }}>PDF, Word, Excel, صور</p>
          </>
        )}
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto px-3 space-y-2">
        {files.length === 0 ? (
          <p className="text-center text-sm py-4" style={{ color: 'var(--color-text-3)' }}>لا توجد ملفات مرفوعة</p>
        ) : (
          files.map((f, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl border transition-all hover:opacity-90"
              style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border)' }}>
              {getFileIcon(f.type)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>{f.name}</p>
                <p className="text-xs" style={{ color: 'var(--color-text-3)' }}>
                  {formatSize(f.size)} · {f.uploaderName}
                </p>
              </div>
              <a href={f.url} target="_blank" rel="noopener noreferrer"
                className="p-2 rounded-lg transition-all hover:opacity-80"
                style={{ color: 'var(--color-accent)' }}>
                <FaDownload className="w-4 h-4" />
              </a>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
