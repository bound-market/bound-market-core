"use client";

import React, { useState } from 'react';

const SupabaseSetupGuide: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 max-w-md p-6 bg-gray-800 rounded-xl border border-gray-700 shadow-lg text-white z-50">
      <button 
        onClick={() => setIsOpen(false)}
        className="absolute top-2 right-2 text-gray-400 hover:text-white"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
      
      <h3 className="text-xl font-bold mb-3 text-blue-400">Supabase Setup Required</h3>
      
      <div className="space-y-4 text-gray-300">
        <p>
          You need to configure Supabase properly to use this application. Follow these steps:
        </p>
        
        <ol className="list-decimal list-inside space-y-2 pl-2">
          <li>Create a <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Supabase account</a> if you don't have one already</li>
          <li>Create a new Supabase project</li>
          <li>Run the following SQL in the SQL editor to create the required tables:
            <pre className="bg-gray-900 p-3 rounded-md mt-2 overflow-x-auto text-sm">
              {`CREATE TABLE public.users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  public_key TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_login TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.users(id),
  side TEXT NOT NULL,
  points DECIMAL NOT NULL,
  amount DECIMAL NOT NULL,
  filled_amount DECIMAL DEFAULT 0,
  status TEXT DEFAULT 'OPEN',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.trades (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  maker_order_id uuid REFERENCES public.orders(id),
  taker_order_id uuid REFERENCES public.orders(id),
  points DECIMAL NOT NULL,
  amount DECIMAL NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Set up Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read their own data" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Orders are readable by anyone" ON public.orders
  FOR SELECT USING (true);

CREATE POLICY "Users can create their own orders" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own orders" ON public.orders
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Trades are readable by anyone" ON public.trades
  FOR SELECT USING (true);`}
            </pre>
          </li>
          <li>In your Supabase dashboard, go to Project Settings → API to get your API keys</li>
          <li>Create a <code className="bg-gray-900 px-2 py-1 rounded">.env.local</code> file in the root of your project with:
            <pre className="bg-gray-900 p-3 rounded-md mt-2 overflow-x-auto text-sm">
              {`NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key`}
            </pre>
          </li>
          <li>Restart your Next.js development server</li>
        </ol>
        
        <div className="mt-4 p-3 bg-yellow-900/30 border border-yellow-700 rounded-md">
          <p className="text-yellow-300 text-sm">
            <strong>Note:</strong> Using the service role key in a client-side application is not recommended for production.
            In a real application, you would create secure server API endpoints to handle operations requiring elevated permissions.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SupabaseSetupGuide; 