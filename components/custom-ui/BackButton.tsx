"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function BackButton() {
  const router = useRouter();
  
  return (
    <button 
      onClick={() => router.back()} 
      className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 hover:-translate-x-1 text-white rounded-lg font-bold transition-all border border-neutral-700 shadow-lg mb-6 w-fit"
    >
      <ArrowLeft size={18} /> Back
    </button>
  );
}
