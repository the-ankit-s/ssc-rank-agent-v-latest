import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import HeroSection from "@/components/home/hero-section";
import StatsSection from "@/components/home/stats-section";
import FeaturesSection from "@/components/home/features-section";
import RecentExamsSection from "@/components/home/recent-exams-section";
import HowItWorksSection from "@/components/home/how-it-works-section";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <HeroSection />
      <StatsSection />
      <FeaturesSection />
      <RecentExamsSection />
      <HowItWorksSection />
      <Footer />
    </>
  );
}
