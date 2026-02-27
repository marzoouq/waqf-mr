

# Add AbortController to AI Assistant

## Summary
Add an `AbortController` to the `AiAssistant` component to properly cancel in-flight fetch requests when the user closes the chat panel, changes mode, or when the component unmounts.

## Changes (single file)

**File:** `src/components/AiAssistant.tsx`

1. Add an `abortControllerRef` using `useRef<AbortController | null>(null)`
2. In the `send()` function: abort any previous request, create a new `AbortController`, and pass its `signal` to the `fetch()` call
3. Add a cleanup `useEffect` that aborts on unmount
4. When closing the chat (`setOpen(false)`), abort any active request
5. When changing mode (`handleModeChange`), abort any active request
6. In the `catch` block, silently ignore `AbortError` so cancelled requests don't show error messages to the user

## Technical Details

```text
Key changes in send():
  - abortControllerRef.current?.abort()        // cancel previous
  - abortControllerRef.current = new AbortController()
  - fetch(AI_URL, { signal: abortControllerRef.current.signal, ... })

Cleanup useEffect:
  - useEffect(() => () => abortControllerRef.current?.abort(), [])

Close/mode handlers:
  - abortControllerRef.current?.abort() before setOpen(false)
  - abortControllerRef.current?.abort() in handleModeChange
```

This prevents:
- Memory leaks from orphaned streaming readers
- `setState` on unmounted components
- Unnecessary network usage when user navigates away
