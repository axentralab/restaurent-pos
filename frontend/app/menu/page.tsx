import { Suspense } from 'react';
import MenuContent from './MenuContent';

export default function PublicMenuPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-500 text-sm">Loading menu...</p>
      </div>
    }>
      <MenuContent />
    </Suspense>
  );
}
