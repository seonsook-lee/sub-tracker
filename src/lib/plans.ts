import { createClient } from "@supabase/supabase-js";

// DB가 아직 설정되지 않았거나 조회에 실패했을 때 쓰는 기본 목록.
export const FALLBACK_PLANS = [
  "Claude Pro",
  "Claude Max 5x",
  "Claude Max 20x",
  "ChatGPT Plus",
  "ChatGPT Pro",
  "GitHub Copilot Pro",
  "Cursor Pro",
  "Gemini (Google AI Pro)",
  "Gemini (Google AI Ultra)",
  "Perplexity Pro",
];

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// 서버에서만 부른다. 실패해도 화면은 기본 목록으로 그대로 동작한다.
export async function getPlans(): Promise<string[]> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return FALLBACK_PLANS;

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase
    .from("plans")
    .select("name")
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });

  if (error) {
    console.error("[plans] Supabase 조회 실패:", error.message);
    return FALLBACK_PLANS;
  }
  if (!data || data.length === 0) return FALLBACK_PLANS;

  return data.map((row) => row.name as string);
}
