import { create } from 'zustand';

interface IdeState {
    files: Record<string, string>;
    activeFile: string | null;
    setActiveFile: (path: string) => void;
    updateFile: (path: string, content: string) => void;
    addFile: (path: string, content: string) => void;
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
}));
