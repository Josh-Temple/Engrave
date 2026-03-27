import { useState } from 'react';
import { useStore } from '../store/useStore';
import { Plus, BrainCircuit, Settings as SettingsIcon } from 'lucide-react';
import { View } from '../App';
import { ItemCard } from './ItemCard';
import { ConfirmDialog } from './ConfirmDialog';

export function Home({ onNavigate }: { onNavigate: (v: View, itemId?: string) => void }) {
  const items = useStore((s) => s.items);
  const getDueItems = useStore((s) => s.getDueItems);
  const deleteItem = useStore((s) => s.deleteItem);
  const moveItem = useStore((s) => s.moveItem);

  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const dueItems = getDueItems();

  const handleDeleteConfirm = () => {
    if (itemToDelete) {
      deleteItem(itemToDelete);
      setItemToDelete(null);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 pt-12 pb-24 min-h-screen flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-medium tracking-tight text-gray-900">Library</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('settings')}
            className="w-10 h-10 rounded-full bg-white border border-gray-100 text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors flex items-center justify-center"
            aria-label="Open settings"
          >
            <SettingsIcon size={18} />
          </button>
          {dueItems.length > 0 && (
            <button
              onClick={() => onNavigate('study')}
              className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-full hover:bg-gray-800 transition-colors"
            >
              <BrainCircuit size={18} />
              <span className="font-medium text-sm">Review {dueItems.length}</span>
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4 flex-1">
        {items.map((item, index) => (
          <ItemCard
            key={item.id}
            item={item}
            isDue={dueItems.some((due) => due.id === item.id)}
            onEdit={() => onNavigate('edit', item.id)}
            onDelete={() => setItemToDelete(item.id)}
            onPractice={() => onNavigate('practice', item.id)}
            onMoveUp={() => moveItem(item.id, 'up')}
            onMoveDown={() => moveItem(item.id, 'down')}
            canMoveUp={index > 0}
            canMoveDown={index < items.length - 1}
          />
        ))}

        {items.length === 0 && (
          <div className="text-center text-gray-400 py-20 font-medium">Tap + to add a text to memorize</div>
        )}
      </div>

      <button
        onClick={() => onNavigate('create')}
        className="fixed bottom-8 right-8 w-16 h-16 bg-gray-900 text-white rounded-full shadow-xl flex items-center justify-center hover:scale-105 transition-transform"
      >
        <Plus size={28} strokeWidth={2} />
      </button>

      <ConfirmDialog
        isOpen={itemToDelete !== null}
        title="Delete Item"
        message="Are you sure you want to delete this item? This action cannot be undone."
        onConfirm={handleDeleteConfirm}
        onCancel={() => setItemToDelete(null)}
      />
    </div>
  );
}
