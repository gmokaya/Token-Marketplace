import { useLocation } from "wouter";
import { AuthBenefitCarousel } from "@/components/AuthBenefitCarousel";
import type { BenefitSlide } from "@/components/AuthBenefitCarousel";
import { Sprout, ShoppingBag, Truck } from "lucide-react";
import { Link } from "wouter";
import grainSignInImage from "@assets/pexels-mwesigwa-joel-455894964-38668656_1788340914738.jpg";

type SignUpPageProps = {
  marketName?: string;
  marketDescription?: string;
  backgroundSrc?: string;
  shellClass?: string;
  benefitEyebrow?: string;
  benefitSlides?: BenefitSlide[];
};

export default function SignUpPage({
  marketName = "Grain Marketplace",
  marketDescription = "certified agricultural commodities",
  backgroundSrc,
  shellClass = "market-auth-shell--grain",
  benefitEyebrow = "Grain sourcing desk · 03",
  benefitSlides = [
    {
      eyebrow: "Certified storage",
      title: "Know the lot\nbefore it moves.",
      description: "See grade, volume, warehouse status, and a clear route from stored grain to delivery.",
    },
    {
      eyebrow: "Finance-ready trade",
      title: "Turn stored grain\ninto working capital.",
      description: "Connect warehouse receipts with forward contracts and trade finance built for the real supply chain.",
    },
    {
      eyebrow: "Market visibility",
      title: "Buy with a record,\nnot a promise.",
      description: "Compare verified East African supply through one sourcing desk made for serious grain buyers.",
    },
  ],
}: SignUpPageProps) {
  const [, setLocation] = useLocation();
  const bp = import.meta.env.BASE_URL.replace(/\/$/, "");

  const handleRoleSelect = (role: string) => {
    localStorage.setItem("onboardingRole", role.toLowerCase());
    setLocation("/sign-in?mode=sign-up");
  };

  return (
    <div className={`market-auth-shell ${shellClass}`}>
      <img
        src={backgroundSrc ?? grainSignInImage}
        alt=""
        className="market-auth-background"
        fetchPriority="high"
      />
      <div className="market-auth-overlay" />

      <header className="market-auth-header">
        <Link href="/">
          <span className="tokenharvest-wordmark market-auth-wordmark">TokenHarvest</span>
        </Link>
      </header>

      <main className="market-auth-main">
        <AuthBenefitCarousel
          eyebrow={benefitEyebrow}
          accentColor="#d7e0e8"
          slides={benefitSlides}
        />

        <section className="market-auth-form-wrap">
          <div className="market-auth-form-card market-auth-form-card--signup">
            <div className="market-auth-form-heading">
              <p className="market-auth-form-kicker">Join the TokenHarvest network</p>
              <h1>Select your role</h1>
              <p>TokenHarvest connects farmers, traders, and buyers across East Africa — built to make trade fairer for everyone in the chain.</p>
            </div>

            <div className="flex flex-col gap-4 mt-8">
              <button
                onClick={() => handleRoleSelect("Producer")}
                className="flex items-start gap-4 p-4 text-left border border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/40 transition-all group"
                data-testid="button-role-producer"
              >
                <div className="p-3 bg-white/10 rounded-full group-hover:bg-white/20 transition-colors">
                  <Sprout className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg mb-1">Producer</h3>
                  <p className="text-white/60 text-sm">Offer {marketDescription}, reach new markets, and get paid securely.</p>
                </div>
              </button>

              <button
                onClick={() => handleRoleSelect("Trader")}
                className="flex items-start gap-4 p-4 text-left border border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/40 transition-all group"
                data-testid="button-role-trader"
              >
                <div className="p-3 bg-white/10 rounded-full group-hover:bg-white/20 transition-colors">
                  <Truck className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg mb-1">Trader</h3>
                  <p className="text-white/60 text-sm">Connect supply with demand and manage trade through {marketName}.</p>
                </div>
              </button>

              <button
                onClick={() => handleRoleSelect("Buyer")}
                className="flex items-start gap-4 p-4 text-left border border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/40 transition-all group"
                data-testid="button-role-buyer"
              >
                <div className="p-3 bg-white/10 rounded-full group-hover:bg-white/20 transition-colors">
                  <ShoppingBag className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg mb-1">Buyer</h3>
                  <p className="text-white/60 text-sm">Source verified {marketDescription} with clear origin and quality records.</p>
                </div>
              </button>
            </div>
            
            <p className="market-auth-form-switch mt-8">
              Already have an account? <Link href="/sign-in">Sign in</Link>
            </p>
          </div>
        </section>
      </main>

      <footer className="market-auth-footer">
        <Link href="/">Back to home</Link>
      </footer>
    </div>
  );
}
