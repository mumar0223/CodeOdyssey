import { NextResponse } from "next/server";
import { ai, MODEL_SMART, cleanJsonString } from "@/app/api/gemini/shared";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || "");

/**
 * Arena Agent API Route
 * POST /api/arena-agent
 *
 * Triggers the AI to decide whether to host a public arena today.
 * Can be called by a cron job, scheduler, or manual trigger.
 */
export async function POST() {
  try {
    const today = new Date();
    const dateStr = today.toISOString().split("T")[0]; // e.g. "2026-03-11"
    const dayOfWeek = today.getDay(); // 0=Sun, 6=Sat
    const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][dayOfWeek];
    const month = today.getMonth() + 1;
    const day = today.getDate();

    // Check if already decided today
    // @ts-ignore
    const existingEvent = await convex.query(api.arenaAgent.getArenaEventByDate, {
      event_date: dateStr,
    });
    if (existingEvent) {
      return NextResponse.json({
        status: "skipped",
        reason: "Already decided for today",
        event: existingEvent,
      });
    }

    // Build the special dates context
    const specialDates: Record<string, string> = {
      "1-1": "New Year's Day",
      "2-14": "Valentine's Day",
      "3-14": "Pi Day 🥧",
      "5-4": "Star Wars Day (May the 4th)",
      "7-4": "Independence Day",
      "9-12": "Programmer's Day",
      "10-31": "Halloween",
      "12-25": "Christmas",
    };
    const specialKey = `${month}-${day}`;
    const isSpecialDate = specialDates[specialKey] || null;
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Ask Gemini if we should host
    const decisionPrompt = `You are the AI Arena Agent for CodeOdyssey, a competitive programming platform.

Today is ${dayName}, ${dateStr}.
${isSpecialDate ? `🎉 Special occasion: ${isSpecialDate}` : "No special occasion today."}
${isWeekend ? "It's the weekend — users are more active." : "It's a weekday."}

Should we host a public coding arena today?

Consider:
- Weekends are great for longer, harder challenges
- Special dates deserve themed events
- Weekdays can have short blitz rounds (5–10 min, 1–2 easy questions)
- Not every day needs an event — variety keeps things exciting
- Roughly 3–4 events per week is ideal

Respond with ONLY valid JSON:
{
  "host": true/false,
  "reasoning": "brief explanation",
  "arena_name": "name if hosting (themed for special dates)",
  "difficulty": "Easy" | "Medium" | "Hard",
  "number_of_questions": 2-6,
  "time_limit_minutes": 5-60,
  "max_players": 10-100,
  "languages": ["JavaScript", "Python", "Java", "C++"]
}`;

    const result = await ai.models.generateContent({
      model: MODEL_SMART,
      contents: decisionPrompt,
    });

    const rawText = result.text || "{}";
    const cleaned = cleanJsonString(rawText);
    let decision: any;
    try {
      decision = JSON.parse(cleaned);
    } catch {
      decision = { host: false, reasoning: "Failed to parse AI response" };
    }

    if (decision.host) {
      // Create the arena match
      // @ts-ignore
      const matchId = await convex.mutation(api.arenaAgent.createAIHostedArena, {
        arena_name: decision.arena_name || `${dayName} Arena`,
        difficulty: decision.difficulty || "Medium",
        number_of_questions: decision.number_of_questions || 3,
        time_limit: (decision.time_limit_minutes || 15) * 60,
        allowed_languages: decision.languages || ["JavaScript", "Python", "Java", "C++"],
        max_players: decision.max_players || 50,
        scheduled_for: Date.now() + 4 * 60 * 60 * 1000, // 4 hours from now
      });

      // Log the event
      // @ts-ignore
      await convex.mutation(api.arenaAgent.logArenaEvent, {
        event_date: dateStr,
        event_type: isSpecialDate ? "special_date" : isWeekend ? "weekend_event" : "weekday_blitz",
        decided_by_ai: true,
        ai_reasoning: decision.reasoning,
        match_id: matchId,
      });

      return NextResponse.json({
        status: "hosted",
        match_id: matchId,
        arena_name: decision.arena_name,
        reasoning: decision.reasoning,
      });
    } else {
      // Log the skip
      // @ts-ignore
      await convex.mutation(api.arenaAgent.logArenaEvent, {
        event_date: dateStr,
        event_type: "skipped",
        decided_by_ai: true,
        ai_reasoning: decision.reasoning,
      });

      return NextResponse.json({
        status: "skipped",
        reasoning: decision.reasoning,
      });
    }
  } catch (error: any) {
    console.error("Arena Agent Error:", error);
    return NextResponse.json(
      { error: error.message || "Arena Agent failed" },
      { status: 500 },
    );
  }
}
