import React, { useState } from 'react';
import { Sparkles, CheckCircle2, HeartHandshake, X } from 'lucide-react';
import { PrayerCard } from '../types/prayer';

interface ArchiveToThanksgivingModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: PrayerCard | null;
  onConfirmArchiveOnly: () => void;
  onConfirmWithThanksgiving: (thanksgivingNote: string) => void;
}

export const ArchiveToThanksgivingModal: React.FC<ArchiveToThanksgivingModalProps> = ({
  isOpen,
  onClose,
  card,
  onConfirmArchiveOnly,
  onConfirmWithThanksgiving
}) => {
  const [note, setNote] = useState('');

  if (!isOpen || !card) return null;

  const defaultNote = `Praise God for answering: "${card.text.slice(0, 100)}${card.text.length > 100 ? '...' : ''}"`;

  const handleThanksgivingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirmWithThanksgiving(note.trim() || defaultNote);
    setNote('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-neutral-900 border border-emerald-500/40 rounded-2xl shadow-2xl p-6 text-neutral-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-emerald-300">Answered Prayer!</h3>
            <p className="text-xs text-neutral-400">Would you like to celebrate God's faithfulness in Thanksgiving?</p>
          </div>
        </div>

        <div className="p-3.5 bg-neutral-950/80 rounded-xl border border-neutral-800 mb-5 text-sm text-neutral-300 italic">
          "{card.text}"
        </div>

        <form onSubmit={handleThanksgivingSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">
              Create a card in the <span className="text-emerald-400 font-semibold">Thanksgiving</span> category:
            </label>
            <textarea
              rows={3}
              placeholder={defaultNote}
              value={note}
              onChange={e => setNote(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-800/90 border border-neutral-700 rounded-xl text-neutral-100 text-sm focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onConfirmArchiveOnly}
              className="px-4 py-2 text-xs font-medium text-neutral-400 hover:text-neutral-200 transition-colors"
            >
              Just Archive (No Thanksgiving Card)
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-medium flex items-center gap-2 shadow-lg transition-all active:scale-95"
            >
              <HeartHandshake className="w-4 h-4" /> Add to Thanksgiving & Archive
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
