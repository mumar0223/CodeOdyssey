"use client";

import { useState } from "react";
import { signUp } from "@/lib/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Code, User, Mail, KeyRound, Loader2, ArrowRight } from "lucide-react";
import AnimatedBackground from "@/components/effects/AnimatedBackground";
import { AnimatedGlowTextBadge } from "@/components/custom-ui/animated-glow-badge";
import { BackButton } from "@/components/custom-ui/BackButton";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const ensureUser = useMutation(api.users.ensureUser);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error } = await signUp.email({
      email,
      password,
      name,
    });

    if (error) {
      setError(error.message || "Failed to create account");
      setLoading(false);
    } else {
      // Create app user record for this new Better Auth user
      if (data?.user) {
        await ensureUser({ public_id: data.user.id, name: data.user.name });
      }
      router.push("/");
    }
  };

  return (
    <div className="min-h-screen text-white font-sans selection:bg-white/20 overflow-x-hidden relative flex flex-col justify-center items-center px-4 py-12">
      <AnimatedBackground />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-[100] p-6 flex justify-between items-center max-w-7xl mx-auto">
        <Link href="/" className="flex items-center gap-2 text-2xl font-black tracking-tighter select-none">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <Code size={20} className="text-black" />
          </div>
          CodeOdyssey
        </Link>
      </nav>

      {/* Signup Box */}
      <div className="w-full max-w-md flex flex-col gap-4 relative z-10 animate-in zoom-in-95 duration-500">
        <BackButton />
        <div className="p-8 rounded-3xl bg-black/40 backdrop-blur-xl border border-white/10 shadow-2xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 text-neutral-400 text-xs font-mono tracking-widest mb-6 backdrop-blur">
            <AnimatedGlowTextBadge containerClassName="rounded-full" className="flex items-center space-x-2">
              <span>Join the Arena</span>
            </AnimatedGlowTextBadge>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white drop-shadow-lg">
            Create Account
          </h1>
          <p className="text-neutral-400 mt-2 text-base">Start your developer journey today.</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-5">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-sm font-medium text-neutral-300 ml-1">Full Name</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                <User size={18} />
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all font-mono"
                placeholder="Ada Lovelace"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-neutral-300 ml-1">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                <Mail size={18} />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all font-mono"
                placeholder="developer@example.com"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-neutral-300 ml-1">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                <KeyRound size={18} />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all font-mono"
                placeholder="••••••••"
                minLength={8}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-white text-black font-bold rounded-xl flex justify-center items-center gap-2 hover:bg-neutral-200 transition-all focus:outline-none focus:ring-4 focus:ring-white/20 disabled:opacity-70 disabled:cursor-not-allowed mt-4 group"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : "Create Account"}
            {!loading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
          </button>
        </form>

        <p className="mt-8 text-center text-neutral-400 text-sm">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-400 hover:text-blue-300 transition-colors font-medium hover:underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </div>
    </div>
    </div>
  );
}
