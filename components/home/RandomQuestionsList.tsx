import { useQuery } from "convex/react";
import { Code2, Lock, Unlock, PlayCircle } from "lucide-react";
// @ts-ignore
import { api } from "@/convex/_generated/api";

export function RandomQuestionsList() {
  // @ts-ignore
  const questions = useQuery(api.questions?.getRandomQuestions || (() => []));

  const handleQuestionClick = (locked: boolean) => {
    if (locked) {
      alert("This question is locked! Please login to unlock premium features and harder questions.");
    } else {
      alert("Opening question IDE...");
    }
  };

  return (
    <div className="w-full max-w-7xl mt-12 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-400">
      <div className="flex items-center gap-3 mb-6">
        <Code2 className="text-blue-400" size={28} />
        <h2 className="text-3xl font-black tracking-tight text-white drop-shadow-lg">
          Featured Challenges
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {questions === undefined ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-white/5 border border-white/10 animate-pulse"></div>
          ))
        ) : questions.length === 0 ? (
          <div className="col-span-full py-12 text-center text-neutral-400 bg-white/5 rounded-2xl border border-white/10">
            No challenges generated yet.
          </div>
        ) : (
          questions.map((q: any) => (
            <div
              key={q._id}
              onClick={() => handleQuestionClick(q.locked)}
              className="group cursor-pointer bg-white/5 backdrop-blur-md rounded-2xl p-5 border border-white/10 hover:bg-white/10 hover:border-blue-500/30 transition-all duration-300 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${q.difficulty === 'Easy' ? 'bg-green-500/10 border-green-500/20 text-green-400' : q.difficulty === 'Medium' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
                  {q.locked ? <Lock size={20} /> : <Unlock size={20} />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">
                    {q.title}
                  </h3>
                  <div className="flex gap-2 mt-1">
                    <span className="text-xs text-neutral-400">{q.topic}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className={`text-xs font-bold px-2 py-1 rounded ${q.difficulty === 'Easy' ? 'text-green-400 bg-green-500/10' : q.difficulty === 'Medium' ? 'text-yellow-400 bg-yellow-500/10' : 'text-red-400 bg-red-500/10'}`}>
                  {q.difficulty}
                </span>
                <PlayCircle className="text-neutral-500 group-hover:text-blue-400 transition-colors" size={24} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
