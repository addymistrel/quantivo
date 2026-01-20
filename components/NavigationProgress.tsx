"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const startLoading = useCallback(() => {
    setIsLoading(true);
    setProgress(0);
  }, []);

  const completeLoading = useCallback(() => {
    setProgress(100);
    setTimeout(() => {
      setIsLoading(false);
      setProgress(0);
    }, 200);
  }, []);

  useEffect(() => {
    // Complete loading when route changes
    completeLoading();
  }, [pathname, searchParams, completeLoading]);

  useEffect(() => {
    if (!isLoading) return;

    // Simulate progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return prev;
        }
        // Fast at first, then slow down
        const increment = prev < 50 ? 10 : prev < 80 ? 5 : 2;
        return Math.min(prev + increment, 90);
      });
    }, 150);

    return () => clearInterval(interval);
  }, [isLoading]);

  useEffect(() => {
    // Intercept link clicks to start loading
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a");

      if (
        anchor &&
        anchor.href &&
        anchor.href.startsWith(window.location.origin) &&
        !anchor.target &&
        !anchor.download &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.shiftKey
      ) {
        const url = new URL(anchor.href);
        // Only start loading for different pages
        if (
          url.pathname !== pathname ||
          url.search !== window.location.search
        ) {
          startLoading();
        }
      }
    };

    // Handle form submissions
    const handleSubmit = () => {
      startLoading();
    };

    document.addEventListener("click", handleClick);
    document.addEventListener("submit", handleSubmit);

    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("submit", handleSubmit);
    };
  }, [pathname, startLoading]);

  if (!isLoading && progress === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-[3px] bg-transparent">
      <div
        className="h-full transition-all duration-200 ease-out"
        style={{
          width: `${progress}%`,
          background:
            "linear-gradient(90deg, #3b82f6, #60a5fa, #93c5fd, #60a5fa, #3b82f6)",
          backgroundSize: "200% 100%",
          animation: "shimmer 1.5s infinite linear",
          boxShadow: "0 0 10px #3b82f6, 0 0 20px #60a5fa, 0 0 30px #3b82f6",
        }}
      />
      <style jsx>{`
        @keyframes shimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
      `}</style>
    </div>
  );
}
