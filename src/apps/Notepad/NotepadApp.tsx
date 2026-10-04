import React, { useState, useEffect, useRef } from 'react';
import { marked } from 'marked';
import { useIpcStore } from '../../stores/ipcStore';
import { useSettingsStore } from '../../stores/settingsStore';

interface Note {
  id: string;
  title: string;
  content: string;
  tag: string;
  updatedAt: number;
}

export const NotepadApp: React.FC = () => {
  const { send } = useIpcStore();
  const { settings } = useSettingsStore();

  const [notes, setNotes] = useState<Note[]>(() => {
    const saved = localStorage.getItem('lunanano_notes');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [
      {
        id: 'note-welcome',
        title: 'Welcome to Luna Notes',
        content: '# LunaNano Notes\n\nA beautiful Material You 3 Markdown editor built for the LunaNano Wayland Shell.\n\n### Core Features\n- **Live Markdown Preview** with split view\n- Autosave directly into `~/.local/share/lunanano/notes/`\n- Tag taxonomy and instant search\n- Markdown and HTML export\n\n```rust\nfn main() {\n    println!("LunaNano: standalone Wayland desktop shell");\n}\n```\n\n> Enjoy distraction-free writing in pure Material You 3.\n',
        tag: 'Ideas',
        updatedAt: Date.now(),
      },
    ];
  });

  const [activeNoteId, setActiveNoteId] = useState<string>('note-welcome');
  const [activeTab, setActiveTab] = useState<'edit' | 'split' | 'preview'>('split');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('All');
  const [saveStatus, setSaveStatus] = useState<string>('Saved');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const activeNote = notes.find((n) => n.id === activeNoteId) || notes[0];
  const autoSaveTimer = useRef<any>(null);

  // Stats calculation
  const wordCount = activeNote?.content ? activeNote.content.trim().split(/\s+/).filter(Boolean).length : 0;
  const charCount = activeNote?.content ? activeNote.content.length : 0;
  const readingTime = Math.ceil(wordCount / 200);

  const saveNoteToDisk = (note: Note) => {
    localStorage.setItem('lunanano_notes', JSON.stringify(notes));
    const filename = `${note.title.replace(/[^a-zA-Z0-9_-]/g, '_') || 'untitled'}.md`;
    const fullPath = `${settings.notepad.storagePath || '~/.local/share/lunanano/notes/'}${filename}`;
    send({
      type: 'fs:write',
      path: fullPath,
      content: note.content,
    });
    setSaveStatus('Saved');
  };

  const handleContentChange = (content: string) => {
    setSaveStatus('Saving...');
    const updated = notes.map((n) =>
      n.id === activeNoteId ? { ...n, content, updatedAt: Date.now() } : n
    );
    setNotes(updated);

    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      const cur = updated.find((n) => n.id === activeNoteId);
      if (cur) saveNoteToDisk(cur);
    }, settings.notepad.autoSaveIntervalMs || 1500);
  };

  const handleTitleChange = (title: string) => {
    const updated = notes.map((n) =>
      n.id === activeNoteId ? { ...n, title, updatedAt: Date.now() } : n
    );
    setNotes(updated);
  };

  const handleTagChange = (tag: string) => {
    const updated = notes.map((n) =>
      n.id === activeNoteId ? { ...n, tag, updatedAt: Date.now() } : n
    );
    setNotes(updated);
  };

  const insertMarkdown = (prefix: string, suffix: string = '') => {
    const el = textareaRef.current;
    if (!el || !activeNote) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = activeNote.content;
    const selected = text.substring(start, end);
    const replacement = `${prefix}${selected}${suffix}`;
    const nextContent = text.substring(0, start) + replacement + text.substring(end);

    handleContentChange(nextContent);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 10);
  };

  const createNewNote = () => {
    const newNote: Note = {
      id: `note-${Date.now()}`,
      title: 'Untitled Note',
      content: '# Untitled Note\n\nStart writing...',
      tag: 'Personal',
      updatedAt: Date.now(),
    };
    setNotes([newNote, ...notes]);
    setActiveNoteId(newNote.id);
  };

  const deleteActiveNote = () => {
    if (notes.length <= 1) return;
    if (confirm('Delete this note?')) {
      const remaining = notes.filter((n) => n.id !== activeNoteId);
      setNotes(remaining);
      setActiveNoteId(remaining[0].id);
      localStorage.setItem('lunanano_notes', JSON.stringify(remaining));
    }
  };

  const exportNote = (format: 'md' | 'html') => {
    if (!activeNote) return;
    let content = activeNote.content;
    let mime = 'text/markdown';
    let ext = 'md';
    if (format === 'html') {
      content = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${activeNote.title}</title><style>body{font-family:sans-serif;padding:2rem;max-width:800px;margin:auto;}</style></head><body>${marked.parse(activeNote.content)}</body></html>`;
      mime = 'text/html';
      ext = 'html';
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeNote.title || 'note'}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredNotes = notes
    .filter((n) => (selectedTag === 'All' ? true : n.tag === selectedTag))
    .filter((n) => n.title.toLowerCase().includes(searchQuery.toLowerCase()) || n.content.toLowerCase().includes(searchQuery.toLowerCase()));

  const TAGS = ['All', ...(settings.notepad.defaultTags || ['Personal', 'Work', 'Ideas', 'Todos'])];

  return (
    <div className="w-full h-full flex bg-[var(--md-sys-color-surface)] text-[var(--md-sys-color-on-surface)] select-none">
      {/* Sidebar: Notes list */}
      <div className="w-64 border-r border-[var(--md-sys-color-outline-variant)]/20 bg-[var(--md-sys-color-surface-container)] flex flex-col">
        {/* Search & New note */}
        <div className="p-3 border-b border-[var(--md-sys-color-outline-variant)]/20 flex items-center gap-2">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-2.5 top-2 text-[16px] text-[var(--md-sys-color-on-surface-variant)]">search</span>
            <input
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2 py-1.5 rounded-xl bg-[var(--md-sys-color-surface)] border border-[var(--md-sys-color-outline-variant)]/30 text-xs text-[var(--md-sys-color-on-surface)] focus:outline-none focus:border-[var(--md-sys-color-primary)]"
            />
          </div>
          <button
            onClick={createNewNote}
            className="w-8 h-8 rounded-full bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] flex items-center justify-center shadow-md active:scale-95 transition-transform"
            title="New Note"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
          </button>
        </div>

        {/* Tag filter chips */}
        <div className="px-3 py-2 flex items-center gap-1.5 overflow-x-auto border-b border-[var(--md-sys-color-outline-variant)]/10">
          {TAGS.map((t) => (
            <button
              key={t}
              onClick={() => setSelectedTag(t)}
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors ${
                selectedTag === t
                  ? 'bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)]'
                  : 'bg-[var(--md-sys-color-surface)] text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-container-high)]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Note items */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredNotes.map((note) => {
            const isSelected = note.id === activeNoteId;
            return (
              <div
                key={note.id}
                onClick={() => setActiveNoteId(note.id)}
                className={`p-3 rounded-2xl cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] shadow-sm'
                    : 'hover:bg-[var(--md-sys-color-surface)] text-[var(--md-sys-color-on-surface)]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-semibold text-xs truncate max-w-[140px]">{note.title}</h4>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[var(--md-sys-color-surface-container-highest)] text-[var(--md-sys-color-on-surface-variant)] font-medium">
                    {note.tag}
                  </span>
                </div>
                <p className="text-[11px] opacity-75 line-clamp-2 leading-relaxed">
                  {note.content.replace(/#+\s/g, '').slice(0, 80)}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Editor & Preview Area */}
      {activeNote && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top note header */}
          <div className="p-3 border-b border-[var(--md-sys-color-outline-variant)]/20 flex items-center justify-between gap-3 bg-[var(--md-sys-color-surface-container)]">
            <input
              type="text"
              value={activeNote.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="text-sm font-bold bg-transparent border-none text-[var(--md-sys-color-on-surface)] focus:outline-none flex-1"
              placeholder="Note title..."
            />

            {/* Tag selector */}
            <select
              value={activeNote.tag}
              onChange={(e) => handleTagChange(e.target.value)}
              className="bg-[var(--md-sys-color-surface)] border border-[var(--md-sys-color-outline-variant)]/30 text-xs rounded-xl px-2 py-1 text-[var(--md-sys-color-on-surface)] focus:outline-none"
            >
              {TAGS.filter((t) => t !== 'All').map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            {/* View Mode Tabs */}
            <div className="flex items-center bg-[var(--md-sys-color-surface)] rounded-xl p-0.5 border border-[var(--md-sys-color-outline-variant)]/30">
              <button
                onClick={() => setActiveTab('edit')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${activeTab === 'edit' ? 'bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)]' : 'text-[var(--md-sys-color-on-surface-variant)]'}`}
              >
                Edit
              </button>
              <button
                onClick={() => setActiveTab('split')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${activeTab === 'split' ? 'bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)]' : 'text-[var(--md-sys-color-on-surface-variant)]'}`}
              >
                Split
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${activeTab === 'preview' ? 'bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)]' : 'text-[var(--md-sys-color-on-surface-variant)]'}`}
              >
                Preview
              </button>
            </div>

            {/* Save & Export */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] font-medium">{saveStatus}</span>
              <button
                onClick={() => exportNote('md')}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--md-sys-color-outline-variant)]/20"
                title="Export Markdown"
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
              </button>
              <button
                onClick={deleteActiveNote}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--md-sys-color-error)]/10 text-[var(--md-sys-color-error)]"
                title="Delete Note"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>
            </div>
          </div>

          {/* Markdown Formatting Toolbar */}
          <div className="px-3 py-1.5 bg-[var(--md-sys-color-surface-container-high)] border-b border-[var(--md-sys-color-outline-variant)]/20 flex items-center gap-1 text-xs">
            <button
              onClick={() => insertMarkdown('**', '**')}
              className="px-2 py-1 rounded hover:bg-[var(--md-sys-color-outline-variant)]/20 font-bold"
              title="Bold"
            >
              B
            </button>
            <button
              onClick={() => insertMarkdown('*', '*')}
              className="px-2 py-1 rounded hover:bg-[var(--md-sys-color-outline-variant)]/20 italic font-serif"
              title="Italic"
            >
              I
            </button>
            <button
              onClick={() => insertMarkdown('# ')}
              className="px-2 py-1 rounded hover:bg-[var(--md-sys-color-outline-variant)]/20 font-bold"
              title="Heading 1"
            >
              H1
            </button>
            <button
              onClick={() => insertMarkdown('## ')}
              className="px-2 py-1 rounded hover:bg-[var(--md-sys-color-outline-variant)]/20 font-bold"
              title="Heading 2"
            >
              H2
            </button>
            <button
              onClick={() => insertMarkdown('```\n', '\n```')}
              className="px-2 py-1 rounded hover:bg-[var(--md-sys-color-outline-variant)]/20 font-mono"
              title="Code Block"
            >
              {'</>'}
            </button>
            <button
              onClick={() => insertMarkdown('> ')}
              className="px-2 py-1 rounded hover:bg-[var(--md-sys-color-outline-variant)]/20"
              title="Quote"
            >
              "
            </button>
            <button
              onClick={() => insertMarkdown('- ')}
              className="px-2 py-1 rounded hover:bg-[var(--md-sys-color-outline-variant)]/20"
              title="List"
            >
              • List
            </button>
            <button
              onClick={() => insertMarkdown('[', '](https://)')}
              className="px-2 py-1 rounded hover:bg-[var(--md-sys-color-outline-variant)]/20"
              title="Link"
            >
              🔗 Link
            </button>
          </div>

          {/* Editor/Preview split pane */}
          <div className="flex-1 flex overflow-hidden">
            {(activeTab === 'edit' || activeTab === 'split') && (
              <textarea
                ref={textareaRef}
                value={activeNote.content}
                onChange={(e) => handleContentChange(e.target.value)}
                className={`h-full p-4 bg-[var(--md-sys-color-surface)] text-[var(--md-sys-color-on-surface)] font-mono text-xs leading-relaxed resize-none focus:outline-none select-text ${
                  activeTab === 'split' ? 'w-1/2 border-r border-[var(--md-sys-color-outline-variant)]/20' : 'w-full'
                }`}
                placeholder="Type Markdown content here..."
              />
            )}

            {(activeTab === 'preview' || activeTab === 'split') && (
              <div
                className={`h-full p-6 overflow-y-auto bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-on-surface)] select-text prose prose-invert max-w-none text-xs leading-relaxed ${
                  activeTab === 'split' ? 'w-1/2' : 'w-full'
                }`}
                dangerouslySetInnerHTML={{
                  __html: marked.parse(activeNote.content) as string,
                }}
              />
            )}
          </div>

          {/* Bottom Document Statistics Bar */}
          <div className="h-6 px-4 bg-[var(--md-sys-color-surface-container-high)] border-t border-[var(--md-sys-color-outline-variant)]/20 flex items-center justify-between text-[11px] text-[var(--md-sys-color-on-surface-variant)]">
            <div className="flex items-center gap-3">
              <span>{wordCount} words</span>
              <span>•</span>
              <span>{charCount} characters</span>
              <span>•</span>
              <span>~{readingTime} min read</span>
            </div>
            <div className="text-[10px]">
              Location: {settings.notepad.storagePath || '~/.local/share/lunanano/notes/'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
