import { useState, useEffect } from "react";
import { Loader2, Sparkles } from "lucide-react";

const SLIDES = [
  {
    image:
      "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=1965&auto=format&fit=crop",
    title: "The Gemini Core",
    story:
      "Deep within the neural networks of Gemini 3, trillions of parameters align to craft your unique coding journey. It dreams not of electric sheep, but of optimized algorithms and perfect syntax.",
  },
  {
    image:
      "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=2070&auto=format&fit=crop",
    title: "The Pythonic Jungle",
    story:
      "A realm where indentation defines reality. Here, brevity is the soul of wit, and semicolons are but ancient artifacts of a forgotten era. The Snake guides those who seek readability.",
  },
  {
    image:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=2070&auto=format&fit=crop",
    title: "The Compiler's Forge",
    story:
      "In the heat of the C++ foundry, memory is managed manually and performance is the only currency. Only the disciplined survive the segmentation faults to forge the fastest engines.",
  },
  {
    image:
      "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070&auto=format&fit=crop",
    title: "The Java Fortress",
    story:
      "Built on billions of devices, the Fortress stands eternal. Its Garbage Collectors work tirelessly in the shadows, ensuring order in a chaotic universe of objects and classes.",
  },
  {
    image:
      "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=2070&auto=format&fit=crop",
    title: "The Web Weaver",
    story:
      "Spinning the fabric of the digital DOM, the JavaScript spiders connect the world. Asynchronous threads weave together to create the interactive tapestry of the modern internet.",
  },
  {
    image:
      "https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?q=80&w=2088&auto=format&fit=crop",
    title: "The Git Timeline",
    story:
      "Across the multiverse of branches, realities diverge and merge. Commits mark the checkpoints of history, allowing the traveler to traverse time and undo the mistakes of the past.",
  },
  {
    image:
      "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop",
    title: "The Binary Rain",
    story:
      "In the Matrix of machine code, zeros and ones dance in a rhythmic cascade. This raw stream of data is the lifeblood of the digital age, translating human thought into silicon action.",
  },
  {
    image:
      "https://images.unsplash.com/photo-1639322537228-f710d846310a?q=80&w=2232&auto=format&fit=crop",
    title: "The Cloud Horizon",
    story:
      "Above the hardware lies the ethereal realm of the Cloud. Here, containerized vessels float in virtual clusters, scaling infinitely to meet the demands of a connected civilization.",
  },
  {
    image:
      "https://images.unsplash.com/photo-1509023464722-18d996393ca8?q=80&w=2070&auto=format&fit=crop",
    title: "The Quantum State",
    story:
      "Beyond the bit lies the Qubit, existing in a superposition of possibility. In this quantum realm, traditional logic dissolves, promising a future of computing power beyond imagination.",
  },
  {
    image:
      "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?q=80&w=2070&auto=format&fit=crop",
    title: "The Neural Synapse",
    story:
      "Modeled after the human mind, artificial neurons fire in the digital darkness. They learn, they adapt, and they evolve, bridging the gap between biological thought and silicon execution.",
  },
];

export default function LoadingScreen() {
  // Initialize with a random index so the experience is different every time
  const [currentIndex, setCurrentIndex] = useState(() =>
    Math.floor(Math.random() * SLIDES.length),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % SLIDES.length);
    }, 4000); // Change slide every 4 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black text-white flex flex-col overflow-hidden font-sans select-none">
      {/* Background Carousel */}
      {SLIDES.map((slide, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentIndex ? "opacity-100" : "opacity-0"}`}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10" />
          <img
            src={slide.image}
            alt={slide.title}
            className="w-full h-full object-cover animate-in fade-in zoom-in duration-[20s]"
            style={{
              transform: index === currentIndex ? "scale(1.1)" : "scale(1)",
            }}
          />
        </div>
      ))}

      {/* Content Overlay */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-8 md:p-12 flex flex-col md:flex-row items-end justify-between gap-8">
        {/* Story Text */}
        <div
          className="max-w-2xl animate-in slide-in-from-bottom-4 duration-700 fade-in fill-mode-forwards"
          key={currentIndex}
        >
          <div className="flex items-center gap-3 mb-2">
            <Sparkles size={18} className="text-blue-400 animate-pulse" />
            <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
              {SLIDES[currentIndex].title}
            </h2>
          </div>
          <div className="h-1 w-24 bg-blue-500 rounded-full mb-4"></div>
          <p className="text-lg md:text-xl text-neutral-300 font-medium leading-relaxed drop-shadow-lg">
            {SLIDES[currentIndex].story}
          </p>
        </div>

        {/* Loading Spinner & Status */}
        <div className="flex flex-col items-end gap-3 min-w-[200px]">
          <div className="flex items-center gap-3 bg-black/50 backdrop-blur-md px-6 py-3 rounded-full border border-white/10 shadow-2xl">
            <span className="text-sm font-bold tracking-widest uppercase text-neutral-400">
              Initializing
            </span>
            <Loader2 size={24} className="text-white animate-spin" />
          </div>

          {/* Slide Indicators */}
          <div className="flex gap-2 mt-2">
            {SLIDES.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentIndex ? "w-8 bg-white" : "w-2 bg-white/20"}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
