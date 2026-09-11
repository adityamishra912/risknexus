'use client';

import { useState, useEffect } from 'react';

export function useOptimization() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  return { data, loading };
}

export default useOptimization;
