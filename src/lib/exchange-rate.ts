import { todayInSeoul } from "./card";

// 한국수출입은행 환율 Open API. tts = 전신환매도율(송금 보낼 때),
// 카드사가 해외 결제를 원화로 바꿀 때 쓰는 그 환율이다.
const API = "https://oapi.koreaexim.go.kr/site/program/financial/exchangeJSON";
const API_KEY = process.env.KOREAEXIM_API_KEY;

const MAX_SCAN_DAYS = 12;

// settled: 거래일 당일 고시를 찾은 값. false면 그 날 고시가 없어(주말·공휴일·고시 전)
// 직전 영업일 것으로 대신했다는 뜻이다.
export type ExchangeRate = { date: string; tts: number; settled: boolean };
export type RateResult =
  | { rate: ExchangeRate }
  | { rate: null; reason: "disabled" | "none" | "error" };

// 한 번 고시된 환율은 바뀌지 않는다. 성공한 날짜만 기억해 둔다.
const cache = new Map<string, number>();

function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// 그 날짜의 USD 전신환매도율. 고시가 없으면(주말·공휴일·오전 11시 이전) null.
async function fetchTts(date: string): Promise<number | null> {
  const cached = cache.get(date);
  if (cached) return cached;

  const url = `${API}?authkey=${API_KEY}&searchdate=${date.replaceAll("-", "")}&data=AP01`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const rows: unknown = await res.json();
  if (!Array.isArray(rows)) throw new Error("예상과 다른 응답");
  // 고시 전이면 빈 배열, 인증키가 잘못되면 result 3, 일일 한도 초과면 4.
  if (rows.length === 0) return null;
  const failed = rows.find((row) => row?.result !== 1);
  if (failed) throw new Error(`result ${failed.result}`);

  const usd = rows.find((row) => row?.cur_unit === "USD");
  const tts = Number(String(usd?.tts ?? "").replaceAll(",", ""));
  if (!Number.isFinite(tts) || tts <= 0) return null;

  cache.set(date, tts);
  return tts;
}

// 거래일 고시. 없으면(주말·공휴일·오전 11시 이전) 직전 영업일 것으로 대신한다.
async function findRate(from: string): Promise<ExchangeRate | null> {
  let day = from;

  for (let i = 0; i < MAX_SCAN_DAYS; i += 1) {
    const tts = await fetchTts(day);
    if (tts) return { date: day, tts, settled: day === from };
    day = addDays(day, -1);
  }
  return null;
}

// 거래일을 받아 참고값 계산에 쓸 환율을 돌려준다.
export async function getExchangeRate(date: string): Promise<RateResult> {
  if (!API_KEY) return { rate: null, reason: "disabled" };

  const today = todayInSeoul();

  try {
    const rate = await findRate(date > today ? today : date);
    return rate ? { rate } : { rate: null, reason: "none" };
  } catch (error) {
    console.error("[rate] 수출입은행 조회 실패:", error);
    return { rate: null, reason: "error" };
  }
}
