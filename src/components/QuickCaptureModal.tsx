import React, { useState, useEffect } from 'react';
import { X, Send, Sparkles, Hash, Folder, Check } from 'lucide-react';
import { PrayerCategory, PrayerCard } from '../types/prayer';
import { isTauriEnvironment } from '../services/storage';

interface QuickCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: PrayerCategory[];
  onAddCard: (categoryName: string, subjectName: string, text: string, isMarkdown: boolean) => void;
}

export const QuickCaptureModal: React.FC<QuickCaptureModalProps> = ({
  isOpen,
  onClose,
  categories,
  onAddCard
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Supplication');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [customSubject, setCustomSubject] = useState<string>('');
  const [text, setText] = useState<string>('');
  const [isMarkdown, setIsMarkdown] = useState<boolean>(false);

  // Available subjects in selected category
  const activeCategory = categories.find(c => c.name.toLowerCase() === selectedCategory.toLowerCase());
  const subjects = activeCategory?.subjects.filter(s => !s.isInbox) || [];

  useEffect(() => {
    if (subjects.length > 0 && !selectedSubject) {
      setSelectedSubject(subjects[0].name);
    }
  }, [selectedCategory, subjects, selectedSubject]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalSubject = customSubject.trim() || selectedSubject || 'General';
    if (!text.trim()) return;

    onAddCard(selectedCategory, finalSubject, text.trim(), isMarkdown);
    setText('');
    setCustomSubject('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-neutral-900 border border-neutral-700/80 rounded-2xl shadow-2xl p-6 text-neutral-100">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Quick Prayer Capture</h2>
              <p className="text-xs text-neutral-400">Shortcut: Cmd + Shift + P</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="py-4 space-y-4">
          {/* ACTS Category Selector */}
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">Category</label>
            <div className="grid grid-cols-4 gap-2">
              {['Adoration', 'Confession', 'Thanksgiving', 'Supplication'].map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat);
                    setSelectedSubject('');
                  }}
                  className={`py-1.5 px-2 rounded-xl text-xs font-medium transition-all ${
                    selectedCategory.toLowerCase() === cat.toLowerCase()
                      ? 'bg-neutral-100 text-neutral-950 shadow-md font-semibold'
                      : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Subject Selector */}
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">
              Topic / Subject
            </label>
            <div className="flex gap-2">
              <select
                value={selectedSubject}
                onChange={e => {
                  setSelectedSubject(e.target.value);
                  setCustomSubject('');
                }}
                className="flex-1 px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-xl text-xs text-neutral-200 focus:outline-none focus:border-amber-500"
              >
                {subjects.map(s => (
                  <option key={s.name} value={s.name}>
                    {s.name}
                  </option>
                ))}
                <option value="__NEW__">+ New Topic / Individual</option>
              </select>

              {selectedSubject === '__NEW__' && (
                <input
                  type="text"
                  placeholder="Subject name..."
                  value={customSubject}
                  onChange={e => setCustomSubject(e.target.value)}
                  autoFocus
                  className="flex-1 px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-xl text-xs text-neutral-200 focus:outline-none focus:border-amber-500"
                />
              )}
            </div>
          </div>

          {/* Prayer Request Body */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-neutral-300">Prayer Text</label>
              <label className="flex items-center gap-1.5 text-xs text-neutral-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isMarkdown}
                  onChange={e => setIsMarkdown(e.target.checked)}
                  className="rounded bg-neutral-800 border-neutral-700 text-amber-500 focus:ring-0"
                />
                Markdown format
              </label>
            </div>
            <textarea
              rows={4}
              required
              autoFocus={selectedSubject !== '__NEW__'}
              placeholder="Write your prayer request, praise, scripture, or intercession..."
              value={text}
              onChange={e => setText(e.target.value)}
              className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded-xl text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500 resize-none font-sans"
            />
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-neutral-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-medium rounded-xl text-xs flex items-center gap-2 shadow-lg transition-all active:scale-95"
            >
              <Send className="w-3.5 h-3.5" /> Save Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
