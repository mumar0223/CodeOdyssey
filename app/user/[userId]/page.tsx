"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
// @ts-ignore
import { api } from "@/convex/_generated/api";
import { ActivityHeatmap } from "@/components/profile/ActivityHeatmap";
import {
  Edit2,
  Shield,
  Code2,
  Target,
  Trophy,
  Swords,
  Home,
  Sparkles,
  Upload,
  Image as ImageIcon,
  X,
  Loader2,
} from "lucide-react";
import AnimatedBackground from "@/components/effects/AnimatedBackground";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "@/lib/auth";
import { SkillRadar } from "@/components/profile/SkillRadar";
import { BackButton } from "@/components/custom-ui/BackButton";
import { useUploadThing } from "@/lib/uploadthing";


// Preset avatars using DiceBear API
const PRESET_AVATARS = [
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Coder1&backgroundColor=b6e3f4",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Hacker2&backgroundColor=c0aede",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Ninja3&backgroundColor=d1d4f9",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Wizard4&backgroundColor=ffd5dc",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Robot5&backgroundColor=ffdfbf",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Storm6&backgroundColor=c1f4c5",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Pixel7&backgroundColor=fde2e4",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Byte8&backgroundColor=e2ece9",
];

export default function ProfilePage() {
  const params = useParams();
  const userId = params.userId as string;
  const { data: sessionData } = useSession();
  const isMe = sessionData?.user?.id === userId;

  // @ts-ignore
  const userQuery = useQuery(api.users.getUserProfile, { public_id: userId });
  // @ts-ignore
  const updateUser = useMutation(api.users.updateUserProfile);
  // @ts-ignore
  const updateAvatar = useMutation(api.users.updateUserAvatar);


  // Queries that depend on the user's internal _id
  const userInternalId = userQuery?._id;
  // @ts-ignore
  const userStats = useQuery(api.users.getUserStats, userInternalId ? { user_id: userInternalId } : "skip");
  // @ts-ignore
  const userLanguages = useQuery(api.users.getUserLanguages, userInternalId ? { user_id: userInternalId } : "skip");
  // @ts-ignore
  const userActivity = useQuery(api.users.getUserActivity, userInternalId ? { user_id: userInternalId } : "skip");
  // @ts-ignore
  const hostedMatches = useQuery(api.matches.getHostedTournaments, { public_id: userId });


  const [isEditing, setIsEditing] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");

  // Avatar dialog state
  const [showAvatarDialog, setShowAvatarDialog] = useState(false);
  const [avatarTab, setAvatarTab] = useState<"ai" | "upload" | "preset">("preset");
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPreview, setGeneratedPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { startUpload } = useUploadThing("imageUploader");

  // Optimistic avatar state — applied instantly while upload happens in background
  const [optimisticAvatar, setOptimisticAvatar] = useState<string | null>(null);

  const currentAvatar = optimisticAvatar ||
    userQuery?.profile_picture ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`;

  const handleSave = async () => {
    if (usernameInput.trim()) {
      try {
        await updateUser({ public_id: userId, username: usernameInput });
      } catch (e) {
        console.error(e);
      }
    }
    setIsEditing(false);
  };

  // === Avatar Handlers ===

  const saveAvatarUrl = async (url: string) => {
    // Optimistic: update UI instantly
    setOptimisticAvatar(url);
    setShowAvatarDialog(false);

    // Background: persist to database
    try {
      await updateAvatar({ public_id: userId, avatar_url: url });
    } catch (e) {
      console.error("Failed to save avatar:", e);
      // Revert optimistic update on failure
      setOptimisticAvatar(null);
    }
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    setGeneratedPreview(null);
    try {
      const res = await fetch("/api/gemini/generate-avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt }),
      });
      const data = await res.json();
      if (data.imageData) {
        setGeneratedPreview(`data:${data.mimeType || "image/png"};base64,${data.imageData}`);
      }
    } catch (e) {
      console.error("AI avatar generation failed:", e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveGeneratedAvatar = async () => {
    if (!generatedPreview) return;
    setIsUploading(true);
    try {
      // Convert base64 to File and upload to UploadThing
      const response = await fetch(generatedPreview);
      const blob = await response.blob();
      const file = new File([blob], "ai-avatar.png", { type: "image/png" });
      
      const res = await startUpload([file]);
      if (res && res[0]) {
        await saveAvatarUrl(res[0].url);
      } else {
        throw new Error("Upload failed to return URL");
      }
    } catch (e) {
      console.error("Upload failed:", e);
      // Fallback: save the base64 URL directly
      await saveAvatarUrl(generatedPreview);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be smaller than 5MB");
      return;
    }

    setIsUploading(true);
    try {
      // Instant preview
      const previewUrl = URL.createObjectURL(file);
      setOptimisticAvatar(previewUrl);
      setShowAvatarDialog(false);

      // Upload to UploadThing
      const res = await startUpload([file]);
      if (res && res[0]) {
        await updateAvatar({ public_id: userId, avatar_url: res[0].url });
        setOptimisticAvatar(res[0].url);
      } else {
        throw new Error("Upload failed to return URL");
      }
    } catch (e) {
      console.error("Upload failed:", e);
      setOptimisticAvatar(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handlePresetSelect = (url: string) => {
    saveAvatarUrl(url);
  };

  // Loading state
  if (!userQuery && userQuery !== null) {
    return <div className="min-h-screen flex items-center justify-center text-white">Loading...</div>;
  }

  const user = userQuery;
  const stats = userStats ?? { wins: 0, losses: 0, accuracy: user?.accuracy ?? 0, solved_count: user?.solved_count ?? 0 };
  const languages = userLanguages ?? [];

  return (
    <div className="min-h-screen text-white font-sans selection:bg-white/20 relative">
      <AnimatedBackground />

      <nav className="fixed top-0 left-0 right-0 z-[100] p-6 flex justify-between items-center max-w-7xl mx-auto backdrop-blur-xl border-b border-white/5 bg-black/60">
        <Link href="/" className="flex items-center gap-2 text-2xl font-black tracking-tighter text-white hover:text-blue-400 transition">
          <Home size={24} />
          CodeOdyssey
        </Link>
      </nav>

      <main className="pt-32 pb-20 px-6 max-w-5xl mx-auto relative z-10">
        <BackButton />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Profile Card */}
          <div className="col-span-1 flex flex-col gap-8">
            <div className="bg-black/40 backdrop-blur-md rounded-2xl p-8 border border-white/10 text-center relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-[50px] pointer-events-none"></div>
              
              <div className="relative w-32 h-32 mx-auto mb-6">
                <img 
                  src={currentAvatar} 
                  alt="Profile" 
                  className="w-full h-full rounded-full border-4 border-white/10 object-cover"
                />
                {isMe && (
                  <button
                    onClick={() => setShowAvatarDialog(true)}
                    className="absolute bottom-0 right-0 w-10 h-10 bg-blue-500 hover:bg-blue-400 text-white rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110"
                  >
                    <Edit2 size={16} />
                  </button>
                )}
              </div>

              {isEditing ? (
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    defaultValue={user?.username}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    className="bg-white/10 border border-white/20 text-white rounded-lg px-3 py-1 w-full text-center"
                    autoFocus
                  />
                  <button onClick={handleSave} className="text-sm bg-blue-500 px-3 py-1 rounded-lg font-bold">Save</button>
                </div>
              ) : (
                <h1 className="text-3xl font-black text-white mb-1 flex items-center justify-center gap-2">
                  {user?.username}
                  {isMe && (
                    <button onClick={() => setIsEditing(true)} className="text-neutral-500 hover:text-white transition">
                      <Edit2 size={16} />
                    </button>
                  )}
                </h1>
              )}

              <div className="inline-flex items-center gap-1.5 px-3 py-1 mt-2 rounded bg-white/5 text-neutral-400 text-sm font-mono border border-white/10 truncate max-w-[200px]">
                ID: {user?.public_id}
              </div>

              <div className="mt-8 pt-8 border-t border-white/10 flex justify-between gap-4">
                <div className="text-center">
                  <div className="text-sm text-neutral-400 mb-1">Rank</div>
                  <div className="font-bold text-lg text-yellow-400 flex items-center justify-center gap-1">
                    <Shield size={16} /> {user?.rank}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-neutral-400 mb-1">Rating</div>
                  <div className="font-bold text-lg text-cyan-400">{user?.rating}</div>
                </div>
              </div>
            </div>

            <div className="bg-black/40 backdrop-blur-md rounded-2xl p-6 border border-white/10">
              <h3 className="text-xl font-bold text-white mb-4">Languages Used</h3>
              <div className="flex flex-wrap gap-2">
                {languages.length > 0 ? (
                  languages.map((lang: string) => (
                    <span key={lang} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-neutral-300">
                      {lang}
                    </span>
                  ))
                ) : (
                  <span className="text-neutral-500 text-sm italic">No submissions yet</span>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Stats & Activity */}
          <div className="col-span-1 lg:col-span-2 flex flex-col gap-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-black/40 backdrop-blur-md rounded-2xl p-6 border border-white/10 flex flex-col items-center justify-center text-center hover:border-blue-500/50 transition">
                <Code2 className="text-blue-400 mb-3" size={28} />
                <div className="text-3xl font-black text-white mb-1">{stats.solved_count}</div>
                <div className="text-xs text-neutral-400 uppercase tracking-widest font-bold">Solved</div>
              </div>
              <div className="bg-black/40 backdrop-blur-md rounded-2xl p-6 border border-white/10 flex flex-col items-center justify-center text-center hover:border-green-500/50 transition">
                <Target className="text-green-400 mb-3" size={28} />
                <div className="text-3xl font-black text-white mb-1">{stats.accuracy}%</div>
                <div className="text-xs text-neutral-400 uppercase tracking-widest font-bold">Accuracy</div>
              </div>
              <div className="bg-black/40 backdrop-blur-md rounded-2xl p-6 border border-white/10 flex flex-col items-center justify-center text-center hover:border-pink-500/50 transition">
                <Trophy className="text-pink-400 mb-3" size={28} />
                <div className="text-3xl font-black text-white mb-1">{stats.wins}</div>
                <div className="text-xs text-neutral-400 uppercase tracking-widest font-bold">Wins</div>
              </div>
              <div className="bg-black/40 backdrop-blur-md rounded-2xl p-6 border border-white/10 flex flex-col items-center justify-center text-center hover:border-red-500/50 transition">
                <Swords className="text-red-400 mb-3" size={28} />
                <div className="text-3xl font-black text-white mb-1">{stats.losses}</div>
                <div className="text-xs text-neutral-400 uppercase tracking-widest font-bold">Losses</div>
              </div>
            </div>

            <ActivityHeatmap submissions={userActivity ?? []} />

            {/* Skill Radar Chart */}
            <SkillRadar publicId={userId} />

            {/* Hosted Matches */}
            {hostedMatches && hostedMatches.length > 0 && (
              <div className="bg-black/40 backdrop-blur-md rounded-2xl p-6 border border-white/10 mt-4">
                <h3 className="text-xl font-bold flex items-center gap-2 text-white mb-4">
                  <Shield className="text-purple-400" /> Matches Hosted & Organized
                </h3>
                <div className="space-y-3">
                  {hostedMatches.map((m: any) => (
                    <div key={m._id} className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl flex items-center justify-between hover:border-purple-500/50 transition">
                      <div>
                        <div className="font-bold text-white flex items-center gap-2">
                          {m.tournament_name || m.arena_name || `${m.difficulty} Match`}
                          {m.is_tournament && <span className="text-[10px] bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded uppercase font-black">Tournament</span>}
                        </div>
                        <div className="text-xs text-neutral-400 mt-1 flex gap-3">
                          <span>{m.mode}</span>
                          <span className={`${m.status === 'running' ? 'text-green-400' : m.status === 'waiting' ? 'text-yellow-400' : 'text-neutral-500'} font-bold`}>
                            {m.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <Link href={m.status === 'waiting' ? `/lobby/${m._id}?token=${m.lobby_token}` : (m.status === 'running' ? `/play/${m._id}?token=${m.play_token}` : `/match/${m._id}/home`)}>
                        <button className="px-4 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 font-bold rounded-lg text-sm transition">
                          Dashboard
                        </button>
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Avatar Dialog Modal */}
      {showAvatarDialog && (
        <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-neutral-800">
              <h2 className="text-lg font-bold text-white">Change Avatar</h2>
              <button onClick={() => setShowAvatarDialog(false)} className="text-neutral-400 hover:text-white transition">
                <X size={20} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-neutral-800">
              <button
                onClick={() => setAvatarTab("preset")}
                className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${avatarTab === "preset" ? "border-b-2 border-blue-500 text-blue-400 bg-blue-500/5" : "text-neutral-400 hover:bg-neutral-800"}`}
              >
                <ImageIcon size={16} /> Presets
              </button>
              <button
                onClick={() => setAvatarTab("upload")}
                className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${avatarTab === "upload" ? "border-b-2 border-green-500 text-green-400 bg-green-500/5" : "text-neutral-400 hover:bg-neutral-800"}`}
              >
                <Upload size={16} /> Upload
              </button>
              <button
                onClick={() => setAvatarTab("ai")}
                className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${avatarTab === "ai" ? "border-b-2 border-purple-500 text-purple-400 bg-purple-500/5" : "text-neutral-400 hover:bg-neutral-800"}`}
              >
                <Sparkles size={16} /> AI Generate
              </button>
            </div>

            {/* Tab Content */}
            <div className="p-5 max-h-[400px] overflow-y-auto">
              {/* Preset Tab */}
              {avatarTab === "preset" && (
                <div className="grid grid-cols-4 gap-3">
                  {PRESET_AVATARS.map((url, idx) => (
                    <button
                      key={idx}
                      onClick={() => handlePresetSelect(url)}
                      className="rounded-xl border-2 border-transparent hover:border-blue-500 transition-all p-1 bg-white/5 hover:bg-white/10"
                    >
                      <img src={url} alt={`Preset ${idx + 1}`} className="w-full aspect-square rounded-lg" />
                    </button>
                  ))}
                </div>
              )}

              {/* Upload Tab */}
              {avatarTab === "upload" && (
                <div className="flex flex-col items-center gap-4 py-8">
                  <div className="w-24 h-24 rounded-full bg-white/5 border-2 border-dashed border-neutral-600 flex items-center justify-center">
                    <Upload className="text-neutral-500" size={32} />
                  </div>
                  <p className="text-neutral-400 text-sm text-center">Upload a photo from your computer<br /><span className="text-neutral-600">Max 5MB • JPG, PNG, GIF, WebP</span></p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="px-6 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold transition disabled:opacity-50 flex items-center gap-2"
                  >
                    {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                    {isUploading ? "Uploading..." : "Choose File"}
                  </button>
                </div>
              )}

              {/* AI Generate Tab */}
              {avatarTab === "ai" && (
                <div className="space-y-4">
                  <p className="text-neutral-400 text-sm">Describe your ideal avatar and AI will create it for you.</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="e.g. A cyberpunk hacker with neon goggles"
                      className="flex-1 bg-white/5 border border-neutral-700 text-white rounded-xl px-4 py-2.5 text-sm placeholder:text-neutral-600 focus:outline-none focus:border-purple-500 transition"
                      onKeyDown={(e) => e.key === "Enter" && handleAiGenerate()}
                    />
                    <button
                      onClick={handleAiGenerate}
                      disabled={isGenerating || !aiPrompt.trim()}
                      className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold transition disabled:opacity-50 flex items-center gap-2 shrink-0"
                    >
                      {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                      {isGenerating ? "Generating..." : "Generate"}
                    </button>
                  </div>

                  {/* Preview */}
                  {generatedPreview && (
                    <div className="flex flex-col items-center gap-3 pt-4 border-t border-neutral-800">
                      <img src={generatedPreview} alt="Generated Avatar" className="w-32 h-32 rounded-full border-4 border-purple-500/30 object-cover" />
                      <button
                        onClick={handleSaveGeneratedAvatar}
                        disabled={isUploading}
                        className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold transition disabled:opacity-50 flex items-center gap-2"
                      >
                        {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                        {isUploading ? "Saving..." : "Use This Avatar"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
