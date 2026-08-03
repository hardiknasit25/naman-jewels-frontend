import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * A single piece of UI state (a search term, a picked filter value, a serialised
 * grid filter model) kept in the URL query string instead of component state.
 *
 * Everything the user narrows a table down with goes through here so a refresh —
 * or a link pasted to a colleague — lands on exactly the same view. The param is
 * dropped from the URL whenever the value returns to `fallback`, which keeps the
 * address bar clean for the default, unfiltered view.
 *
 * Updates use `replace`, because filtering isn't navigation: without it every
 * keystroke in a search box would need its own press of the back button.
 */
export function useUrlState(key: string, fallback = '') {
  const [params, setParams] = useSearchParams()
  const value = params.get(key) ?? fallback

  const setValue = useCallback(
    (next: string) => {
      setParams(
        // Functional form: several grids / filters on one page can write in the
        // same tick without clobbering each other's params.
        (prev) => {
          const nextParams = new URLSearchParams(prev)
          if (!next || next === fallback) nextParams.delete(key)
          else nextParams.set(key, next)
          return nextParams
        },
        { replace: true }
      )
    },
    [key, fallback, setParams]
  )

  return [value, setValue] as const
}
