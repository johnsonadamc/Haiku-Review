import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { THREAD_TYPES } from '@/lib/seed-data';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  let posts: Array<{id: string | number; place?: string; city?: string; line_1?: string; line_2?: string; line_3?: string; lines?: string[]; themes?: string[]}> = [];
  let placeName = '';

  try {
    const body = await req.json();
    posts = body.posts || [];
    placeName = body.placeName || '';
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  if (!posts || !Array.isArray(posts) || posts.length === 0) {
    return NextResponse.json({ error: 'No posts provided' }, { status: 400 });
  }

  const threadType = THREAD_TYPES[Math.floor(Math.random() * THREAD_TYPES.length)];
  const n = Math.min(posts.length, 6);
  const data = posts.map(p => ({
    id: p.id,
    place: p.place || '',
    city: p.city || '',
    haiku: p.line_1 ? `${p.line_1} / ${p.line_2} / ${p.line_3}` : (p.lines || []).join(' / '),
    themes: p.themes || [],
  }));

  try {
    const prompt = `Curate a poetic journey through these haikus connected by "${threadType}". Start near "${placeName || 'any'}". Data: ${JSON.stringify(data)}. Return ${n} IDs ordered by this theme. For each after the first, write a 5-8 word poetic bridge. JSON only: {"type":"${threadType}","seq":[ids...],"conn":["","bridge",...]} IDs: [${data.map(x => JSON.stringify(x.id)).join(',')}]. Exactly ${n} IDs, exactly ${n} conn strings, first always "".`;

    const anthropicCall = client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      system: 'You are a JSON API. Respond with ONLY valid JSON. No markdown, no explanation, no backticks.',
      messages: [{ role: 'user', content: prompt }],
    });

    const timeoutPromise = new Promise<null>(resolve => setTimeout(() => resolve(null), 2000));
    const result = await Promise.race([anthropicCall, timeoutPromise]);

    if (!result) throw new Error('timeout');

    const txt = (result.content[0].type === 'text' ? result.content[0].text : '')
      .replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '').trim();
    const parsed = JSON.parse(txt);
    if (!parsed.seq || !Array.isArray(parsed.seq)) throw new Error('invalid response');

    return NextResponse.json({ type: parsed.type || threadType, seq: parsed.seq, conn: parsed.conn || [] });
  } catch {
    const shuffled = [...posts].sort(() => Math.random() - 0.5).slice(0, n);
    const bridges = ['the thread continues', 'another voice, same sky', 'silence answered', 'the mood deepens', 'worlds apart, same ache'];
    return NextResponse.json({
      type: threadType,
      seq: shuffled.map(p => p.id),
      conn: shuffled.map((_, i) => i === 0 ? '' : bridges[i - 1] || ''),
    });
  }
}
