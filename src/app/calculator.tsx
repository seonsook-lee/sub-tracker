"use client";

import {
  RefObject,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import styles from "./page.module.scss";

// 회사에서 매달 지원해 주는 AI 구독료 한도 (달러).
const SUPPORT_USD = 40;
const STORAGE_KEY = "ai-subscription-calc";

// 플랜 목록은 DB에서 받아 온다(src/lib/plans.ts). 목록에 없으면 '직접 입력'.
const CUSTOM_PLAN = "__custom__";

type Stored = { plan: string; usd: string };
const EMPTY_STORED: Stored = { plan: "", usd: "" };
const storedListeners = new Set<() => void>();
let storedCache: Stored | null = null;

function readStored(): Stored {
  if (storedCache) return storedCache;
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    storedCache = {
      plan: typeof saved.plan === "string" ? saved.plan : "",
      usd: typeof saved.usd === "string" ? saved.usd : "",
    };
  } catch {
    storedCache = EMPTY_STORED;
  }
  return storedCache;
}

function writeStored(patch: Partial<Stored>) {
  storedCache = { ...readStored(), ...patch };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storedCache));
  } catch {}
  storedListeners.forEach((listener) => listener());
}

function subscribeStored(listener: () => void) {
  storedListeners.add(listener);
  return () => storedListeners.delete(listener);
}

function useStored() {
  return useSyncExternalStore(subscribeStored, readStored, () => EMPTY_STORED);
}

function formatKrw(amount: number) {
  return Math.floor(amount).toLocaleString("ko-KR");
}

const MAX_USD_DIGITS = 6;
const MAX_KRW_DIGITS = 9;

// 숫자만 남기고 자릿수를 자른다. 소수는 점 하나, 둘째 자리까지.
function cleanNumber(raw: string, decimals: boolean, maxDigits: number) {
  const digitsOnly = raw
    .replace(/,/g, "")
    .replace(decimals ? /[^\d.]/g : /\D/g, "");
  if (!decimals) return digitsOnly.slice(0, maxDigits);
  const [whole, ...rest] = digitsOnly.split(".");
  const fraction = rest.join("").slice(0, 2);
  const trimmedWhole = whole.slice(0, maxDigits);
  return rest.length > 0 ? `${trimmedWhole}.${fraction}` : trimmedWhole;
}

function formatNumber(raw: string) {
  const n = Number(raw);
  if (!raw || !Number.isFinite(n)) return raw;
  return n.toLocaleString("ko-KR", { maximumFractionDigits: 2 });
}

// 숫자 입력. 편집 중에는 원본을, 포커스가 빠지면 콤마를 넣어 보여준다.
function NumberField({
  prefix,
  value,
  onChange,
  onEnter,
  decimals,
  maxDigits,
  inputRef,
}: {
  prefix: string;
  value: string;
  onChange: (raw: string) => void;
  onEnter: () => void;
  decimals: boolean;
  maxDigits: number;
  inputRef?: RefObject<HTMLInputElement | null>;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <span className={styles.control}>
      <span className={styles.prefix}>{prefix}</span>
      <input
        ref={inputRef}
        type="text"
        inputMode={decimals ? "decimal" : "numeric"}
        enterKeyHint="next"
        placeholder="0"
        value={editing ? value : formatNumber(value)}
        onFocus={() => setEditing(true)}
        onBlur={() => setEditing(false)}
        onChange={(e) => {
          onChange(cleanNumber(e.target.value, decimals, maxDigits));
        }}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          e.preventDefault();
          onEnter();
        }}
      />
    </span>
  );
}

type CopyLabel = "사유" | "금액";
type CopyStep = "idle" | "next" | "done";
type CopyState = { label: CopyLabel; ok: boolean } | null;

function ChevronIcon() {
  return (
    <svg
      className={styles.chevron}
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      aria-hidden="true"
    >
      <path d="M2.5 4.5L6 8l3.5-3.5" />
    </svg>
  );
}

function CopyIcon({ done }: { done: boolean }) {
  return (
    <svg
      className={styles.copyIcon}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      aria-hidden="true"
    >
      {done ? (
        <path d="M3.5 8.5l3 3 6-6" strokeWidth="1.5" />
      ) : (
        <>
          <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
          <path d="M10.5 5.5v-2a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2" />
        </>
      )}
    </svg>
  );
}

