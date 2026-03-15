"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ShoppingCart, Unlock, Check, CircleDollarSign, Loader2, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth";

export default function StorePage() {
  const router = useRouter();

  const { data: sessionData, isPending } = useSession();
  const publicId = sessionData?.user?.id || null;

  useEffect(() => {
    if (!isPending && !sessionData?.user) {
      router.push("/login");
    }
  }, [isPending, sessionData, router]);

  const user = useQuery(api.users?.getUserProfile || (() => null), { public_id: publicId || "" });

  const cosmetics = [
    { id: "badge_slayer", name: "Slayer Badge", price: 1000, type: "badge", desc: "Show your dominance in Arena fights." },
    { id: "badge_thinker", name: "Deep Thinker", price: 1200, type: "badge", desc: "A badge for the big brains." },
    { id: "frame_neon", name: "Neon Avatar Frame", price: 2500, type: "frame", desc: "Glowing pink and blue aura for your profile." },
    { id: "theme_monokai_plus", name: "Monokai Plus Theme", price: 5000, type: "theme", desc: "Unlock premium IDE colors." },
  ];

  const handlePurchase = (id: string, price: number) => {
    if (!user) return;
    if (user.coins < price) {
      alert("Not enough coins!");
      return;
    }
    alert("Purchase successful! (UI mock)");
    // Real implementation would have a buyCosmetic mutation
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-12 relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-yellow-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="max-w-6xl mx-auto flex justify-between items-center mb-12 relative z-10">
        <div>
          <h1 className="text-4xl md:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-amber-600 flex items-center gap-4">
            <ShoppingCart size={40} className="text-yellow-500" />
            Cosmetics Store
          </h1>
          <p className="text-neutral-400 mt-2 text-lg">Spend your hard-earned arena coins on premium customizations.</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="bg-yellow-500/10 border border-yellow-500/30 px-6 py-3 rounded-full flex items-center gap-3">
            <CircleDollarSign size={24} className="text-yellow-400" />
            <span className="text-xl font-black text-yellow-400">
              {user ? user.coins : <Loader2 className="animate-spin inline" size={18} />}
            </span>
          </div>
          <button 
            onClick={() => router.push('/')}
            className="px-6 py-3 border border-neutral-700 hover:border-neutral-500 hover:bg-neutral-800 rounded-full font-bold transition-all text-neutral-300"
          >
            Back Home
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
        {cosmetics.map(i => (
          <div key={i.id} className="bg-neutral-900/80 border border-neutral-800 rounded-3xl p-6 flex flex-col group hover:border-yellow-500/50 transition-all">
            <div className="h-32 bg-black/50 rounded-2xl mb-6 border border-neutral-800 flex items-center justify-center text-4xl group-hover:scale-105 transition-transform">
              <Sparkles className="text-neutral-700 group-hover:text-yellow-500 transition-colors" size={48} />
            </div>
            <h3 className="text-xl font-bold mb-2">{i.name}</h3>
            <p className="text-sm text-neutral-400 mb-6 flex-1">{i.desc}</p>
            <button 
              onClick={() => handlePurchase(i.id, i.price)}
              className="w-full py-3 bg-neutral-800 hover:bg-yellow-500 text-white hover:text-black font-bold rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <CircleDollarSign size={18} /> {i.price} Coins
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
