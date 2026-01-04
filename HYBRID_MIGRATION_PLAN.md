# Hybrid Component Migration Strategy

This document outlines the incremental approach for converting the Songs and Sheet Builder pages from static HTML to fully React-based components.

## Current State

### Hybrid Components (Phase 1)
Both Songs and Sheet Builder pages are currently implemented as hybrid React components that:
- Load existing HTML and JavaScript from static files
- Use Next.js Script component for external dependencies (YouTube API, Packery, Draggabilly)
- Provide a React wrapper for future incremental conversion

### Reusable Components Created
1. **SearchBox** (`app/components/SearchBox.js`)
   - Reusable search component with real-time filtering
   - Used by both Songs and Sheet Builder pages
   - Props: `onSearch`, `onClear`, `placeholder`, `showClearButton`

2. **Header** (`app/components/Header.js`)
   - Shared navigation component
   - Mobile-responsive with hamburger menu

3. **Footer** (`app/components/Footer.js`)
   - Shared footer with links

4. **CornerBanner** (`app/components/CornerBanner.js`)
   - Project growth banner

### Custom Hooks Created
1. **useLocalStorage** (`app/hooks/useLocalStorage.js`)
   - Generic localStorage hook with React state sync
   - Handles JSON serialization/deserialization
   - Server-side rendering safe

2. **useSelectedSongs** (`app/hooks/useLocalStorage.js`)
   - Manages selected songs in localStorage
   - Methods: `addSong`, `removeSong`, `clearSongs`

3. **useSmartboardMode** (`app/hooks/useLocalStorage.js`)
   - Manages smartboard mode preference
   - Toggle between normal and smartboard view

## Incremental Conversion Plan

### Phase 2: Convert Search Functionality
**Target:** Replace inline search JavaScript with SearchBox component

**Songs Page:**
- [ ] Replace `#song-search` input with SearchBox component
- [ ] Convert `performSearch()` and `clearSearch()` functions to React state
- [ ] Update URL query parameters using Next.js router

**Sheet Builder Page:**
- [ ] Replace `#searchBox` input with SearchBox component
- [ ] Convert filter logic to React state
- [ ] Implement real-time filtering with useState

### Phase 3: Convert LocalStorage Management
**Target:** Use custom hooks for all localStorage operations

**Songs Page:**
- [ ] Replace `localStorage.getItem('selectedSongs')` with useSelectedSongs hook
- [ ] Replace `localStorage.getItem('smartboardMode')` with useSmartboardMode hook
- [ ] Remove inline localStorage JavaScript

**Sheet Builder Page:**
- [ ] Use useSelectedSongs hook for sheet management
- [ ] Add useSheetLayout hook for column preferences
- [ ] Remove inline localStorage JavaScript

### Phase 4: Convert YouTube Player
**Target:** Create useYouTubePlayer custom hook

**Implementation:**
```javascript
// app/hooks/useYouTubePlayer.js
export function useYouTubePlayer() {
  const [player, setPlayer] = useState(null);
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null);
  const [progress, setProgress] = useState(0);
  
  // Methods: play, pause, stop, seekTo
  // Returns: player, currentlyPlaying, progress, methods
}
```

**Songs Page:**
- [ ] Replace YouTube IFrame API initialization with hook
- [ ] Convert play/pause/progress bar logic to React state
- [ ] Remove inline YouTube JavaScript

### Phase 5: Convert Drag-and-Drop (Sheet Builder)
**Target:** Create useDragDrop custom hook with Packery/Draggabilly

**Implementation:**
```javascript
// app/hooks/useDragDrop.js
export function useDragDrop(containerRef, items) {
  // Initialize Packery
  // Setup Draggabilly
  // Handle reordering
  // Returns: methods for adding/removing items
}
```

**Sheet Builder Page:**
- [ ] Create SongCard component for draggable items
- [ ] Use useDragDrop hook for layout management
- [ ] Convert add/remove/reorder logic to React state
- [ ] Remove inline Packery/Draggabilly JavaScript

