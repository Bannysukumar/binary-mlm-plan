'use client';

import { Toaster } from 'react-hot-toast';

export function ToasterProvider() {
  // @ts-expect-error - react-hot-toast type compatibility issue with React 18/Next.js 14
  return <Toaster position="top-right" />;
}
