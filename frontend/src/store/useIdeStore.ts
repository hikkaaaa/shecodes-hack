import { create } from 'zustand';

export interface ExplanationBlock {
    start_line: number;
    end_line: number;
    color: string;
    explanation: string;
}

interface IdeState {
    files: Record<string, string>;
    activeFile: string | null;
    setActiveFile: (path: string) => void;
    updateFile: (path: string, content: string) => void;
    addFile: (path: string, content: string) => void;
    removeFile: (path: string) => void;

    runCompleted: boolean;
    setRunCompleted: (completed: boolean) => void;

    explanationMode: boolean;
    setExplanationMode: (mode: boolean) => void;

    explanationBlocks: ExplanationBlock[];
    setExplanationBlocks: (blocks: ExplanationBlock[]) => void;

    decorations: string[];
    setDecorations: (ids: string[]) => void;
}

export const useIdeStore = create<IdeState>((set) => ({
    files: {
        'index.py': 'def hello():\n    print("Hello, AI Mentor!")\n\nhello()',
        'utils.py': 'def add(a, b):\n    return a + b\n'
    },
    activeFile: 'index.py',
    setActiveFile: (path) => set({ activeFile: path }),
    updateFile: (path, content) => set((state) => ({
        files: { ...state.files, [path]: content }
    })),
    addFile: (path, content) => set((state) => ({
        files: { ...state.files, [path]: content }
    })),
    removeFile: (path) => set((state) => {
        const newFiles = { ...state.files };
        delete newFiles[path];
        return {
            files: newFiles,
            activeFile: state.activeFile === path ? (Object.keys(newFiles)[0] || null) : state.activeFile
        };
    }),

    runCompleted: false,
    setRunCompleted: (completed) => set({ runCompleted: completed }),

    explanationMode: false,
    setExplanationMode: (mode) => set({ explanationMode: mode }),

    explanationBlocks: [],
    setExplanationBlocks: (blocks) => set({ explanationBlocks: blocks }),

    decorations: [],
    setDecorations: (ids) => set({ decorations: ids })
}));
