import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { CreatePage } from './pages/CreatePage';
import { CreationsPage } from './pages/CreationsPage';
import { SettingsPage } from './pages/SettingsPage';

type Page = 'create' | 'creations' | 'settings';

export default function App() {
  const [activePage, setActivePage] = useState<Page>('create');

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      <main className="flex-1 overflow-auto">
        {activePage === 'create' && <CreatePage />}
        {activePage === 'creations' && <CreationsPage />}
        {activePage === 'settings' && <SettingsPage />}
      </main>
    </div>
  );
}
