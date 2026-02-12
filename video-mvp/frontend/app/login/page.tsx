'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  // Redirect to the new auth page
  useEffect(() => {
    router.push('/auth');
  }, [router]);

  return null; // Render nothing since we're redirecting
}