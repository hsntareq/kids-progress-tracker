"use client";

import React from "react";

interface GraphicProps {
  className?: string;
  position?: "top" | "bottom";
  opacity?: string;
  accentColor?: string;
}

/**
 * Playful mountain summits with milestone flags and stars at the bottom of a card/section
 */
export function MountainSummitGraphic({
  className = "",
  position = "bottom",
  opacity = "opacity-25",
  accentColor = "#4f46e5",
}: GraphicProps) {
  const isTop = position === "top";

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute select-none overflow-hidden ${
        isTop ? "top-0 inset-x-0" : "bottom-0 inset-x-0"
      } ${opacity} ${className}`}
    >
      <svg
        viewBox="0 0 800 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        className={`w-full h-16 md:h-20 transition-all ${isTop ? "rotate-180" : ""}`}
      >
        <defs>
          <linearGradient id={`summitGrad-${accentColor.replace(/[^a-zA-Z0-9]/g, "")}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={accentColor} stopOpacity="0.35" />
            <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="flagGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>

        {/* Background Mountain */}
        <path
          d="M0 120 L160 55 L320 120 L520 40 L680 120 L800 65 L800 120 Z"
          fill={`url(#summitGrad-${accentColor.replace(/[^a-zA-Z0-9]/g, "")})`}
        />

        {/* Foreground Mountain with Flag */}
        <path
          d="M80 120 L240 30 L400 120 L580 50 L720 120 Z"
          fill={accentColor}
          fillOpacity="0.18"
        />

        {/* Milestone Flag on Main Peak (240, 30) */}
        <line x1="240" y1="30" x2="240" y2="12" stroke={accentColor} strokeWidth="2.5" strokeLinecap="round" />
        <polygon points="240,12 256,18 240,24" fill="url(#flagGrad)" />

        {/* Milestone Flag on Second Peak (520, 40) */}
        <line x1="520" y1="40" x2="520" y2="24" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" />
        <polygon points="520,24 534,29 520,34" fill="#8b5cf6" />

        {/* Little Sparkles */}
        <circle cx="270" cy="22" r="2" fill="#f59e0b" />
        <circle cx="210" cy="26" r="1.5" fill="#f59e0b" />
        <circle cx="550" cy="30" r="2" fill="#8b5cf6" />
        <circle cx="490" cy="36" r="1.5" fill="#06b6d4" />
      </svg>
    </div>
  );
}

/**
 * Constellations, orbits, and twinkling starbursts at the top of a card/section
 */
export function CelestialStarsGraphic({
  className = "",
  position = "top",
  opacity = "opacity-30",
  accentColor = "#6366f1",
}: GraphicProps) {
  const isTop = position === "top";

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute select-none overflow-hidden ${
        isTop ? "top-0 right-0" : "bottom-0 right-0"
      } w-64 h-36 md:w-80 md:h-44 ${opacity} ${className}`}
    >
      <svg
        viewBox="0 0 320 180"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <defs>
          <radialGradient id="starGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={accentColor} stopOpacity="0.4" />
            <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Soft Background Radial Orb */}
        <circle cx="240" cy="60" r="90" fill="url(#starGlow)" />

        {/* Orbital Ring */}
        <ellipse
          cx="230"
          cy="70"
          rx="75"
          ry="32"
          stroke={accentColor}
          strokeWidth="1.2"
          strokeDasharray="4 4"
          strokeOpacity="0.4"
          transform="rotate(-15 230 70)"
        />

        {/* Constellation Nodes & Connecting Lines */}
        <path
          d="M170 85 L205 60 L250 45 L285 75 L260 110"
          stroke={accentColor}
          strokeWidth="1.2"
          strokeOpacity="0.35"
          strokeLinecap="round"
        />

        {/* Starburst Points */}
        <g transform="translate(250, 45)">
          <path
            d="M0 -7 L1.5 -1.5 L7 0 L1.5 1.5 L0 7 L-1.5 1.5 L-7 0 L-1.5 -1.5 Z"
            fill="#f59e0b"
          />
        </g>
        <g transform="translate(170, 85)">
          <path
            d="M0 -5 L1 -1 L5 0 L1 1 L0 5 L-1 1 L-5 0 L-1 -1 Z"
            fill="#ec4899"
          />
        </g>
        <g transform="translate(285, 75)">
          <circle cx="0" cy="0" r="3.5" fill={accentColor} fillOpacity="0.8" />
          <circle cx="0" cy="0" r="6" stroke={accentColor} strokeWidth="1" strokeOpacity="0.4" />
        </g>
        <circle cx="205" cy="60" r="2.5" fill="#38bdf8" />
        <circle cx="260" cy="110" r="2" fill="#a855f7" />
        <circle cx="140" cy="40" r="1.5" fill="#f59e0b" />
        <circle cx="295" cy="30" r="1.5" fill="#38bdf8" />
      </svg>
    </div>
  );
}

/**
 * Layered organic wave contours with glowing gradients
 */
export function SmoothWaveGraphic({
  className = "",
  position = "bottom",
  opacity = "opacity-20",
  accentColor = "#0d9488",
}: GraphicProps) {
  const isTop = position === "top";

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute select-none overflow-hidden ${
        isTop ? "top-0 inset-x-0" : "bottom-0 inset-x-0"
      } ${opacity} ${className}`}
    >
      <svg
        viewBox="0 0 1000 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        className={`w-full h-14 md:h-18 ${isTop ? "rotate-180" : ""}`}
      >
        <path
          d="M0 60 C250 20 400 95 650 45 C820 10 930 70 1000 50 L1000 100 L0 100 Z"
          fill={accentColor}
          fillOpacity="0.2"
        />
        <path
          d="M0 75 C200 45 450 85 700 40 C850 15 950 60 1000 75 L1000 100 L0 100 Z"
          fill={accentColor}
          fillOpacity="0.3"
        />
      </svg>
    </div>
  );
}

