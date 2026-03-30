import { useState } from 'react';
import { Home } from './components/Home';
import { CreateItem } from './components/CreateItem';
import { Study } from './components/Study';
import { EditItem } from './components/EditItem';
import { Settings } from './components/Settings';
import { ListeningModes } from './components/ListeningModes';

export type View = 'home' | 'create' | 'study' | 'edit' | 'practice' | 'settings' | 'readListen' | 'listen';

export default function App() {
  const [view, setView] = useState<View>('home');
  const [activeItemId, setActiveItemId] = useState<string | null>(null);

  const navigate = (v: View, itemId?: string) => {
    setView(v);
    if (itemId) setActiveItemId(itemId);
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 selection:bg-gray-200">
      {view === 'home' && <Home onNavigate={navigate} />}
      {view === 'create' && <CreateItem onNavigate={navigate} />}
      {view === 'study' && <Study onNavigate={navigate} />}
      {view === 'practice' && activeItemId && <Study onNavigate={navigate} practiceItemId={activeItemId} />}
      {view === 'edit' && activeItemId && <EditItem itemId={activeItemId} onNavigate={navigate} />}
      {view === 'settings' && <Settings onNavigate={navigate} />}
      {view === 'readListen' && <ListeningModes onNavigate={navigate} mode="readListen" />}
      {view === 'listen' && <ListeningModes onNavigate={navigate} mode="listen" />}
    </div>
  );
}
