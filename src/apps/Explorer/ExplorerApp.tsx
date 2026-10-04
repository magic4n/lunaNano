import React, { useState, useEffect } from 'react';
import { useIpcStore } from '../../stores/ipcStore';
import { FsItem, FsProgressEvent } from '../../types/ipc';

export const ExplorerApp: React.FC = () => {
  const { requestFsList, send, onFsProgress } = useIpcStore();
  const [currentPath, setCurrentPath] = useState('/home');
  const [items, setItems] = useState<FsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FsItem | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [showHidden, setShowHidden] = useState(false);
  
  // Progress dialog state
  const [activeProgress, setActiveProgress] = useState<FsProgressEvent | null>(null);

  // New folder / file modal
  const [showNewDialog, setShowNewDialog] = useState<'folder' | 'file' | 'compress' | null>(null);
  const [dialogInput, setDialogInput] = useState('');
  const [archiveType, setArchiveType] = useState<'zip' | 'tar.gz' | '7z'>('7z');

  // Clipboard for copy/cut
  const [clipboard, setClipboard] = useState<{ op: 'copy' | 'cut'; item: FsItem } | null>(null);

  const loadDirectory = async (path: string) => {
    setLoading(true);
    setSelectedItem(null);
    try {
      const list = await requestFsList(path);
      setItems(list);
      setCurrentPath(path);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDirectory(currentPath);
  }, []);

  const handleItemDoubleClick = (item: FsItem) => {
    if (item.isDirectory) {
      loadDirectory(item.path);
    } else if (item.name.endsWith('.zip') || item.name.endsWith('.tar.gz') || item.name.endsWith('.7z')) {
      // Extract archive
      const opId = `extract-${Date.now()}`;
      onFsProgress(opId, (ev) => {
        setActiveProgress(ev);
        if (ev.status === 'completed') {
          setTimeout(() => {
            setActiveProgress(null);
            loadDirectory(currentPath);
          }, 1200);
        }
      });
      send({
        type: 'fs:extract',
        opId,
        archivePath: item.path,
        destination: currentPath,
      });
    }
  };

  const handleNavigateUp = () => {
    if (currentPath === '/' || currentPath === '') return;
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    const up = '/' + parts.join('/');
    loadDirectory(up || '/');
  };

  const handleCreate = () => {
    if (!dialogInput.trim() || !showNewDialog) return;
    const target = `${currentPath}/${dialogInput.trim()}`;
    if (showNewDialog === 'folder') {
      send({ type: 'fs:mkdir', path: target });
    } else if (showNewDialog === 'file') {
      send({ type: 'fs:write', path: target, content: '' });
    } else if (showNewDialog === 'compress' && selectedItem) {
      const opId = `compress-${Date.now()}`;
      onFsProgress(opId, (ev) => {
        setActiveProgress(ev);
        if (ev.status === 'completed') {
          setTimeout(() => {
            setActiveProgress(null);
            loadDirectory(currentPath);
          }, 1200);
        }
      });
      send({
        type: 'fs:compress',
        opId,
        archiveType,
        sources: [selectedItem.path],
        destination: `${currentPath}/${dialogInput.trim()}.${archiveType}`,
      });
    }
    setShowNewDialog(null);
    setDialogInput('');
    setTimeout(() => loadDirectory(currentPath), 400);
  };

  const handleDelete = (item: FsItem) => {
    if (confirm(`Delete ${item.name}?`)) {
      send({ type: 'fs:delete', path: item.path });
      setTimeout(() => loadDirectory(currentPath), 400);
    }
  };

  const handlePaste = () => {
    if (!clipboard) return;
    const opId = `paste-${Date.now()}`;
    const dest = `${currentPath}/${clipboard.item.name}`;
    onFsProgress(opId, (ev) => {
      setActiveProgress(ev);
      if (ev.status === 'completed') {
        setTimeout(() => {
          setActiveProgress(null);
          loadDirectory(currentPath);
        }, 1200);
      }
    });

    if (clipboard.op === 'copy') {
      send({ type: 'fs:copy', opId, source: clipboard.item.path, destination: dest });
    } else {
      send({ type: 'fs:move', opId, source: clipboard.item.path, destination: dest });
      setClipboard(null);
    }
  };

  const filteredItems = items
    .filter((it) => (showHidden ? true : !it.name.startsWith('.')))
    .filter((it) => it.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const BOOKMARKS = [
    { name: 'Home', path: '/home', icon: 'home' },
    { name: 'Documents', path: '/home/Documents', icon: 'description' },
    { name: 'Downloads', path: '/home/Downloads', icon: 'download' },
    { name: 'Pictures', path: '/home/Pictures', icon: 'image' },
    { name: 'Projects', path: '/home/projects', icon: 'code' },
    { name: 'Root', path: '/', icon: 'hard_drive' },
  ];

  return (
    <div className="w-full h-full flex flex-col bg-[var(--md-sys-color-surface)] text-[var(--md-sys-color-on-surface)] select-none">
      {/* Top action & path bar */}
      <div className="p-2 border-b border-[var(--md-sys-color-outline-variant)]/20 flex items-center justify-between gap-3 bg-[var(--md-sys-color-surface-container)]">
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleNavigateUp}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--md-sys-color-outline-variant)]/20 active:scale-95"
            title="Go to parent directory"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
          </button>
          <button
            onClick={() => loadDirectory(currentPath)}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--md-sys-color-outline-variant)]/20 active:scale-95"
            title="Refresh"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
          </button>
        </div>

        {/* Breadcrumb Path Box */}
        <div className="flex-1 px-3 py-1.5 bg-[var(--md-sys-color-surface)] border border-[var(--md-sys-color-outline-variant)]/30 rounded-xl text-xs font-mono flex items-center gap-1 overflow-x-auto">
          <span className="material-symbols-outlined text-[16px] text-[var(--md-sys-color-primary)]">folder</span>
          <span>{currentPath}</span>
        </div>

        {/* Search & View Mode */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-2 top-1.5 text-[16px] text-[var(--md-sys-color-on-surface-variant)]">search</span>
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 pr-2 py-1 text-xs rounded-xl bg-[var(--md-sys-color-surface)] border border-[var(--md-sys-color-outline-variant)]/30 text-[var(--md-sys-color-on-surface)] w-36 focus:outline-none focus:border-[var(--md-sys-color-primary)]"
            />
          </div>
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--md-sys-color-outline-variant)]/20 text-[var(--md-sys-color-on-surface)]"
            title="Toggle View Mode"
          >
            <span className="material-symbols-outlined text-[18px]">
              {viewMode === 'grid' ? 'view_list' : 'grid_view'}
            </span>
          </button>
          <button
            onClick={() => setShowHidden(!showHidden)}
            className={`w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--md-sys-color-outline-variant)]/20 ${showHidden ? 'text-[var(--md-sys-color-primary)]' : 'text-[var(--md-sys-color-on-surface-variant)]'}`}
            title="Toggle Hidden Files"
          >
            <span className="material-symbols-outlined text-[18px]">visibility</span>
          </button>
        </div>
      </div>

      {/* Main content body with Bookmarks sidebar + Item view */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-48 p-2 border-r border-[var(--md-sys-color-outline-variant)]/20 bg-[var(--md-sys-color-surface-container)] flex flex-col gap-1 text-xs">
          <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--md-sys-color-on-surface-variant)]">
            Places
          </div>
          {BOOKMARKS.map((bm) => (
            <button
              key={bm.path}
              onClick={() => loadDirectory(bm.path)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left font-medium transition-colors ${
                currentPath === bm.path
                  ? 'bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)]'
                  : 'hover:bg-[var(--md-sys-color-outline-variant)]/10 text-[var(--md-sys-color-on-surface)]'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">{bm.icon}</span>
              <span>{bm.name}</span>
            </button>
          ))}

          <div className="mt-4 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--md-sys-color-on-surface-variant)]">
            Actions
          </div>
          <button
            onClick={() => { setShowNewDialog('folder'); setDialogInput(''); }}
            className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-[var(--md-sys-color-outline-variant)]/10 text-left"
          >
            <span className="material-symbols-outlined text-[18px]">create_new_folder</span>
            <span>New Folder</span>
          </button>
          <button
            onClick={() => { setShowNewDialog('file'); setDialogInput(''); }}
            className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-[var(--md-sys-color-outline-variant)]/10 text-left"
          >
            <span className="material-symbols-outlined text-[18px]">note_add</span>
            <span>New File</span>
          </button>
          {clipboard && (
            <button
              onClick={handlePaste}
              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--md-sys-color-primary)]/10 text-[var(--md-sys-color-primary)] font-semibold text-left mt-2"
            >
              <span className="material-symbols-outlined text-[18px]">content_paste</span>
              <span>Paste {clipboard.item.name}</span>
            </button>
          )}
        </div>

        {/* Files View Area */}
        <div className="flex-1 p-3 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <span className="material-symbols-outlined text-4xl animate-spin text-[var(--md-sys-color-primary)]">progress_activity</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-[var(--md-sys-color-on-surface-variant)]">
              <span className="material-symbols-outlined text-5xl mb-2">folder_open</span>
              <p className="text-sm">Empty Folder</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
              {filteredItems.map((item) => {
                const isSelected = selectedItem?.path === item.path;
                const isArchive = item.name.endsWith('.zip') || item.name.endsWith('.tar.gz') || item.name.endsWith('.7z');
                return (
                  <div
                    key={item.path}
                    onClick={() => setSelectedItem(item)}
                    onDoubleClick={() => handleItemDoubleClick(item)}
                    className={`flex flex-col items-center p-3 rounded-2xl cursor-pointer text-center group transition-all ${
                      isSelected
                        ? 'bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] shadow-md'
                        : 'hover:bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-on-surface)]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-4xl mb-1 text-[var(--md-sys-color-primary)] group-hover:scale-105 transition-transform">
                      {item.isDirectory ? 'folder' : isArchive ? 'archive' : 'draft'}
                    </span>
                    <span className="text-xs font-medium truncate w-full" title={item.name}>
                      {item.name}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredItems.map((item) => {
                const isSelected = selectedItem?.path === item.path;
                return (
                  <div
                    key={item.path}
                    onClick={() => setSelectedItem(item)}
                    onDoubleClick={() => handleItemDoubleClick(item)}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer text-xs transition-colors ${
                      isSelected
                        ? 'bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)]'
                        : 'hover:bg-[var(--md-sys-color-surface-container)]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="material-symbols-outlined text-[18px] text-[var(--md-sys-color-primary)]">
                        {item.isDirectory ? 'folder' : 'draft'}
                      </span>
                      <span className="font-medium truncate">{item.name}</span>
                    </div>
                    <div className="text-[11px] text-[var(--md-sys-color-on-surface-variant)]">
                      {item.isDirectory ? 'Folder' : `${Math.round(item.size / 1024)} KB`}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Selected Item Action Bar at bottom */}
      {selectedItem && (
        <div className="px-4 py-2 bg-[var(--md-sys-color-surface-container-high)] border-t border-[var(--md-sys-color-outline-variant)]/20 flex items-center justify-between text-xs">
          <div className="font-semibold text-[var(--md-sys-color-on-surface)] truncate max-w-sm">
            {selectedItem.name}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setClipboard({ op: 'copy', item: selectedItem })}
              className="px-2.5 py-1 rounded-lg hover:bg-[var(--md-sys-color-outline-variant)]/20 flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">content_copy</span>
              <span>Copy</span>
            </button>
            <button
              onClick={() => setClipboard({ op: 'cut', item: selectedItem })}
              className="px-2.5 py-1 rounded-lg hover:bg-[var(--md-sys-color-outline-variant)]/20 flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">content_cut</span>
              <span>Cut</span>
            </button>
            <button
              onClick={() => { setShowNewDialog('compress'); setDialogInput(selectedItem.name.replace(/\.[^/.]+$/, '')); }}
              className="px-2.5 py-1 rounded-lg hover:bg-[var(--md-sys-color-outline-variant)]/20 flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">archive</span>
              <span>Compress 7z/Zip</span>
            </button>
            <button
              onClick={() => handleDelete(selectedItem)}
              className="px-2.5 py-1 rounded-lg hover:bg-[var(--md-sys-color-error)]/10 text-[var(--md-sys-color-error)] flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">delete</span>
              <span>Delete</span>
            </button>
          </div>
        </div>
      )}

      {/* M3 Progress Dialog (Archive unpack / pack / copy) */}
      {activeProgress && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] rounded-3xl p-6 w-96 shadow-2xl border border-[var(--md-sys-color-outline-variant)]/30">
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-3xl text-[var(--md-sys-color-primary)]">
                {activeProgress.operation === 'compress' || activeProgress.operation === 'extract' ? 'archive' : 'sync'}
              </span>
              <div>
                <h4 className="font-bold text-sm capitalize">{activeProgress.operation}...</h4>
                <p className="text-xs text-[var(--md-sys-color-on-surface-variant)] truncate max-w-[240px]">
                  {activeProgress.currentFile}
                </p>
              </div>
            </div>

            <div className="w-full bg-[var(--md-sys-color-surface)] h-2 rounded-full overflow-hidden mb-2">
              <div
                className="bg-[var(--md-sys-color-primary)] h-full transition-all duration-200"
                style={{ width: `${activeProgress.percent}%` }}
              />
            </div>

            <div className="flex justify-between text-xs text-[var(--md-sys-color-on-surface-variant)] font-semibold">
              <span>{activeProgress.percent}%</span>
              <span>{activeProgress.completedFiles} / {activeProgress.totalFiles}</span>
            </div>
          </div>
        </div>
      )}

      {/* New Folder/File/Compress Dialog */}
      {showNewDialog && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] rounded-3xl p-6 w-80 shadow-2xl border border-[var(--md-sys-color-outline-variant)]/30">
            <h3 className="text-sm font-bold mb-3 capitalize">
              {showNewDialog === 'compress' ? 'Create Archive' : `New ${showNewDialog}`}
            </h3>

            <input
              type="text"
              autoFocus
              placeholder="Name..."
              value={dialogInput}
              onChange={(e) => setDialogInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
              className="w-full px-3 py-2 rounded-xl bg-[var(--md-sys-color-surface)] border border-[var(--md-sys-color-outline-variant)]/40 text-xs mb-3 text-[var(--md-sys-color-on-surface)] focus:outline-none focus:border-[var(--md-sys-color-primary)]"
            />

            {showNewDialog === 'compress' && (
              <div className="flex gap-2 mb-4">
                {(['7z', 'zip', 'tar.gz'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setArchiveType(t)}
                    className={`flex-1 py-1 text-xs rounded-lg font-semibold ${archiveType === t ? 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)]' : 'bg-[var(--md-sys-color-surface)]'}`}
                  >
                    .{t}
                  </button>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2 text-xs font-semibold">
              <button
                onClick={() => setShowNewDialog(null)}
                className="px-4 py-2 rounded-full hover:bg-[var(--md-sys-color-outline-variant)]/20"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="px-4 py-2 rounded-full bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] shadow-md"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
