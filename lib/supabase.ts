import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          created_at: string;
        };
      };
      projects: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          domain: string;
          created_at: string;
        };
      };
      keywords: {
        Row: {
          id: string;
          project_id: string;
          keyword: string;
          created_at: string;
        };
      };
      engines: {
        Row: {
          id: number;
          name: string;
        };
      };
      checks: {
        Row: {
          id: string;
          project_id: string;
          keyword_id: string;
          engine_id: number;
          position: number | null;
          presence: boolean;
          answer_snippet: string | null;
          citations_count: number | null;
          observed_urls: string | null;
          timestamp: string;
          created_at: string;
        };
      };
    };
  };
};