"use client";

import { useState } from "react";
import Image from "next/image";
import DashboardPreview from "./components/DashboardPreview";
import Dashboard from "./components/Dashboard";
import PositionsPage from "./components/PositionsPage";
import Overview from "./components/Overview"; // Import the Overview component
import CallToAction from "./components/CallToAction"; // Import the CallToAction component

import logo from "../public/icon0.svg";

export default function Page() {
  // Fix the useState declaration
  const [currentView, setCurrentView] = useState<
    "home" | "dashboard" | "positions"
  >("home");

  const handlePreviewClick = () => {
    setCurrentView("dashboard");
  };

  const handleBackClick = () => {
    setCurrentView("home");
  };

  const handleGoToAppClick = () => {
    setCurrentView("dashboard");
  };

  const handlePositionsClick = () => {
    setCurrentView("positions");
  };

  const handleBackToDashboardClick = () => {
    setCurrentView("dashboard");
  };

  return (
    <div>
      {currentView === "home" && (
        <div className="min-h-screen bg-zinc-900 text-gray-50 relative">
          {/* Simple background with minimal styling */}
          <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-900 to-black"></div>

          {/* Header */}
          <header className="relative z-10 pt-10 px-8">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center border border-zinc-700 p-0">
                  <Image src={logo} alt="logo" />
                </div>
                <span className="text-xl font-bold text-gray-50">
                  Bound Market
                </span>
              </div>
              <div>
                <button
                  onClick={handleGoToAppClick}
                  className="bg-zinc-800 px-5 py-2 rounded-md text-white font-medium hover:opacity-90 hover:cursor-pointer transition-opacity border border-zinc-700 flex items-center gap-2"
                >
                  Go to app
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </header>

          {/* Main content */}
          <main className="relative z-10 px-8 flex flex-col items-center justify-center text-center">
            <div className="max-w-4xl mx-auto relative pt-20">
              {/* Dashboard preview with static positioning */}
              <div className="mx-auto mb-6">
                <DashboardPreview onPreviewClick={handlePreviewClick} />
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 text-gray-50">
                Decentralized Binary Markets for Predicting Volatility in
                Digital Assets
              </h1>

              <p className="text-lg sm:text-xl text-zinc-300 mb-10">
                Predict market movements and profit from your insights. Powered
                by Solana for lightning-fast, low-cost predictions.
              </p>

              {/* Add Overview section */}
              <section className="mt-20 mb-20">
                {/* Render the Overview component */}
                <div className="w-full">
                  <Overview />
                </div>
              </section>
            </div>

            {/* Add Call To Action section - moved outside max-w-4xl container */}
            <section className="mt-20 mb-20 w-full max-w-7xl mx-auto">
              <CallToAction onGoToDashboard={handleGoToAppClick} />
            </section>
          </main>
        </div>
      )}

      {currentView === "dashboard" && (
        <Dashboard
          onBackClick={handleBackClick}
          onPositionsClick={handlePositionsClick}
        />
      )}

      {currentView === "positions" && (
        <PositionsPage onBackClick={handleBackToDashboardClick} />
      )}
    </div>
  );
}