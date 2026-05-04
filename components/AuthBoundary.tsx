'use client';

import type { ReactNode } from 'react';
import { GoogleAuthProvider } from '@/components/GoogleAuthProvider';

export default function AuthBoundary({ children }: { children: ReactNode }) {
  return <GoogleAuthProvider>{children}</GoogleAuthProvider>;
}