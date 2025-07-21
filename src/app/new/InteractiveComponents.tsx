"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

export function SearchInput() {
  const router = useRouter();

  const performSearch = useCallback((searchQuery: string) => {
    router.push(`/songs.html?search=${encodeURIComponent(searchQuery)}`);
  }, [router]);

  return (
    <input
      type="search"
      id="song-search"
      placeholder="Search for a niggun..."
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          performSearch((e.target as HTMLInputElement).value);
        }
      }}
    />
  );
}

export function CornerBanner() {
  const router = useRouter();

  return (
    <div
      className="corner-banner"
      onClick={() => router.push('/project-growth-page.html')}
      role="link"
      aria-label="Visit project growth page"
    >
      <span>Find out how you can help</span>
    </div>
  );
}
