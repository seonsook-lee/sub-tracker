import { createClient } from "@supabase/supabase-js";

// 플랜 하나. 가격을 모르면 priceUsd 는 null 이고, 결제 달러는 직접 입력한다.
export type Plan = { name: string; priceUsd: number | null };

// DB가 아직 설정되지 않았거나 조회에 실패했을 때 쓰는 기본 목록.
export const FALLBACK_PLANS: Plan[] = [
  { name: "Claude Pro", priceUsd: 20 },
  { name: "Claude Max 5x", priceUsd: 100 },
  { name: "Claude Max 20x", priceUsd: 200 },
  { name: "ChatGPT Plus", priceUsd: 20 },
  { name: "ChatGPT Pro", priceUsd: 200 },
  { name: "GitHub Copilot Pro", priceUsd: 10 },
  { name: "Cursor Pro", priceUsd: 20 },
  { name: "Gemini (Google AI Pro)", priceUsd: 19.99 },
  { name: "Gemini (Google AI Ultra)", priceUsd: 249.99 },
  { name: "Perplexity Pro", priceUsd: 20 },
];

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// numeric 컬럼은 문자열로 올 수 있다. 숫자로 못 읽으면 가격 없음으로 둔다.
function toPrice(raw: unknown): number | null {
  const price = Number(raw);
  return raw === null || raw === "" || !Number.isFinite(price) || price <= 0
    ? null
    : price;
}

// 서버에서만 부른다. 실패해도 화면은 기본 목록으로 그대로 동작한다.
export async function getPlans(): Promise<Plan[]> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return FALLBACK_PLANS;

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase
    .from("plans")
    .select("name, price_usd")
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });

  if (error) {
    console.error("[plans] Supabase 조회 실패:", error.message);
    return FALLBACK_PLANS;
  }
  if (!data || data.length === 0) return FALLBACK_PLANS;

  return data.map((row) => ({
    name: row.name as string,
    priceUsd: toPrice(row.price_usd),
  }));
}
