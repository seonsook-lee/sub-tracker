// 카드 청구액 참고값 계산.
//
// 회사에 제출하는 기준은 승인 시점 금액(카드이용내역/매출전표)이다. 이 값은 카드사가
// 승인 순간의 내부 환율로 환산한 것이라, 하루 한 번 고시되는 공개 환율로는 정확히
// 재현되지 않는다. 2026-07·08·09 매출전표 3건으로 맞춰도 배수가 0.998~1.006으로
// 흔들려 ±0.4%가 남는다. 그래서 이건 참고값이고, 제출 전에 매출전표 금액으로
// 덮어써야 한다. 화면에도 참고값이라고 적는다.
export const APPROVAL_MULTIPLIER = 1.0023;
export const APPROVAL_ERROR = 0.004;

// 참고: 확정 청구액(이용대금명세서)은 공개 고시로 원 단위까지 재현된다.
//   결제액 × (1 + 0.01 브랜드수수료 + 0.0018 해외서비스수수료)
//         × 매입일(거래일 +2영업일) 고시 × 0.999566
// 2026-07·08 명세서 두 건 모두 오차 0원이었다. 제출 기준이 확정액으로 바뀌면 이 식을 쓴다.

export function estimateKrw(usd: number, tts: number) {
  return Math.round(usd * APPROVAL_MULTIPLIER * tts);
}

// 환율 고시는 한국 시간 기준이라 날짜도 서울 기준으로 센다.
export function todayInSeoul() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(
    new Date(),
  );
}
