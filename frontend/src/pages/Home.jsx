import PublicNavbar from "../components/layout/PublicNavbar";
import Footer from "../components/layout/Footer";

import Hero from "../components/home/Hero";
import Features from "../components/home/Features";
import HowItWorks from "../components/home/HowItWorks";
import TemplateShowcase from "../components/home/TemplateShowcase";
import FinalCTA from "../components/home/FinalCTA";

import "./Home.css";

function Home() {
  return (
    <div className="home-page">

      <PublicNavbar />

      <main>

        <Hero />

        <Features />

        <HowItWorks />

        <TemplateShowcase />

        <FinalCTA />

      </main>

      <Footer />

    </div>
  );
}

export default Home;