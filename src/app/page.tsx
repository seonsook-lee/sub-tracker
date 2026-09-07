import { Calculator } from "./calculator";
import { getPlans } from "@/lib/plans";
import styles from "./page.module.scss";

// 플랜 목록은 자주 바뀌지 않는다. 5분마다 다시 읽는다.
export const revalidate = 300;

export default async function Home() {
  const plans = await getPlans();

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1>AI 구독료 환산</h1>
      </header>

      <Calculator plans={plans} />
    </main>
  );
}
