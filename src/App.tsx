/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  Trash2, 
  Download, 
  Sparkles, 
  Image as ImageIcon, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  X,
  Layers,
  ArrowRight
} from 'lucide-react';
import { cn } from './utils';
import { removeBackground, processImage } from './services/imageService';
import { parseInstructions, ImageFilters } from './services/geminiService';

interface ProcessedFile {
  id: string;
  file: File;
  originalUrl: string;
  processedUrl?: string;
  status: 'idle' | 'processing' | 'completed' | 'error';
  error?: string;
  filters?: ImageFilters;
}

export default function App() {
  const [files, setFiles] = useState<ProcessedFile[]>([]);
  const [instruction, setInstruction] = useState('');
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      originalUrl: URL.createObjectURL(file),
      status: 'idle' as const,
    }));
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.tiff']
    }
  } as any);

  const removeFile = (id: string) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === id);
      if (file) {
        URL.revokeObjectURL(file.originalUrl);
        if (file.processedUrl) URL.revokeObjectURL(file.processedUrl);
      }
      return prev.filter(f => f.id !== id);
    });
    if (activeId === id) setActiveId(null);
  };

  const processSingleFile = async (id: string, customInstruction?: string) => {
    const fileIndex = files.findIndex(f => f.id === id);
    if (fileIndex === -1) return;

    setFiles(prev => prev.map(f => f.id === id ? { ...f, status: 'processing', error: undefined } : f));

    try {
      const targetFile = files[fileIndex];
      const filters = await parseInstructions(customInstruction || instruction);
      
      let currentBlob: Blob | string = targetFile.file;

      if (filters.removeBackground) {
        currentBlob = await removeBackground(targetFile.file);
      }

      const processedUrl = await processImage(currentBlob, filters);
      
      setFiles(prev => prev.map(f => f.id === id ? { 
        ...f, 
        processedUrl, 
        status: 'completed',
        filters 
      } : f));
    } catch (error) {
      console.error(error);
      setFiles(prev => prev.map(f => f.id === id ? { 
        ...f, 
        status: 'error', 
        error: 'Failed to process image' 
      } : f));
    }
  };

  const processAll = async () => {
    if (files.length === 0 || isProcessingAll) return;
    setIsProcessingAll(true);
    
    for (const file of files) {
      if (file.status !== 'completed') {
        await processSingleFile(file.id);
      }
    }
    
    setIsProcessingAll(false);
  };

  const downloadFile = (file: ProcessedFile) => {
    if (!file.processedUrl) return;
    const a = document.createElement('a');
    a.href = file.processedUrl;
    a.download = `processed-${file.file.name.split('.')[0]}.png`;
    a.click();
  };

  const activeFile = files.find(f => f.id === activeId);

  return (
    <div className="h-screen bg-slate-50 flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold shadow-md shadow-indigo-500/20">H</div>
          <h1 className="text-xl font-semibold text-slate-800 tracking-tight">Hamid <span className="text-indigo-600">Background Remover</span></h1>
        </div>
        
        <div className="flex items-center gap-6">
          <nav className="flex gap-4 text-sm font-medium text-slate-500">
            <a href="#" className="text-indigo-600">Editor</a>
            <a href="#" className="hover:text-slate-800 transition-colors">Batch History</a>
            <a href="#" className="hover:text-slate-800 transition-colors">Templates</a>
          </nav>
          <div className="h-8 w-[1px] bg-slate-200"></div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-semibold text-slate-800">Hamid Mahmood</p>
              <p className="text-[10px] text-slate-500 font-medium">Free Engine Ready</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center text-slate-400 font-bold text-xs uppercase">
              HM
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* Sidebar Controls */}
        <aside className="w-72 bg-white border-r border-slate-200 p-5 flex flex-col gap-6 overflow-y-auto">
          <section>
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-4">Processing Settings</h3>
            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">Output Format</label>
                <select className="text-sm border border-slate-200 rounded-lg p-2.5 bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500/50 transition-all">
                  <option>PNG (Transparent)</option>
                  <option>WebP (Optimized)</option>
                  <option>JPG (Solid White)</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">Studio Resolution</label>
                <select className="text-sm border border-slate-200 rounded-lg p-2.5 bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500/50 transition-all">
                  <option>Original Quality</option>
                  <option>HD (1080p)</option>
                  <option>Standard (720p)</option>
                </select>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-4">Studio Preferences</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-2.5 text-sm text-slate-600 cursor-pointer group">
                <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20" /> 
                <span className="group-hover:text-slate-900 transition-colors">Auto-center objects</span>
              </label>
              <label className="flex items-center gap-2.5 text-sm text-slate-600 cursor-pointer group">
                <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20" />
                <span className="group-hover:text-slate-900 transition-colors">Smart color correction</span>
              </label>
              <label className="flex items-center gap-2.5 text-sm text-slate-600 cursor-pointer group">
                <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20" />
                <span className="group-hover:text-slate-900 transition-colors">Preserve organic shadows</span>
              </label>
            </div>
          </section>

          <div className="mt-auto pt-6 border-t border-slate-100">
            {files.length > 0 ? (
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <p className="text-xs font-bold text-indigo-900">Batch Studio Ready</p>
                </div>
                <p className="text-[11px] text-indigo-700 leading-relaxed font-medium">
                  {files.length} items ready for processing. Using neural engine v4.2.
                </p>
                <button 
                  onClick={processAll}
                  disabled={isProcessingAll}
                  className="w-full mt-3 bg-indigo-600 text-white rounded-lg py-2 text-xs font-bold hover:bg-indigo-700 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                >
                  {isProcessingAll ? 'Executing...' : 'Process Batch'}
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No Active Batch</p>
              </div>
            )}
          </div>
        </aside>

        {/* Editor View */}
        <div className="flex-1 flex flex-col relative overflow-hidden">
          <div className="flex-1 flex items-center justify-center p-12 bg-grid-slate-200 overflow-hidden">
            <div className="relative w-full max-w-4xl">
              <div className="bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-slate-200 flex flex-col items-center justify-center overflow-hidden min-h-[480px]">
                {activeFile ? (
                  <div className="w-full h-full flex flex-col items-center justify-center">
                    <div className="flex-1 w-full grid grid-cols-2">
                      {/* Original Lane */}
                      <div className="relative border-r border-dashed border-slate-200 bg-slate-50 flex items-center justify-center p-8 group">
                         <div className="absolute top-4 left-6 z-10 flex items-center gap-2">
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest bg-white/80 backdrop-blur px-2 py-0.5 rounded-full border border-slate-200">Original</span>
                         </div>
                         <img 
                          src={activeFile.originalUrl} 
                          className="max-h-full max-w-full object-contain drop-shadow-xl" 
                          alt="Original" 
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      
                      {/* Result Lane */}
                      <div className="relative bg-transparent-grid flex items-center justify-center p-8">
                        <div className="absolute top-4 right-6 z-10 flex items-center gap-2">
                            <span className="text-[10px] uppercase font-bold text-indigo-500 tracking-widest bg-white/80 backdrop-blur px-2 py-0.5 rounded-full border border-indigo-100">AI Result</span>
                            {activeFile.status === 'completed' && (
                              <button 
                                onClick={() => downloadFile(activeFile)}
                                className="p-1 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            )}
                        </div>

                        {activeFile.status === 'processing' ? (
                          <div className="flex flex-col items-center gap-4">
                            <div className="w-12 h-12 bg-white/80 backdrop-blur rounded-xl shadow-lg border border-slate-200 flex items-center justify-center">
                               <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                            </div>
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest animate-pulse">Processing...</span>
                          </div>
                        ) : activeFile.status === 'completed' && activeFile.processedUrl ? (
                          <motion.img 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            src={activeFile.processedUrl} 
                            className="max-h-full max-w-full object-contain relative z-10 drop-shadow-2xl" 
                            alt="Processed" 
                            referrerPolicy="no-referrer"
                          />
                        ) : activeFile.status === 'error' ? (
                          <div className="flex flex-col items-center gap-2 text-red-500">
                            <AlertCircle className="w-8 h-8" />
                            <p className="text-xs font-bold uppercase tracking-widest">Technical Error</p>
                            <p className="text-[10px] max-w-[200px] text-center opacity-70 leading-relaxed font-medium">{activeFile.error}</p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-4 opacity-50 grayscale">
                            <Sparkles className="w-12 h-12 text-slate-300" />
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] text-center max-w-[140px] leading-relaxed">Execute AI Studio on this subject</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-8 max-w-md text-center p-12">
                    <div className="w-24 h-24 rounded-3xl bg-slate-50 border border-slate-100 flex items-center justify-center shadow-inner group transition-all duration-700 hover:scale-110">
                      <ImageIcon className="w-10 h-10 text-slate-300 group-hover:text-indigo-400 transition-colors" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-800 tracking-tight mb-2">No Active Product</h3>
                      <p className="text-xs text-slate-500 leading-relaxed font-medium px-6">
                        Select an image from your batch queue or upload fresh assets to begin professional processing.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Instruction Barrier Overlay */}
              <div className="absolute top-6 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-20">
                <div className="bg-white rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.15)] border border-slate-200/60 p-1.5 flex items-center gap-2 backdrop-blur-xl">
                  <div className="pl-4">
                    <Sparkles className="w-4 h-4 text-indigo-500" />
                  </div>
                  <input 
                    type="text" 
                    value={instruction}
                    onChange={(e) => setInstruction(e.target.value)}
                    placeholder="e.g. 'Remove background and fix lighting on the metal edge'..." 
                    className="flex-1 px-2 py-3 text-sm bg-transparent outline-none font-medium placeholder:text-slate-400"
                    onKeyDown={(e) => e.key === 'Enter' && activeId && processSingleFile(activeId)}
                  />
                  <button 
                    disabled={!activeId || !instruction || isProcessingAll}
                    onClick={() => activeId && processSingleFile(activeId)}
                    className="bg-indigo-600 text-white px-8 py-3 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 active:scale-95 disabled:opacity-30 disabled:shadow-none"
                  >
                    Execute
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Batch Queue Tray */}
          <div className="h-44 bg-white border-t border-slate-200 flex flex-col z-10">
            <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-50 bg-slate-50/30">
              <div className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Session Queue ({files.length} Files)</h4>
              </div>
              {files.length > 0 && (
                <button 
                  onClick={() => setFiles([])}
                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors uppercase tracking-widest"
                >
                  Terminate Batch
                </button>
              )}
            </div>
            
            <div className="flex-1 flex items-center gap-5 px-6 overflow-x-auto overflow-y-hidden custom-scrollbar py-4">
              <AnimatePresence mode="popLayout">
                {files.map((f) => (
                  <motion.div
                    key={f.id}
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={() => setActiveId(f.id)}
                    className={cn(
                      "w-28 h-28 bg-white rounded-xl border shrink-0 flex flex-col overflow-hidden cursor-pointer transition-all active:scale-95 relative",
                      activeId === f.id 
                        ? "border-indigo-500 shadow-xl shadow-indigo-500/10 ring-2 ring-indigo-500/5 translate-y-[-4px]" 
                        : "border-slate-200 hover:border-slate-300 shadow-sm"
                    )}
                  >
                    <div className="flex-1 bg-slate-50/50 flex items-center justify-center relative group">
                      <img src={f.originalUrl} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                      {f.status === 'processing' && (
                        <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center">
                          <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                        </div>
                      )}
                      {f.status === 'completed' && (
                        <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                        </div>
                      )}
                      
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeFile(f.id); }}
                        className="absolute bottom-1 right-1 p-1 bg-white/90 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 rounded-md transition-all shadow-sm border border-slate-100"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="h-7 px-2 font-medium bg-white flex items-center justify-between overflow-hidden">
                       <span className="text-[10px] text-slate-600 truncate">{f.file.name}</span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              <div 
                {...getRootProps()}
                className="w-28 h-28 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-1.5 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all group shrink-0 cursor-pointer"
              >
                <input {...getInputProps()} />
                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                  <Upload className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600" />
                </div>
                <span className="text-[10px] font-bold text-slate-400 group-hover:text-indigo-500 uppercase tracking-widest">Add Assets</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Status Bar */}
      <footer className="h-8 bg-white border-t border-slate-200 flex items-center justify-between px-6 shrink-0 z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
            <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Engine Online: v4.2-Neural</span>
          </div>
          <span className="text-[10px] text-slate-300">|</span>
          <span className="text-[10px] text-slate-500 font-medium tracking-tight">Avg Process Time: 1.4s</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Session Usage</span>
            <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: files.length > 0 ? '65%' : '0%' }}
                className="h-full bg-indigo-500"
              />
            </div>
          </div>
        </div>
      </footer>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 4px;
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </div>
  );
}