/**
 * Ribbon banners and trophy sparkles celebrating completed quests
 */
export function QuestBannersGraphic({
  className = "",
  position = "top",
  opacity = "opacity-25",
  accentColor = "#f59e0b",
}: GraphicProps) {
  const isTop = position === "top";

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute select-none overflow-hidden ${
        isTop ? "top-0 right-0" : "bottom-0 right-0"
      } w-52 h-28 md:w-64 md:h-32 ${opacity} ${className}`}
    >
      <svg viewBox="0 0 240 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* Decorative Laurel Ribbon Curve */}
        <path
          d="M40 20 Q120 70 210 25"
          stroke={accentColor}
          strokeWidth="2"
          strokeDasharray="6 4"
          strokeOpacity="0.5"
        />
        {/* Floating Celebration Stars */}
        <polygon points="120,40 123,47 130,48 125,53 126,60 120,56 114,60 115,53 110,48 117,47" fill={accentColor} />
        <polygon points="175,28 177,33 182,34 178,38 179,43 175,40 171,43 172,38 168,34 173,33" fill="#10b981" />
        <polygon points="70,30 72,35 77,36 73,40 74,45 70,42 66,45 67,40 63,36 68,35" fill="#6366f1" />
        {/* Confetti Rings */}
        <circle cx="145" cy="30" r="3" stroke="#ec4899" strokeWidth="1.5" fill="none" />
        <circle cx="95" cy="45" r="2.5" stroke={accentColor} strokeWidth="1.5" fill="none" />
        <circle cx="190" cy="55" r="2" fill="#06b6d4" />
      </svg>
    </div>
  );
}

/**
 * Whimsical cloud hills and sky contours for kid friendly cards
 */
export function CloudHillsGraphic({
  className = "",
  position = "bottom",
  opacity = "opacity-25",
  accentColor = "#38bdf8",
}: GraphicProps) {
  const isTop = position === "top";

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute select-none overflow-hidden ${
        isTop ? "top-0 inset-x-0" : "bottom-0 inset-x-0"
      } ${opacity} ${className}`}
    >
      <svg
        viewBox="0 0 900 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        className={`w-full h-14 md:h-18 ${isTop ? "rotate-180" : ""}`}
      >
        <path
          d="M0 100 L0 50 Q100 20 220 55 Q340 90 450 40 Q570 -10 700 50 Q800 90 900 45 L900 100 Z"
          fill={accentColor}
          fillOpacity="0.25"
        />
        <path
          d="M0 100 L0 65 Q140 40 280 70 Q420 100 560 55 Q700 10 820 65 L900 70 L900 100 Z"
          fill={accentColor}
          fillOpacity="0.35"
        />
      </svg>
    </div>
  );
}
