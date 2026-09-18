'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import Button from './Button';

export default function ErrorState({
  title = 'Backend Connection Error',
  message = 'Failed to fetch live data from RiskNexus API. Please ensure the backend server is running and the NEXT_PUBLIC_API_URL environment variable is configured correctly.',
  onRetry,
}) {
  return (
    <div className="p-6 rounded-xl bg-red-950/30 border border-red-800/60 backdrop-blur text-center flex flex-col items-center justify-center space-y-3 shadow-lg">
      <div className="w-10 h-10 rounded-full bg-red-950 border border-red-800/80 flex items-center justify-center text-red-400">
        <AlertTriangle className="w-5 h-5" />
      </div>
      <div>
        <h4 className="text-sm font-bold text-red-200">{title}</h4>
        <p className="text-xs text-red-300/80 mt-1 max-w-md mx-auto font-sans leading-relaxed">
          {message}
        </p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="gap-1.5 border-red-800 text-red-300 hover:bg-red-900/40">
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry Request</span>
        </Button>
      )}
    </div>
  );
}
