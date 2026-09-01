import { Link } from "wouter";
import { ArrowLeft, ArrowRight } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const heroAsset = (name: string) => `${BASE}/hero/${name}`;
const photoAsset = (name: string) => `${BASE}/photos/${name}`;

const MARKETS = [
  {
    id: "grain",
    name: "Grain",
    href: "/grain/",
    photo: photoAsset("hero-soybean-farmer.jpg"),
    cutout: heroAsset("tokenharvest-grain.png"),
    color: "hsl(40 80% 40%)", // Golden accent
  },
  {
    id: "coffee",
    name: "Coffee",
    href: "/coffee/",
    photo: photoAsset("cafe-imports-coffee-storage.jpg"),
    cutout: heroAsset("tokenharvest-coffee.png"),
    color: "hsl(20 50% 30%)", // Coffee accent
  },
  {
    id: "tea",
    name: "Tea",
    href: "/tea/",
    photo: photoAsset("tea-plantation.jpg"),
    cutout: heroAsset("tokenharvest-tea.png"),
    color: "hsl(120 40% 30%)", // Tea accent
  }
];

export default function GetStarted() {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col font-sans relative overflow-hidden">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-50 p-6 md:p-8 flex items-center justify-between pointer-events-none">
        <Link href="/" className="pointer-events-auto inline-flex items-center gap-2 text-white hover:text-white/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary rounded-sm">
          <ArrowLeft size={20} />
          <span className="font-medium tracking-wide text-sm uppercase">Back</span>
        </Link>
        <div className="pointer-events-auto">
          <span className="tokenharvest-wordmark text-2xl md:text-3xl text-white">TokenHarvest</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col lg:flex-row w-full">
        {MARKETS.map((market, index) => (
          <a
            key={market.id}
            href={market.href}
            className="group relative flex-1 flex flex-col items-center justify-center min-h-[33dvh] lg:min-h-0 border-b lg:border-b-0 lg:border-r border-white/10 last:border-0 overflow-hidden focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white focus-visible:ring-inset"
            aria-label={`Enter ${market.name} Market`}
          >
            {/* Background Image */}
            <div 
              className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-1000 ease-out motion-safe:group-hover:scale-105 motion-safe:group-focus-visible:scale-105"
              style={{ backgroundImage: `url(${market.photo})` }}
              aria-hidden="true"
            />
            
            {/* Overlay */}
            <div 
              className="absolute inset-0 transition-opacity duration-700 ease-out group-hover:opacity-80 group-focus-visible:opacity-80"
              style={{ 
                background: `linear-gradient(to bottom, hsl(180 62% 10% / 0.8), hsl(180 62% 6% / 0.95))` 
              }}
              aria-hidden="true"
            />
            <div 
              className="absolute inset-0 opacity-0 transition-opacity duration-700 ease-out group-hover:opacity-40 group-focus-visible:opacity-40 mix-blend-multiply"
              style={{ backgroundColor: market.color }}
              aria-hidden="true"
            />

            {/* Cutout Image (floating) */}
            <div 
              className="absolute inset-0 flex items-center justify-center opacity-0 scale-90 translate-y-8 transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:opacity-20 group-hover:scale-100 group-hover:translate-y-0 group-focus-visible:opacity-20 group-focus-visible:scale-100 group-focus-visible:translate-y-0 pointer-events-none"
              aria-hidden="true"
            >
              <img 
                src={market.cutout} 
                alt="" 
                className="w-3/4 max-w-[300px] md:max-w-[400px] object-contain drop-shadow-2xl motion-safe:animate-pulse-slow"
              />
            </div>

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center justify-center p-8 text-center pointer-events-none transform transition-transform duration-500 ease-out motion-safe:group-hover:-translate-y-4 motion-safe:group-focus-visible:-translate-y-4">
              <div className="text-white/60 text-xs md:text-sm font-bold tracking-[0.2em] uppercase mb-4 transition-colors duration-500 group-hover:text-white group-focus-visible:text-white">
                Market {String(index + 1).padStart(2, '0')}
              </div>
              
              <h2 className="tokenharvest-wordmark text-6xl md:text-8xl lg:text-9xl text-white drop-shadow-lg mb-2">
                {market.name}
              </h2>

              <div className="overflow-hidden mt-2 h-0 group-hover:h-8 group-focus-visible:h-8 transition-all duration-500 ease-out">
                <div className="flex items-center gap-2 text-white/90 font-medium tracking-wide uppercase text-sm transform translate-y-full group-hover:translate-y-0 group-focus-visible:translate-y-0 transition-transform duration-500 delay-100">
                  Enter Market <ArrowRight size={16} />
                </div>
              </div>
            </div>
          </a>
        ))}
      </main>
      
      {/* Decorative Custom Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulse-slow {
          0%, 100% { transform: translateY(0) rotate(0); }
          50% { transform: translateY(-10px) rotate(2deg); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 6s ease-in-out infinite;
        }
      `}} />
    </div>
  );
}
