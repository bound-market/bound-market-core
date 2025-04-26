'use client';

import dynamic from 'next/dynamic';

// Dynamically import the CLOBVisualization component to avoid SSR issues with wallet
const CLOBVisualization = dynamic(
  () => import('./components/CLOBVisualization').then(mod => mod.default),
  { ssr: false }
);

export default function Home() {
  return (
    <main className="container mx-auto px-4 py-8">
      <CLOBVisualization />
    </main>
  );
}