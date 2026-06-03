"use client";
import { signIn } from "next-auth/react";

export default function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="bg-card border border-border rounded-xl w-full max-w-sm p-8 text-center">
        <div className="text-4xl mb-3">🦊</div>
        <div className="text-xl font-medium text-foreground">AEON Dial</div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-8">Operating System</div>
        <button
          onClick={() => signIn("zitadel", { callbackUrl: "/dashboard" })}
          className="w-full rounded-lg border border-accent bg-accent/10 text-accent font-medium py-3 text-sm hover:bg-accent hover:text-background transition-colors"
        >
          Sign in with ZITADEL
        </button>
        <div className="text-[10px] text-muted-foreground/60 mt-6">Google · Microsoft · GitHub via ZITADEL</div>
      </div>
    </div>
  );
}
