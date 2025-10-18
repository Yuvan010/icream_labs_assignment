import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
// Remove the user check or handle auth differently
  
  const body = await request.json();
  const { engine, keyword, position, presence, answer_snippet, citations_count, observed_urls, project_id, keyword_id, engine_id } = body;

  const { data, error } = await supabase
    .from('checks')
    .insert({
      project_id,
      keyword_id,
      engine_id,
      position,
      presence,
      answer_snippet,
      citations_count,
      observed_urls,
      timestamp: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}