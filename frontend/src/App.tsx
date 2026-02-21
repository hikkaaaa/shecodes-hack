import React, { useState, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { useIdeStore } from './store/useIdeStore';
import { Play, Code, CheckCircle, AlertTriangle, FileCode2, Terminal as TerminalIcon, Sparkles } from 'lucide-react';
import axios from 'axios';

function App() {
  const { files, activeFile, setActiveFile, updateFile } = useIdeStore();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const [isRunning, setIsRunning] = useState(false);
  const [runResult, setRunResult] = useState<any>(null);

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

  return (
    <div className="flex flex-col h-screen w-full bg-slate-900 text-slate-100 overflow-hidden font-sans">

      {/* Top Navbar */}
      <div className="flex h-12 border-b border-slate-700/50 items-center justify-between px-4 bg-slate-800/80 backdrop-blur">
        <div className="flex items-center space-x-2">
          <Code className="text-indigo-400" />
          <span className="font-semibold tracking-wide flex items-center gap-2">AI Code Mentor <span className="bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded text-xs">Educational Edition</span></span>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleRun}
            disabled={isRunning}
            className="flex items-center space-x-2 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-md transition-colors disabled:opacity-50 text-sm font-medium"
          >
            <Play size={16} />
            <span>{isRunning ? 'Running...' : 'Run Code'}</span>
          </button>

          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="flex items-center space-x-2 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-md transition-colors disabled:opacity-50 text-sm font-medium shadow-lg shadow-indigo-600/20"
          >
            <Sparkles size={16} />
            <span>{isAnalyzing ? 'Analyzing...' : 'AI Analyze'}</span>
          </button>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left Sidebar (File Explorer) */}
        <div className="w-64 border-r border-slate-700/50 bg-slate-800/30 flex flex-col">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider p-4 pb-2 border-b border-slate-700/50">Explorer</div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {Object.keys(files).map((file) => (
              <div
                key={file}
                onClick={() => setActiveFile(file)}
                className={`flex items-center space-x-2 px-3 py-2 cursor-pointer rounded-md transition-colors ${activeFile === file ? 'bg-indigo-500/10 text-indigo-300' : 'hover:bg-slate-700/50 text-slate-300'}`}
              >
                <FileCode2 size={16} className={activeFile === file ? 'text-indigo-400' : 'text-slate-500'} />
                <span className="text-sm">{file}</span>
              </div>
            ))}
          </div>

          {/* Quick Stats Widget */}
          <div className="p-4 border-t border-slate-700/50 bg-slate-800/50">
            <div className="text-xs text-slate-400 font-medium mb-2">Growth Tracker</div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-300">Avg Score</span>
              <span className="text-indigo-400 font-mono">82/100</span>
            </div>
          </div>
        </div>

        {/* Center Canvas (Editor + Terminal) */}
        <div className="flex flex-col flex-1 border-r border-slate-700/50">

          {/* Tabs */}
          <div className="flex h-10 bg-slate-800/50 border-b border-slate-700/50">
            <div className="px-4 py-2 border-r border-slate-700/50 bg-slate-900 border-t-2 border-t-indigo-500 text-sm text-indigo-300 flex items-center space-x-2 shadow-sm">
              <FileCode2 size={14} />
              <span>{activeFile}</span>
            </div>
          </div>

          {/* Monaco Editor */}
          <div className="flex-1 w-full bg-[#1e1e1e] relative">
            {activeFile && (
              <Editor
                height="100%"
                language={activeFile.endsWith('.py') ? 'python' : 'javascript'}
                theme="vs-dark"
                value={files[activeFile]}
                onChange={(val) => updateFile(activeFile, val || '')}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
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

          {/* Bottom Terminal Panel */}
          <div className="h-64 border-t border-slate-700/50 bg-slate-950 flex flex-col">
            <div className="flex items-center px-4 py-2 border-b border-slate-800 bg-slate-900 text-xs text-slate-400 uppercase font-semibold tracking-wider">
              <TerminalIcon size={14} className="mr-2" /> Output Terminal
            </div>
            <div className="flex-1 p-4 font-mono text-sm overflow-y-auto text-slate-300 leading-relaxed">
              {runResult && (
                <>
                  {runResult.stdout && <pre className="text-emerald-400">{runResult.stdout}</pre>}
                  {runResult.stderr && <pre className="text-red-400">{runResult.stderr}</pre>}
                </>
              )}
              {!runResult && <span className="text-slate-600 italic">Hit 'Run Code' to see output here...</span>}
            </div>
          </div>
        </div>

        {/* Right Panel (AI Analysis) */}
        <div className="w-80 bg-slate-800/30 flex flex-col overflow-y-auto">
          <div className="h-10 flex items-center px-4 border-b border-slate-700/50 bg-slate-800/80 sticky top-0 font-medium text-sm gap-2">
            <Sparkles size={16} className="text-indigo-400" />
            AI Reviewer
          </div>

          <div className="p-4 space-y-4">
            {!analysisResult && !isAnalyzing && (
              <div className="text-center p-6 border border-slate-700/50 rounded-xl bg-slate-800/50 shadow-inner">
                <Sparkles size={32} className="mx-auto text-slate-500 mb-3" />
                <p className="text-sm text-slate-400">Click "AI Analyze" to run a full architectural and quality scan on your current workspace.</p>
              </div>
            )}

            {isAnalyzing && (
              <div className="flex items-center space-x-3 text-indigo-400 p-4 animate-pulse bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                <div className="w-4 h-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>
                <span className="text-sm font-medium">Analyzing AST and generating insights...</span>
              </div>
            )}

            {analysisResult && !analysisResult.error && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">

                {/* Skill Score Card */}
                <div className="p-5 rounded-xl border border-indigo-500/30 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl group-hover:bg-indigo-400/30 transition-all"></div>
                  <div className="text-xs text-indigo-300 font-medium uppercase tracking-wider mb-1">Architecture Score</div>
                  <div className="text-5xl font-bold text-white tracking-tighter shadow-sm">{analysisResult.score}<span className="text-2xl text-slate-500">/100</span></div>
                </div>

                {/* Insights Card */}
                {analysisResult.insights && (
                  <div className="p-4 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-300 leading-relaxed shadow-lg">
                    <strong className="text-slate-200 block mb-2 flex items-center gap-1.5"><CheckCircle size={16} className="text-emerald-400" /> Executive Summary</strong>
                    {analysisResult.insights}
                  </div>
                )}

                {/* Issue List */}
                {analysisResult.issues && analysisResult.issues.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mt-6 mb-3">Detected Issues</h4>
                    {analysisResult.issues.map((issue: any, idx: number) => (
                      <div key={idx} className="p-4 rounded-lg bg-slate-800/80 border border-slate-700 hover:border-slate-600 transition-colors group">
                        <div className="flex items-start gap-3">
                          {issue.severity === 'high' ? <AlertTriangle className="text-red-400 mt-0.5 shrink-0" size={16} /> : <AlertTriangle className="text-amber-400 mt-0.5 shrink-0" size={16} />}
                          <div>
                            <div className="text-[13px] font-mono text-slate-400 mb-1">{issue.file} {issue.line ? `:${issue.line}` : ''}</div>
                            <p className="text-sm text-slate-200 leading-relaxed group-hover:text-white transition-colors">{issue.message}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {analysisResult?.error && (
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
                <AlertTriangle size={16} /> {analysisResult.error}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;
