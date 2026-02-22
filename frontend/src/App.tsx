import React, { useState, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { useIdeStore } from './store/useIdeStore';
import { Play, Code, CheckCircle, AlertTriangle, FileCode2, Terminal as TerminalIcon, Sparkles, Brain, Send, Check, Undo2 } from 'lucide-react';
import axios from 'axios';

function App() {
  const { files, activeFile, setActiveFile, updateFile, addFile, removeFile } = useIdeStore();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const [isRunning, setIsRunning] = useState(false);
  const [runResult, setRunResult] = useState<any>(null);

  const [sidebarMode, setSidebarMode] = useState<'explorer' | 'chat'>('explorer');
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'agent', text: string, code?: string, action?: string, targetFile?: string, isApplied?: boolean, previousCode?: string }[]>([]);
  const [isChatting, setIsChatting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const res = await axios.post('http://localhost:8000/api/v1/projects/analyze', { files });
      setAnalysisResult(res.data);
    } catch (error) {
      console.error(error);
      setAnalysisResult({ error: 'Failed to analyze code.' });
    }
    setIsAnalyzing(false);
  };

  const handleRun = async () => {
    setIsRunning(true);
    setRunResult({ stdout: 'Running in sandbox...', stderr: '' });
    try {
      const command = `python ${activeFile}`;
      const res = await axios.post('http://localhost:8000/api/v1/sandbox/run', { files, test_command: command });
      setRunResult(res.data);
    } catch (error) {
      console.error(error);
      setRunResult({ stdout: '', stderr: 'Failed to connect to Sandbox.', error: true });
    }
    setIsRunning(false);
  };

  const handleSendChat = async () => {
    if (!chatInput.trim()) return;
    const msg = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: msg }]);
    setIsChatting(true);
    setSidebarMode('chat');

    try {
      const res = await axios.post('http://localhost:8000/api/v1/agents/chat', {
        user_message: msg,
        current_file_content: activeFile ? files[activeFile] || '' : '',
        current_file_path: activeFile || '',
        full_project_tree: files,
        selected_code: ''
      });

      const { action, target_file, code, explanation } = res.data;
      setChatMessages(prev => [...prev, {
        role: 'agent',
        text: explanation || 'Action completed.',
        code: code,
        action: action,
        targetFile: target_file
      }]);

    } catch (error) {
      console.error(error);
      setChatMessages(prev => [...prev, { role: 'agent', text: 'I encountered an error communicating with the agent server.' }]);
    }
    setIsChatting(false);
  };

  const handleApplyAction = (index: number, action: string, targetFile: string, code: string) => {
    const currentCode = files[targetFile];

    setChatMessages(prev => prev.map((msg, i) => {
      if (i === index) {
        return { ...msg, isApplied: true, previousCode: currentCode };
      }
      return msg;
    }));

    if (action === 'create_file') {
      addFile(targetFile, code);
      setActiveFile(targetFile);
    } else if (action === 'modify_file' || action === 'insert_code') {
      if (!files[targetFile]) {
        addFile(targetFile, code);
      } else {
        updateFile(targetFile, code);
      }
      setActiveFile(targetFile);
    }
  };

  const handleUndoAction = (index: number, targetFile: string) => {
    const msg = chatMessages[index];
    if (msg.previousCode !== undefined) {
      updateFile(targetFile, msg.previousCode);
    } else {
      removeFile(targetFile);
    }
    setChatMessages(prev => prev.map((m, i) => i === index ? { ...m, isApplied: false } : m));
  };

  return (
    <div className="flex flex-col h-screen w-full text-slate-100 overflow-hidden font-sans relative" style={{ backgroundColor: '#070210' }}>

      {/* Background Glow Effects (Matching the aesthetic) */}
      <div className="absolute top-0 inset-x-0 h-96 bg-fuchsia-900/10 blur-[120px] rounded-full pointer-events-none -translate-y-1/2"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-purple-900/10 blur-[150px] rounded-full pointer-events-none"></div>

      {/* Top Navbar */}
      <div className="flex h-16 border-b border-fuchsia-900/30 items-center justify-between px-6 bg-[#0B0616]/70 backdrop-blur-md relative z-10">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-fuchsia-500 to-purple-700 flex items-center justify-center shadow-[0_0_15px_rgba(192,132,252,0.4)]">
            <Code className="text-white w-4 h-4" />
          </div>
          <span className="font-bold tracking-tight text-white flex items-center gap-3 text-lg">
            AI Code Mentor
            <span className="bg-fuchsia-500/10 text-fuchsia-300 border border-fuchsia-500/20 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-[inset_0_0_10px_rgba(217,70,239,0.1)]">
              Educational Edition
            </span>
          </span>
        </div>
        <div className="flex space-x-4">
          <button
            onClick={handleRun}
            disabled={isRunning}
            className="group relative flex items-center space-x-2 px-6 py-2 bg-gradient-to-br from-[#1B0F33] to-[#120A22] border border-purple-500/30 hover:border-fuchsia-400 hover:shadow-[0_0_20px_rgba(192,132,252,0.3)] rounded-full transition-all disabled:opacity-50 text-sm font-semibold active:scale-95 text-purple-200 hover:text-white overflow-hidden"
          >
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-fuchsia-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <Play size={15} />
            <span>{isRunning ? 'Running...' : 'Run Code'}</span>
          </button>

          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="group relative flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500  hover:shadow-[0_0_25px_rgba(217,70,239,0.5)] rounded-full transition-all disabled:opacity-50 text-sm font-bold active:scale-95 border border-white/10"
          >
            <Sparkles size={15} />
            <span>{isAnalyzing ? 'Analyzing AST...' : 'Optimize Details'}</span>
          </button>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden relative z-10 m-4 gap-4">

        {/* Left Sidebar (Action Bar + Panel) */}
        <div className="flex gap-4">
          {/* Narrow Action Bar */}
          <div className="w-14 flex flex-col items-center py-4 rounded-2xl border border-fuchsia-900/30 bg-[#0F0822]/80 backdrop-blur shadow-[0_8px_32px_rgba(0,0,0,0.5)] space-y-4">
            <button
              onClick={() => setSidebarMode('explorer')}
              className={`p-2.5 rounded-xl transition-all ${sidebarMode === 'explorer' ? 'bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/40 shadow-[0_0_15px_rgba(217,70,239,0.3)]' : 'text-slate-500 hover:text-fuchsia-300 hover:bg-white/5'}`}>
              <FileCode2 size={20} />
            </button>
            <button
              onClick={() => setSidebarMode('chat')}
              className={`p-2.5 rounded-xl transition-all ${sidebarMode === 'chat' ? 'bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/40 shadow-[0_0_15px_rgba(217,70,239,0.3)]' : 'text-slate-500 hover:text-fuchsia-300 hover:bg-white/5'}`}>
              <Brain size={20} />
            </button>
          </div>

          {/* Sidebar Content Panel */}
          <div className="w-72 flex flex-col rounded-2xl border border-fuchsia-900/30 bg-[#0F0822]/80 backdrop-blur shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden">
            {sidebarMode === 'explorer' ? (
              <>
                <div className="text-[10px] font-bold text-fuchsia-400/70 uppercase tracking-[0.2em] p-5 pb-3 border-b border-fuchsia-900/30 bg-[#160B31]/50 flex justify-between">
                  <span>Explorer</span>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-1">
                  {Object.keys(files).map((file) => (
                    <div
                      key={file}
                      onClick={() => setActiveFile(file)}
                      className={`flex items-center space-x-3 px-3 py-2.5 cursor-pointer rounded-xl transition-all ${activeFile === file ? 'bg-fuchsia-500/15 text-fuchsia-200 border border-fuchsia-500/30 shadow-[0_0_15px_rgba(192,132,252,0.15)]' : 'hover:bg-white/5 text-slate-400 hover:text-slate-200 border border-transparent'}`}
                    >
                      <FileCode2 size={16} className={activeFile === file ? 'text-fuchsia-400' : 'text-slate-600'} />
                      <span className="text-sm font-medium">{file}</span>
                    </div>
                  ))}
                </div>
                {/* Quick Stats Widget */}
                <div className="p-5 border-t border-fuchsia-900/30 bg-gradient-to-b from-transparent to-fuchsia-900/10">
                  <div className="text-[10px] text-fuchsia-400/70 uppercase tracking-[0.2em] font-bold mb-3">Growth Tracker</div>
                  <div className="flex items-center justify-between text-sm bg-[#0A0516] p-4 rounded-xl border border-fuchsia-900/40 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-fuchsia-600/20 blur-2xl"></div>
                    <span className="text-slate-300 font-medium z-10">Avg Score</span>
                    <span className="text-fuchsia-300 font-bold z-10">82/100</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col h-full relative">
                <div className="text-[10px] font-bold text-fuchsia-400/70 uppercase tracking-[0.2em] p-5 pb-3 border-b border-fuchsia-900/30 bg-[#160B31]/50 flex items-center gap-2">
                  <Sparkles size={12} className="text-fuchsia-500" />
                  <span>AI Agent Chat</span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {chatMessages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-3 opacity-60">
                      <Brain size={32} className="text-fuchsia-400" />
                      <p className="text-sm text-slate-400">Ask me to generate code, refactor lines, or explain logic across the workspace.</p>
                    </div>
                  )}

                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className={`p-3 rounded-2xl max-w-[90%] text-sm leading-relaxed ${msg.role === 'user'
                        ? 'bg-fuchsia-600 text-white rounded-tr-sm shadow-[0_0_15px_rgba(217,70,239,0.3)]'
                        : 'bg-[#160B31] text-slate-200 border border-fuchsia-900/40 rounded-tl-sm'
                        }`}>
                        {msg.text}
                      </div>

                      {msg.code && msg.role === 'agent' && (
                        <div className="mt-2 w-full max-w-[95%] bg-[#0A0516] border border-fuchsia-900/50 rounded-xl overflow-hidden shadow-lg">
                          <div className="flex items-center justify-between px-3 py-1.5 bg-[#160B31] border-b border-fuchsia-900/30">
                            <span className="text-[10px] text-fuchsia-400 uppercase tracking-widest font-bold">{msg.action} • {msg.targetFile}</span>
                          </div>
                          <div className="p-3 overflow-x-auto">
                            <pre className="text-xs font-mono text-fuchsia-100">{msg.code}</pre>
                          </div>
                          <div className="p-2 border-t border-fuchsia-900/30 bg-[#0F0822] flex justify-end gap-2">
                            {msg.isApplied ? (
                              <button
                                onClick={() => handleUndoAction(i, msg.targetFile!)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-lg transition-colors border border-slate-600"
                              >
                                <Undo2 size={12} /> Undo
                              </button>
                            ) : (
                              <button
                                onClick={() => handleApplyAction(i, msg.action!, msg.targetFile!, msg.code!)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-xs font-bold rounded-lg transition-colors shadow-[0_0_10px_rgba(217,70,239,0.4)]"
                              >
                                <Check size={12} /> Apply Changes
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {isChatting && (
                    <div className="flex items-start">
                      <div className="p-3 rounded-2xl bg-[#160B31] border border-fuchsia-900/40 rounded-tl-sm text-fuchsia-400 text-sm flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-fuchsia-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-1.5 h-1.5 bg-fuchsia-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-1.5 h-1.5 bg-fuchsia-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="p-3 border-t border-fuchsia-900/30 bg-[#0F0822]">
                  <div className="relative">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                      placeholder="Ask anything..."
                      className="w-full bg-[#160B31] border border-fuchsia-900/50 text-white text-sm rounded-xl py-2.5 pl-4 pr-10 focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500/50 transition-all placeholder:text-slate-600"
                    />
                    <button
                      onClick={handleSendChat}
                      disabled={!chatInput.trim() || isChatting}
                      className="absolute right-1.5 top-1.5 p-1.5 bg-fuchsia-600 text-white rounded-lg hover:bg-fuchsia-500 transition-colors disabled:opacity-50 disabled:bg-slate-700"
                    >
                      <Send size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center Canvas (Editor + Terminal) */}
        <div className="flex flex-col flex-1 gap-4">

          {/* Monaco Editor Container */}
          <div className="flex-1 rounded-2xl border border-fuchsia-900/30 bg-[#0F0822]/80 backdrop-blur shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col relative group">
            {/* Subtle editor background glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>

            {/* Tab */}
            <div className="flex h-12 bg-[#160B31]/50 border-b border-fuchsia-900/30">
              <div className="px-6 py-0 border-r border-fuchsia-900/30 bg-[#0F0822] border-t-[3px] border-t-fuchsia-500 text-sm text-fuchsia-100 flex items-center space-x-2 relative shadow-lg">
                <div className="absolute inset-0 bg-gradient-to-b from-fuchsia-500/10 to-transparent pointer-events-none"></div>
                <FileCode2 size={15} className="text-fuchsia-400" />
                <span className="font-medium tracking-wide">{activeFile}</span>
              </div>
            </div>

            <div className="flex-1 w-full bg-[#0a0515]/50 relative pt-2">
              {activeFile && (
                <Editor
                  height="100%"
                  language={activeFile.endsWith('.py') ? 'python' : 'javascript'}
                  theme="vs-dark" // We will override standard monaco colors if needed, but vs-dark is readable
                  value={files[activeFile]}
                  onChange={(val) => updateFile(activeFile, val || '')}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineHeight: 1.6,
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    padding: { top: 16 },
                    scrollBeyondLastLine: false,
                    smoothScrolling: true,
                    cursorBlinking: "smooth",
                    cursorSmoothCaretAnimation: "on",
                  }}
                />
              )}
            </div>
          </div>

          {/* Bottom Terminal Panel */}
          <div className="h-56 rounded-2xl border border-fuchsia-900/30 bg-[#0F0822]/80 backdrop-blur shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col relative">
            <div className="absolute top-0 right-0 w-48 h-1/2 bg-blue-600/10 blur-3xl pointer-events-none"></div>
            <div className="flex items-center px-5 py-3 border-b border-fuchsia-900/30 bg-[#160B31]/50 text-[10px] text-fuchsia-400/70 uppercase font-bold tracking-[0.2em]">
              <TerminalIcon size={14} className="mr-2.5 text-fuchsia-500" /> Output Terminal
            </div>
            <div className="flex-1 p-5 font-mono text-sm overflow-y-auto text-slate-300 leading-relaxed bg-[#0a0515]/50">
              {runResult && (
                <div className="animate-in fade-in duration-300">
                  {runResult.stdout && <pre className="text-[#a78bfa] whitespace-pre-wrap">{runResult.stdout}</pre>}
                  {runResult.stderr && <pre className="text-pink-400 whitespace-pre-wrap mt-2">{runResult.stderr}</pre>}
                </div>
              )}
              {!runResult && <div className="flex h-full items-center justify-center"><span className="text-fuchsia-900/40 italic flex items-center gap-2"><Sparkles size={16} /> Waiting for execution...</span></div>}
            </div>
          </div>
        </div>

        {/* Right Panel (AI Analysis) */}
        <div className="w-[380px] rounded-2xl border border-fuchsia-900/30 bg-[#0F0822]/80 backdrop-blur shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex flex-col overflow-y-auto relative hidden xl:flex">
          <div className="h-16 flex items-center px-6 border-b border-fuchsia-900/30 bg-[#160B31]/50 sticky top-0 z-20 font-bold text-base text-fuchsia-100 uppercase tracking-widest gap-3">
            <div className="w-8 h-8 rounded-full bg-fuchsia-500/10 flex items-center justify-center border border-fuchsia-500/20">
              <Sparkles size={16} className="text-fuchsia-400" />
            </div>
            Intelligent Core
          </div>

          <div className="p-6 space-y-6">
            {!analysisResult && !isAnalyzing && (
              <div className="text-center p-8 border border-fuchsia-900/30 rounded-2xl bg-gradient-to-b from-white/5 to-transparent relative overflow-hidden group">
                <div className="absolute inset-0 bg-fuchsia-500/0 group-hover:bg-fuchsia-500/5 transition-colors"></div>
                <div className="w-16 h-16 rounded-2xl bg-fuchsia-900/30 border border-fuchsia-500/20 mx-auto flex items-center justify-center mb-5 rotate-3 group-hover:rotate-6 transition-transform shadow-[0_0_20px_transparent] group-hover:shadow-[0_0_20px_rgba(217,70,239,0.2)]">
                  <Sparkles size={28} className="text-fuchsia-400" />
                </div>
                <h3 className="text-white font-bold mb-2">Ready to Scan</h3>
                <p className="text-sm text-slate-400 leading-relaxed font-medium">Click "Optimize Details" to run a full architectural and quality scan on your workspace.</p>
              </div>
            )}

            {isAnalyzing && (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 rounded-full border-[3px] border-fuchsia-500/20"></div>
                  <div className="absolute inset-0 rounded-full border-[3px] border-fuchsia-500 border-t-transparent animate-spin"></div>
                </div>
                <span className="text-sm font-bold text-fuchsia-300 tracking-widest uppercase animate-pulse">Analyzing AST...</span>
              </div>
            )}

            {analysisResult && !analysisResult.error && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">

                {/* Skill Score Card */}
                <div className="p-6 rounded-2xl border border-fuchsia-500/30 bg-gradient-to-br from-fuchsia-500/10 to-indigo-600/10 relative overflow-hidden group shadow-[0_0_30px_rgba(217,70,239,0.1)]">
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-fuchsia-500/30 rounded-full blur-[40px] group-hover:bg-fuchsia-400/40 transition-all duration-700"></div>
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-fuchsia-500 via-purple-500 to-indigo-500"></div>

                  <div className="text-[10px] text-fuchsia-300 font-bold uppercase tracking-[0.2em] mb-2 relative z-10">Architecture Score</div>
                  <div className="flex items-baseline relative z-10">
                    <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-fuchsia-200 tracking-tighter drop-shadow-md">{analysisResult.score}</div>
                    <span className="text-2xl text-fuchsia-500/50 font-bold ml-1">/100</span>
                  </div>
                </div>

                {/* Insights Card */}
                {analysisResult.insights && (
                  <div className="p-5 rounded-2xl bg-[#160B31]/60 border border-fuchsia-900/40 text-[15px] text-fuchsia-100/90 leading-relaxed shadow-lg relative overflow-hidden">
                    <div className="absolute left-0 top-0 w-1 h-full bg-fuchsia-500"></div>
                    <strong className="text-white block mb-3 flex items-center gap-2 font-bold tracking-wide uppercase text-xs"><CheckCircle size={16} className="text-fuchsia-400" /> Executive Summary</strong>
                    {analysisResult.insights}
                  </div>
                )}

                {/* Issue List */}
                {analysisResult.feedback && analysisResult.feedback.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 mt-8 mb-4">
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent to-fuchsia-900/50"></div>
                      <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-fuchsia-400 text-center">Detected Issues</h4>
                      <div className="h-px flex-1 bg-gradient-to-l from-transparent to-fuchsia-900/50"></div>
                    </div>

                    {analysisResult.feedback.map((issue: any, idx: number) => (
                      <div key={idx} className="p-5 rounded-2xl bg-[#0F0822] border border-fuchsia-900/30 hover:border-fuchsia-500/50 transition-all duration-300 group hover:shadow-[0_4px_20px_rgba(217,70,239,0.15)] relative overflow-hidden">
                        <div className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-purple-500 to-pink-500 opacity-50 group-hover:opacity-100"></div>
                        <div className="flex items-start gap-4">
                          <div className="mt-1 p-2 rounded-xl bg-white/5 group-hover:bg-fuchsia-500/10 transition-colors">
                            {issue.severity === 'high' ? <AlertTriangle className="text-pink-500" size={18} /> : <AlertTriangle className="text-fuchsia-400" size={18} />}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-fuchsia-300 mb-1.5 uppercase tracking-wider">{issue.file} {issue.line ? `— Line ${issue.line}` : ''}</div>
                            <p className="text-[14px] text-slate-300 leading-relaxed group-hover:text-white transition-colors">{issue.message}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {analysisResult?.error && (
              <div className="p-5 rounded-2xl bg-pink-500/10 border border-pink-500/30 text-pink-300 text-sm flex items-start gap-3 shadow-[0_0_20px_rgba(236,72,153,0.1)]">
                <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">{analysisResult.error}</span>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;
