'use client';

import React from 'react';
import { RiskProvider } from './RiskProvider';

export default function QueryProvider({ children }) {
  return (
    <RiskProvider>
      {children}
    </RiskProvider>
  );
}

