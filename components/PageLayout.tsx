import Head from "next/head";
import { ReactNode } from "react";
import Link from "next/link";
import useAuthStore from "@/store/useAuthStore";

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
};

const PageLayout = ({ title, subtitle, children, footer }: Props) => {
  const { user } = useAuthStore();

  return (
    <>
      <Head>
        <title>{title} · WarpDrive Face Auth</title>
        <meta name="theme-color" content="#17B14A" />
      </Head>
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <header className="border-b border-white/10 backdrop-blur bg-slate-900/70">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-white">
                WarpDrive Face Auth
              </h1>
              <p className="text-sm text-white/70">{subtitle}</p>
            </div>
            <nav className="flex items-center gap-4 text-sm text-white/80">
              <Link href="/dashboard">Dashboard</Link>
              <Link href="/biometric-setup">Enroll</Link>
              <Link href="/biometric-login">Face Login</Link>
              <Link href="/admin">Admin</Link>
              {user ? (
                <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-300">
                  {user.displayName ?? user.email}
                </span>
              ) : null}
            </nav>
          </div>
        </header>
        <main className="mx-auto flex max-w-6xl flex-1 flex-col px-4 py-10">
          {children}
        </main>
        <footer className="border-t border-white/10 bg-slate-900/60">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 text-xs text-white/50">
            <span>WarpDrive · Biometric Auth Demo</span>
            {footer}
          </div>
        </footer>
      </div>
    </>
  );
};

export default PageLayout;

