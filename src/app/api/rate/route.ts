import { getExchangeRate } from "@/lib/exchange-rate";

// GET /api/rate?date=YYYY-MM-DD → 그 날 적용할 전신환매도율.
export async function GET(request: Request) {
  const date = new URL(request.url).searchParams.get("date") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ rate: null, reason: "error" }, { status: 400 });
  }

  const result = await getExchangeRate(date);
  // 매입일 고시를 찾았으면 그 답은 다시 바뀌지 않으니 하루 동안 묻지 않는다.
  // 매입 전이라 최신 고시로 대신한 답은 내일이면 달라지므로 캐시하지 않는다.
  return Response.json(result, {
    headers: {
      "cache-control": result.rate?.settled
        ? "private, max-age=86400"
        : "no-store",
    },
  });
}
