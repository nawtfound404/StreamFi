"use client";
import { useState } from "react";
import { LoginForm } from "../../components/login-form";
import { auth } from "../../modules/auth";

export default function AuthPage() {
  const [email, setEmail] = useState("")
  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="min-h-screen w-screen grid place-items-center p-4">
        <div className="w-full max-w-md">
          <LoginForm className="" />
        </div>
      </div>
      <form
        className="sr-only"
        onSubmit={async (e) => {
          e.preventDefault();
          await auth.signIn({ email, password: "" });
        }}
      >
        <input aria-label="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </form>
    </div>
  );
}
