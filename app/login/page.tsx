"use client";
import { signIn } from "next-auth/react";

export default function Login() {
  return (
    <div className="min-h-screen aeon-grid flex items-center justify-center bg-bg px-6">
      <div className="card w-full max-w-sm p-8 text-center">
        <div className="text-4xl mb-3">🦊</div>
        <div className="text-xl font-medium text-ink">AEON Dial</div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted mb-8">Operating System</div>
        <button
          onClick={() => signIn("zitadel", { callbackUrl: "/dashboard" })}
          className="w-full rounded-lg border border-ember bg-emberdim text-ember font-medium py-3 text-sm hover:bg-ember hover:text-bg transition-colors"
        >
          Sign in with ZITADEL
        </button>
        <div className="text-[10px] text-dim mt-6">Google · Microsoft · GitHub via ZITADEL</div>
      </div>
    </div>
  );
}
