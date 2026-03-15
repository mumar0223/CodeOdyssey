"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useSession } from "@/lib/auth";
import { Loader2, ShieldAlert, Swords } from "lucide-react";
import ArenaIde from "@/components/ArenaIde";
import { OrganizerDashboard } from "@/components/arena/OrganizerDashboard";

export default function TournamentPlay() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const matchId = params.matchId as string;
  const playToken = searchParams.get("token");

  const { data: sessionData, isPending } = useSession();
  const publicId = sessionData?.user?.id;

  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const details = useQuery(
    api.matches.getMatchDetails,
    publicId
      ? {
          match_id: matchId as any,
          public_id: publicId,
          play_token: playToken || undefined,
        }
      : "skip", // Wait for auth
  );

  // Knockout-specific queries
  const isKnockout = details?.match?.mode === "Knockout";
  // @ts-ignore
  const knockoutQuestion = useQuery(
    api.knockout?.getKnockoutQuestion,
    isKnockout && publicId
      ? { match_id: matchId as any, public_id: publicId }
      : "skip",
  );
  // @ts-ignore
  const myBracket = useQuery(
    api.knockout?.getMyCurrentBracket,
    isKnockout && publicId
      ? { match_id: matchId as any, public_id: publicId }
      : "skip",
  );
  // @ts-ignore
  const checkAndFinishBracket = useMutation(api.knockout?.checkAndFinishBracket || (() => {}));

  // Authentication and Security Check
  useEffect(() => {
    if (isPending) return;
    if (!sessionData?.user) {
      router.push("/login");
      return;
    }

    if (!playToken) {
      setHasError(true);
      setErrorMessage("Access Denied: Missing play token.");
      return;
    }
  }, [sessionData, isPending, router, playToken]);

  // Handle Backend Verification Failures
  useEffect(() => {
    if (details === null) {
      setHasError(true);
      setErrorMessage("Match not found or accessible.");
      return;
    }
  }, [details]);

  // Handle Invalid Match States
  useEffect(() => {
    if (!details?.match) return;

    if (details.match.status === "waiting") {
      router.replace(`/lobby/${matchId}?token=${details.match.lobby_token}`);
      return;
    }

    if (
      details.match.status === "finished" ||
      details.match.status === "cancelled"
    ) {
      router.replace(`/match/${matchId}/home`);
      return;
    }
  }, [details?.match, router, matchId]);

  if (hasError) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
        <div className="bg-neutral-900 border border-red-500/30 rounded-3xl p-10 max-w-md w-full text-center shadow-2xl">
          <div className="w-20 h-20 mx-auto rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-6">
            <ShieldAlert size={40} className="text-red-400" />
          </div>
          <h2 className="text-2xl font-black text-white mb-3">Access Denied</h2>
          <p className="text-neutral-400 mb-6">{errorMessage}</p>
          <button
            onClick={() => router.push("/arena")}
            className="px-6 py-3 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-xl transition"
          >
            Return to Arena
          </button>
        </div>
      </div>
    );
  }

  if (!details || isPending) {
    return (
      <div className="h-screen w-full bg-black flex items-center justify-center">
        <Loader2 className="animate-spin text-pink-500" size={48} />
      </div>
    );
  }

  const { match, players } = details;

  // Find if current user is an organizer
  const isOrg = publicId
    ? match.organizer_ids?.includes(publicId as any) || false
    : false;

  const handleIdeComplete = async () => {
    if (isKnockout) {
      try {
        // @ts-ignore
        await checkAndFinishBracket({
          match_id: matchId as any,
          public_id: publicId as string,
        });
      } catch (e) {
        console.error("Auto-finish bracket error:", e);
      }
    }
    router.push(`/match/${matchId}/home`);
  };

  // If the user is an organizer, show the Dashboard instead of the IDE
  if (isOrg) {
    return <OrganizerDashboard matchId={matchId} publicId={publicId!} />;
  }

  // Determine question for ArenaIde
  const ideQuestion = isKnockout && knockoutQuestion
    ? knockoutQuestion
    : details.match.question_ids
      ? { _id: details.match.question_ids[0] }
      : null;

  // Competitor gets the coding IDE
  return (
    <div className="h-screen w-full bg-black relative">
      {/* Knockout Opponent Banner */}
      {isKnockout && myBracket && (
        <div className="absolute top-0 left-0 right-0 z-50 bg-gradient-to-r from-red-500/10 via-pink-500/10 to-purple-500/10 border-b border-red-500/20 px-4 py-2 flex items-center justify-between text-sm">
          <div className="flex items-center gap-3">
            <Swords size={16} className="text-pink-500" />
            <span className="font-bold text-neutral-300">Round {myBracket.round}</span>
            <span className="text-neutral-500">vs</span>
            <span className="font-bold text-red-400">{myBracket.opponent_name}</span>
          </div>
          {myBracket.opponentProgress && (
            <span className={`font-bold text-xs px-2 py-0.5 rounded ${
              myBracket.opponentProgress.result === "Accepted"
                ? "bg-green-500/20 text-green-400"
                : "bg-yellow-500/20 text-yellow-400"
            }`}>
              Opponent: {myBracket.opponentProgress.result === "Accepted"
                ? "✅ Solved"
                : `${myBracket.opponentProgress.testcases_passed} TC passed`}
            </span>
          )}
        </div>
      )}
      <div className={isKnockout && myBracket ? "pt-10 h-full" : "h-full"}>
        <ArenaIde
          matchId={matchId}
          publicId={publicId}
          question={ideQuestion}
          onComplete={handleIdeComplete}
          onBack={() => router.push("/arena")}
          sessionData={sessionData}
          isTournament={true}
        />
      </div>
    </div>
  );
}
