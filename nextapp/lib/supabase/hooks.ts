'use client';

import { useMemo } from 'react';
import { createClient } from './client';

/**
 * Hook to safely get the Supabase client in React components.
 * Uses useMemo to prevent creating multiple instances during renders.
 */
export function useSupabaseClient() {
  return useMemo(() => createClient(), []);
}
