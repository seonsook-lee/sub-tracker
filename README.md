This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## 플랜 목록 (Supabase)

셀렉트박스의 플랜 목록은 Supabase의 `plans` 테이블에서 읽는다.

1. Supabase 프로젝트를 만들고 SQL Editor에서 `supabase/schema.sql`을 실행한다 (테이블 + 읽기 정책 + 초기 10개 플랜).
2. `.env.example`을 `.env.local`로 복사하고 Project Settings > API의 URL과 anon(publishable) 키를 채운다.
3. 이후 플랜 추가·수정·삭제는 Table Editor에서 하면 된다. `sort_order` 오름차순으로 표시되고, 화면에는 최대 5분 뒤 반영된다 (`src/app/page.tsx`의 `revalidate`).

환경변수가 없거나 조회에 실패하면 `src/lib/plans.ts`의 기본 목록으로 동작한다.

`dev`/`build` 스크립트의 `NODE_OPTIONS=--use-system-ca`는 회사 네트워크의 TLS 검사 프록시 때문이다. macOS 키체인의 루트 인증서를 Node가 신뢰하게 해서 Supabase 요청이 `SELF_SIGNED_CERT_IN_CHAIN`으로 실패하지 않게 한다. 프록시가 없는 환경에서는 있어도 무해하다 (Node 22.15+/23.8+).

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
