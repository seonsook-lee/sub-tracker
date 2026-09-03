import { Calculator } from "./calculator";
import styles from "./page.module.scss";

export default function Home() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1>AI 구독료 환산</h1>
      </header>

      <Calculator />
    </main>
  );
}