### Phase 6: Convert Song List Rendering
**Target:** Create SongList and SongRow components

**Implementation:**
```javascript
// app/components/SongList.js
// app/components/SongRow.js
```

**Songs Page:**
- [ ] Replace table rendering with SongList component
- [ ] Convert row actions (play, add to sheet, etc.) to component methods
- [ ] Use React key prop for efficient re-rendering

### Phase 7: Convert Print Functionality
**Target:** Create PrintSheet component and usePrint hook

**Sheet Builder Page:**
- [ ] Create printable view component
- [ ] Implement CSS for @media print
- [ ] Add print preview functionality
- [ ] Remove inline print JavaScript

### Phase 8: API Integration
**Target:** Use React Query or SWR for API calls

**Both Pages:**
- [ ] Replace fetch('/api/songs') with useSWR or useQuery
- [ ] Implement loading states
- [ ] Add error handling
- [ ] Implement caching strategy

## Testing Strategy

### Unit Tests
Each component and hook should have comprehensive tests:

1. **SearchBox Component**
   - [ ] Renders with placeholder
   - [ ] Calls onSearch when Enter is pressed
   - [ ] Calls onSearch on input change (real-time)
   - [ ] Calls onClear when clear button clicked
   - [ ] Updates internal state correctly

2. **useLocalStorage Hook**
   - [ ] Reads initial value from localStorage
   - [ ] Writes updates to localStorage
   - [ ] Handles JSON serialization
   - [ ] Handles errors gracefully
   - [ ] Works with SSR (returns initialValue)

3. **useSelectedSongs Hook**
   - [ ] Adds songs without duplicates
   - [ ] Removes songs by title
   - [ ] Clears all songs
   - [ ] Persists to localStorage

### Integration Tests
- [ ] Full user flow: Search → Select → Add to Sheet → Print
- [ ] YouTube player integration
- [ ] Drag-and-drop functionality
- [ ] localStorage persistence across page refreshes

### E2E Tests (Optional)
- [ ] Complete sheet building workflow
- [ ] Cross-browser compatibility
- [ ] Mobile responsiveness

## File Structure

```
app/
├── components/
│   ├── SearchBox.js          ✅ Created
│   ├── Header.js             ✅ Existing
│   ├── Footer.js             ✅ Existing
│   ├── CornerBanner.js       ✅ Existing
│   ├── SongList.js           ⏳ TODO
│   ├── SongRow.js            ⏳ TODO
│   ├── SongCard.js           ⏳ TODO
│   └── PrintSheet.js         ⏳ TODO
├── hooks/
│   ├── useLocalStorage.js    ✅ Created
│   ├── useYouTubePlayer.js   ⏳ TODO
│   ├── useDragDrop.js        ⏳ TODO
│   └── usePrint.js           ⏳ TODO
├── songs/
│   └── page.js               ✅ Hybrid (Phase 1)
└── sheet-builder/
    └── page.js               ✅ Hybrid (Phase 1)
```

## Benefits of This Approach

1. **Incremental Migration**: No "big bang" rewrite
2. **Continuous Deployment**: Each phase can be deployed independently
3. **Reduced Risk**: Original functionality preserved during migration
4. **Learning Opportunity**: Team learns React patterns gradually
5. **Reusable Components**: Components can be shared across pages
6. **Better Testability**: React components are easier to test than inline scripts
7. **Type Safety Ready**: Structure supports TypeScript migration
8. **Performance**: Code splitting and lazy loading opportunities

## Next Steps

1. Write unit tests for SearchBox component
2. Write tests for useLocalStorage hook
3. Begin Phase 2: Convert search functionality
4. Create PR for each completed phase
5. Get code review and approval before moving to next phase

## Notes

- Keep original HTML files during migration for reference
- Add TODO comments in code for incremental conversion points
- Document any behavioral changes or improvements
- Update this document as phases are completed