function CopyRow({
  label,
  value,
  step,
  flash,
  onCopy,
  buttonRef,
}: {
  label: CopyLabel;
  value: string;
  step: CopyStep;
  flash: boolean;
  onCopy: (state: NonNullable<CopyState>) => void;
  buttonRef: RefObject<HTMLButtonElement | null>;
}) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      onCopy({ label, ok: true });
    } catch {
      onCopy({ label, ok: false });
    }
  }

  const stepClass =
    step === "next" ? styles.next : step === "done" ? styles.done : "";

  return (
    <button
      ref={buttonRef}
      type="button"
      className={`${styles.row} ${styles.copyRow} ${stepClass} ${flash ? styles.copied : ""}`}
      onClick={copy}
      aria-label={`${label} 복사`}
    >
      <span className={styles.label}>{label}</span>
      <span className={styles.copyValue}>{value}</span>
      <CopyIcon done={step === "done"} />
    </button>
  );
}

export function Calculator({ plans }: { plans: string[] }) {
  const { plan, usd } = useStored();
  const [krw, setKrw] = useState("");
  const [copyState, setCopyState] = useState<CopyState>(null);
  const [doneFor, setDoneFor] = useState<{
    key: string;
    labels: CopyLabel[];
  }>({ key: "", labels: [] });
  const [manualPlan, setManualPlan] = useState(false);
  const planRef = useRef<HTMLSelectElement>(null);
  const planTextRef = useRef<HTMLInputElement>(null);
  const usdRef = useRef<HTMLInputElement>(null);
  const krwRef = useRef<HTMLInputElement>(null);
  const reasonRef = useRef<HTMLButtonElement>(null);
  const amountRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const saved = readStored();
    (saved.plan && saved.usd ? krwRef : planRef).current?.focus();
  }, []);

  useEffect(() => {
    if (!copyState) return;
    const timer = setTimeout(() => setCopyState(null), 1500);
    return () => clearTimeout(timer);
  }, [copyState]);

  // 저장된 값이 목록에 없으면(예전 자유 입력) 직접 입력 칸을 그대로 보여준다.
  const custom = manualPlan || (plan !== "" && !plans.includes(plan));

  const usdAmount = Number(usd);
  const krwAmount = Number(krw);
  const ready = usdAmount > 0 && krwAmount > 0;
  const rate = ready ? krwAmount / usdAmount : null;
  // 지원은 최대 $40까지. 한도 이하로 결제했다면 청구액 전액이 그대로 지원된다.
  const overLimit = usdAmount > SUPPORT_USD;
  const claimedUsd = Math.min(usdAmount, SUPPORT_USD);
  const rawResult =
    rate === null ? null : overLimit ? rate * SUPPORT_USD : krwAmount;
  const result = rawResult === null ? null : Math.floor(rawResult);

  // 회사 정산 폼의 '사유' 칸에 붙여넣을 문장. 순서: 플랜명, 지원 한도, 환산 결과.
  const reason = [
    plan.trim() || null,
    `$${formatNumber(String(claimedUsd))}`,
    result !== null ? `₩${formatKrw(result)}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  // 입력이 바뀌어 복사할 값이 달라지면 완료 표시는 무효가 된다.
  const copyKey = `${reason}|${result}`;
  const done = doneFor.key === copyKey ? doneFor.labels : [];
  const next: CopyLabel | null = !done.includes("사유")
    ? "사유"
    : !done.includes("금액")
      ? "금액"
      : null;

  function stepOf(label: CopyLabel): CopyStep {
    if (done.includes(label)) return "done";
    if (next === label) return "next";
    return "idle";
  }

  function handleCopy(state: NonNullable<CopyState>) {
    setCopyState(state);
    if (!state.ok) return;
    setDoneFor((prev) => {
      const labels = prev.key === copyKey ? prev.labels : [];
      return {
        key: copyKey,
        labels: [
          ...labels.filter((label) => label !== state.label),
          state.label,
        ],
      };
    });
    if (state.label === "사유" && !done.includes("금액")) {
      amountRef.current?.focus();
    }
  }

  const lastDone = done[done.length - 1];
  const hint =
    copyState && !copyState.ok
      ? "복사하지 못했습니다. 직접 선택해서 복사해 주세요."
      : lastDone
        ? `${lastDone} 복사됨`
        : "줄을 누르면 복사됩니다.";
  const hintClass =
    copyState && !copyState.ok
      ? styles.noteFail
      : copyState?.ok
        ? styles.noteOk
        : "";

  return (
    <div className={styles.calc}>
      <section className={styles.inputs}>
        <label className={styles.row}>
          <span className={styles.label}>플랜</span>
          <span className={styles.control}>
            <select
              ref={planRef}
              className={custom || plan ? "" : styles.selectEmpty}
              value={custom ? CUSTOM_PLAN : plan}
              onChange={(e) => {
                const value = e.target.value;
                if (value === CUSTOM_PLAN) {
                  setManualPlan(true);
                  writeStored({ plan: "" });
                  return;
                }
                setManualPlan(false);
                writeStored({ plan: value });
              }}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                (custom ? planTextRef : usdRef).current?.focus();
              }}
            >
              <option value="" disabled>
                선택
              </option>
              {plans.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
              <option value={CUSTOM_PLAN}>직접 입력</option>
            </select>
            <ChevronIcon />
          </span>
        </label>

        {custom && (
          <label className={styles.row}>
            <span className={styles.label} />
            <span className={styles.control}>
              <input
                ref={planTextRef}
                type="text"
                enterKeyHint="next"
                placeholder="플랜 이름"
                aria-label="플랜 이름"
                value={plan}
                onChange={(e) => writeStored({ plan: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  usdRef.current?.focus();
                }}
              />
            </span>
          </label>
        )}

        <label className={styles.row}>
          <span className={styles.label}>결제 달러</span>
          <NumberField
            prefix="$"
            value={usd}
            onChange={(raw) => writeStored({ usd: raw })}
            onEnter={() => krwRef.current?.focus()}
            decimals
            maxDigits={MAX_USD_DIGITS}
            inputRef={usdRef}
          />
        </label>

        <label className={styles.row}>
          <span className={styles.label}>카드 청구액</span>
          <NumberField
            prefix="₩"
            value={krw}
            onChange={setKrw}
            onEnter={() => {
              if (ready) reasonRef.current?.focus();
            }}
            decimals={false}
            maxDigits={MAX_KRW_DIGITS}
            inputRef={krwRef}
          />
        </label>
      </section>

      {rate !== null && rawResult !== null && result !== null && (
        <section className={styles.resultSection} aria-live="polite">
          <div className={`${styles.row} ${styles.resultRow}`}>
            <span className={styles.label}>
              {overLimit ? `$${SUPPORT_USD} 환산` : "청구액 전액"}
            </span>
            <span className={styles.resultBlock}>
              <span
                key={result}
                className={`${styles.result} ${styles.resultEnter}`}
              >
                <span className={styles.currency}>₩</span>
                {formatKrw(result)}
              </span>
              <span className={styles.note}>
                {overLimit ? (
                  <>
                    <span className={styles.nowrap}>
                      ₩{formatKrw(krwAmount)} ÷ ${formatNumber(usd)} × $
                      {SUPPORT_USD}
                    </span>{" "}
                    <span className={styles.nowrap}>
                      = ₩
                      {rawResult.toLocaleString("ko-KR", {
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </>
                ) : (
                  <span className={styles.nowrap}>
                    결제 ${formatNumber(usd)} ≤ 지원 한도 ${SUPPORT_USD}
                  </span>
                )}
              </span>
              <span className={styles.rate}>
                적용 환율{" "}
                {rate.toLocaleString("ko-KR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
                원/$
              </span>
            </span>
          </div>
        </section>
      )}

      {result !== null && (
        <section className={styles.copySection}>
          <CopyRow
            label="사유"
            value={reason}
            step={stepOf("사유")}
            flash={copyState?.ok === true && copyState.label === "사유"}
            onCopy={handleCopy}
            buttonRef={reasonRef}
          />
          <CopyRow
            label="금액"
            value={String(result)}
            step={stepOf("금액")}
            flash={copyState?.ok === true && copyState.label === "금액"}
            onCopy={handleCopy}
            buttonRef={amountRef}
          />
          <div className={styles.row}>
            <span className={styles.label} />
            <span className={`${styles.note} ${hintClass}`} aria-live="polite">
              {hint}
            </span>
          </div>
        </section>
      )}
    </div>
  );
}
