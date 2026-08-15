"use client";

import React, { useState } from "react";
import Link from "next/link";
import { FaPlay, FaEye, FaLayerGroup, FaArrowLeft } from "react-icons/fa";
import { Spotlight } from "@/components/ui/Spotlight";
import PortfolioLoader from "@/components/portfolio/PortfolioLoader";
import BlogListingLoading from "@/app/blog/loading";
import ArticleDetailLoading from "@/app/blog/[slug]/loading";

export default function LoaderPreviewPage() {
  const [activeTab, setActiveTab] = useState<"bar" | "root" | "blog" | "article">("bar");
  const [isSimulatingBar, setIsSimulatingBar] = useState(false);
  const [barProgress, setBarProgress] = useState(0);

  const simulateProgressBar = () => {
    setIsSimulatingBar(true);
    setBarProgress(0);

    requestAnimationFrame(() => {
      setBarProgress(75);
    });

    setTimeout(() => {
      setBarProgress(100);
      setTimeout(() => {
        setIsSimulatingBar(false);
        setBarProgress(0);
      }, 300);
    }, 1800);
  };

  return (
    <main className="relative bg-black-100 min-h-screen text-white flex flex-col items-center justify-between p-6 sm:p-10 overflow-x-hidden">
      {/* Background Lighting & Grid */}
      <Spotlight
        className="-top-40 -left-10 md:-left-32 md:-top-20 h-screen"
        fill="white"
      />
      <Spotlight
        className="h-[80vh] w-[50vw] top-10 left-full"
        fill="purple"
      />
      <div className="h-screen w-full dark:bg-black-100 bg-white dark:bg-grid-white/[0.03] bg-grid-black-100/[0.2] absolute top-0 left-0 flex items-center justify-center pointer-events-none -z-10">
        <div className="absolute pointer-events-none inset-0 flex items-center justify-center dark:bg-black-100 bg-white [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />
      </div>

      {/* Simulated Live Top Progress Bar */}
      {isSimulatingBar && (
        <div className="fixed top-0 left-0 right-0 z-[99999] pointer-events-none overflow-hidden">
          <div
            className="absolute top-0 left-0 h-[8px] sm:h-[10px] bg-[#CBACF9]/30 blur-[5px] rounded-r-full pointer-events-none"
            style={{
              width: `${barProgress}%`,
              transition:
                barProgress === 100
                  ? "width 250ms cubic-bezier(0.4, 0, 0.2, 1)"
                  : "width 1800ms cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          />
          <div
            className="h-[3.5px] sm:h-[4px] bg-gradient-to-r from-[#A855F7] via-[#CBACF9] to-[#F3E8FF] rounded-r-full pointer-events-none"
            style={{
              width: `${barProgress}%`,
              transition:
                barProgress === 100
                  ? "width 250ms cubic-bezier(0.4, 0, 0.2, 1)"
                  : "width 1800ms cubic-bezier(0.16, 1, 0.3, 1)",
              boxShadow:
                "0 0 16px #CBACF9, 0 0 8px #CBACF9, 0 0 28px rgba(203, 172, 249, 0.85)",
            }}
          />
        </div>
      )}

      {/* Control Header */}
      <div className="max-w-5xl w-full mx-auto relative z-20 space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple/10 border border-purple/30 text-purple text-xs font-semibold uppercase tracking-wider mb-2">
              Interactive Test Suite
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              Loader & Skeleton <span className="text-purple">Live Preview</span>
            </h1>
            <p className="text-xs sm:text-sm text-white-200 mt-1">
              Test all portfolio loading states and route transition feedback in real-time.
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#10132E] border border-white/[0.08] text-xs font-medium text-white hover:border-purple/50 transition-colors"
          >
            <FaArrowLeft className="w-3 h-3 text-purple" />
            Back to Home
          </Link>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => setActiveTab("bar")}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer flex items-center gap-2 border ${
              activeTab === "bar"
                ? "bg-[#161A31] text-purple border-purple shadow-[0_0_15px_rgba(203,172,249,0.3)]"
                : "bg-[#10132E] text-white-200 border-white/[0.08] hover:text-white"
            }`}
          >
            <FaPlay className="w-3 h-3" />
            Top Route Progress Bar
          </button>

          <button
            onClick={() => setActiveTab("root")}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer flex items-center gap-2 border ${
              activeTab === "root"
                ? "bg-[#161A31] text-purple border-purple shadow-[0_0_15px_rgba(203,172,249,0.3)]"
                : "bg-[#10132E] text-white-200 border-white/[0.08] hover:text-white"
            }`}
          >
            <FaEye className="w-3 h-3" />
            Root Glassmorphic Orb Loader
          </button>

          <button
            onClick={() => setActiveTab("blog")}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer flex items-center gap-2 border ${
              activeTab === "blog"
                ? "bg-[#161A31] text-purple border-purple shadow-[0_0_15px_rgba(203,172,249,0.3)]"
                : "bg-[#10132E] text-white-200 border-white/[0.08] hover:text-white"
            }`}
          >
            <FaLayerGroup className="w-3 h-3" />
            Blog Listing Skeleton
          </button>

          <button
            onClick={() => setActiveTab("article")}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer flex items-center gap-2 border ${
              activeTab === "article"
                ? "bg-[#161A31] text-purple border-purple shadow-[0_0_15px_rgba(203,172,249,0.3)]"
                : "bg-[#10132E] text-white-200 border-white/[0.08] hover:text-white"
            }`}
          >
            <FaLayerGroup className="w-3 h-3" />
            Article Detail Skeleton
          </button>
        </div>

        {/* Tab 1: Top Bar Interactive Playground */}
        {activeTab === "bar" && (
          <div
            style={{
              background: "rgb(4,7,29)",
              backgroundColor:
                "linear-gradient(90deg, rgba(4,7,29,1) 0%, rgba(12,14,35,1) 100%)",
            }}
            className="p-8 sm:p-12 rounded-3xl border border-white/[0.1] shadow-input text-center space-y-6"
          >
            <h3 className="text-xl sm:text-2xl font-bold text-white">
              Dynamic Top Route Progress Bar
            </h3>
            <p className="text-xs sm:text-sm text-white-200 max-w-xl mx-auto leading-relaxed">
              This broad neon light beam activates at the very top of your viewport whenever you click any internal navigation link (&quot;Blog&quot;, an article, back to home).
            </p>

            <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={simulateProgressBar}
                disabled={isSimulatingBar}
                className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-purple text-black font-bold text-sm hover:scale-105 transition-all shadow-[0_0_25px_rgba(203,172,249,0.4)] disabled:opacity-50 cursor-pointer"
              >
                <FaPlay className="w-3.5 h-3.5" />
                {isSimulatingBar ? "Simulating Navigation..." : "Trigger Top Bar Animation"}
              </button>

              <Link
                href="/blog"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-[#10132E] border border-purple/40 text-purple font-semibold text-sm hover:bg-purple hover:text-black transition-all"
              >
                Test Real Route $\rightarrow$ /blog
              </Link>
            </div>

            <div className="pt-8 border-t border-white/[0.08] grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <p className="text-xs font-semibold text-purple mb-1">Cubic-Bezier Easing</p>
                <p className="text-[11px] text-white-200">
                  Continuous single physical glide with zero stuttering or timer steps.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <p className="text-xs font-semibold text-purple mb-1">Radiant Leading Tip</p>
                <p className="text-[11px] text-white-200">
                  Bright moving white beam head flare with neon ambient purple halo.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <p className="text-xs font-semibold text-purple mb-1">Instant Interception</p>
                <p className="text-[11px] text-white-200">
                  Captures navigation clicks immediately before server response.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tab 2: Root Glassmorphic Orb Loader */}
      {activeTab === "root" && (
        <div
          style={{
            background: "rgb(4,7,29)",
            backgroundColor:
              "linear-gradient(90deg, rgba(4,7,29,1) 0%, rgba(12,14,35,1) 100%)",
          }}
          className="w-full my-8 rounded-3xl border border-white/[0.1] shadow-input relative flex items-center justify-center min-h-[380px]"
        >
          <PortfolioLoader embedded />
        </div>
      )}

      {/* Tab 3: Blog Listing Skeleton */}
      {activeTab === "blog" && (
        <div className="w-full my-8 rounded-3xl overflow-hidden border border-white/[0.1] relative">
          <BlogListingLoading />
        </div>
      )}

      {/* Tab 4: Article Detail Skeleton */}
      {activeTab === "article" && (
        <div className="w-full my-8 rounded-3xl overflow-hidden border border-white/[0.1] relative">
          <ArticleDetailLoading />
        </div>
      )}
    </main>
  );
}
