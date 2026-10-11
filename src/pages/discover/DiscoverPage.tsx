import { useEffect, useId, useState } from 'react'
import { useSearchParams } from 'react-router'
import { listCreatives, type DirectoryFilters } from '../../api/client'
import { CreativeCard, CreativeCardSkeleton } from '../../components/CreativeCard'
import { Dialog } from '../../components/Dialog'
import { Icon } from '../../components/Icon'
import { Photo } from '../../components/Photo'
import { EmptyState, ErrorState } from '../../components/States'
import { crafts } from '../../data/creatives'
import { useResource } from '../../hooks/useResource'
import { formatNaira } from '../../lib/money'
import { PRICE_CAPS, activeFilterCount, filtersFromParams, paramsFromFilters } from './filters'
import styles from './DiscoverPage.module.css'

type Filters = Required<DirectoryFilters>

export default function DiscoverPage() {
  const [params, setParams] = useSearchParams()
  const filters = filtersFromParams(params)
  const [query, setQuery] = useState(filters.q)
  const [sheetOpen, setSheetOpen] = useState(false)
  const key = paramsFromFilters(filters).toString()

  const update = (patch: Partial<Filters>) =>
    setParams(paramsFromFilters({ ...filters, ...patch }), { replace: true, preventScrollReset: true })

  // Debounce typing into the URL so history and fetches don't fire per keystroke.
  useEffect(() => {
    if (query === filters.q) return
    const t = setTimeout(() => update({ q: query }), 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  useEffect(() => {
    document.title = 'Kòkó · Book the people whose work you love'
  }, [])

  const results = useResource(() => listCreatives(filters), [key], { live: true })
  const extra = activeFilterCount(filters)

  const clearAll = () => {
    setQuery('')
    setParams(new URLSearchParams(), { replace: true })
  }

  return (
    <div className={styles.page}>
      <section className={`page ${styles.hero}`} aria-labelledby="hero-title">
        <div className={styles.heroText}>
          <p className="eyebrow">Lagos &amp; Abuja · 8 independent creatives</p>
          <h1 id="hero-title" className={styles.title}>
            Book the hands <em>behind the work.</em>
          </h1>
          <p className={styles.lede}>
            Photographers, barbers, braiders and makeup artists who run their own diaries. See their real work, pick a
            time that’s actually free, and secure it with a small deposit.
          </p>
          <form
            role="search"
            className={styles.search}
            onSubmit={(e) => {
              e.preventDefault()
              update({ q: query })
            }}
          >
            <label htmlFor="q" className="sr-only">
              Search creatives or services
            </label>
            <Icon name="search" size={20} />
            <input
              id="q"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Try “knotless”, “fade” or “Lekki”"
              autoComplete="off"
              enterKeyHint="search"
            />
          </form>
        </div>
        <div className={styles.collage} aria-hidden>
          <Photo name="tobi-04" alt="" sizes="(min-width: 900px) 240px, 34vw" ratio={3 / 4} priority className={styles.c1} />
          <Photo name="kay-02" alt="" sizes="(min-width: 900px) 240px, 34vw" ratio={3 / 4} priority className={styles.c2} />
          <Photo name="amaka-07" alt="" sizes="(min-width: 900px) 240px, 34vw" ratio={3 / 4} priority className={styles.c3} />
        </div>
      </section>

      <section className="page" aria-labelledby="results-title">
        <h2 id="results-title" className="sr-only">
          Creatives
        </h2>
        <div className={styles.toolbar}>
          <div className={styles.chips} role="group" aria-label="Filter by craft">
            <button type="button" className={styles.chip} aria-pressed={filters.craft === 'all'} onClick={() => update({ craft: 'all' })}>
              Everyone
            </button>
            {crafts.map((c) => (
              <button
                key={c.id}
                type="button"
                className={styles.chip}
                aria-pressed={filters.craft === c.id}
                onClick={() => update({ craft: c.id })}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className={styles.inlineFilters}>
            <FilterFields filters={filters} update={update} />
          </div>

          <button type="button" className={`btn btn-ghost ${styles.filterButton}`} onClick={() => setSheetOpen(true)}>
            <Icon name="sliders" size={18} />
            Filters
            {extra > 0 && <span className={styles.filterCount}>{extra}</span>}
          </button>
        </div>

        <p className={styles.count} aria-live="polite">
          {results.status === 'ready' &&
            `${results.data.length} ${results.data.length === 1 ? 'creative' : 'creatives'}${filters.q ? ` matching “${filters.q}”` : ''}`}
        </p>

        {results.status === 'error' && !results.data && <ErrorState error={results.error} onRetry={results.retry} />}

        {results.status === 'loading' && !results.data && (
          <div className={styles.grid} aria-busy="true" aria-label="Loading creatives">
            {Array.from({ length: 4 }, (_, i) => (
              <CreativeCardSkeleton key={i} />
            ))}
          </div>
        )}

        {results.data && results.data.length === 0 && (
          <EmptyState
            title="Nobody matches that yet"
            action={
              <button type="button" className="btn btn-ghost" onClick={clearAll}>
                Clear search and filters
              </button>
            }
          >
            Try a different word, or widen the price or availability filters.
          </EmptyState>
        )}

        {results.data && results.data.length > 0 && (
          <div className={styles.grid} data-stale={results.status === 'loading'}>
            {results.data.map((entry, i) => (
              <CreativeCard key={entry.creative.id} entry={entry} priority={i < 2} />
            ))}
          </div>
        )}
      </section>

      <Dialog open={sheetOpen} onClose={() => setSheetOpen(false)} title="Filters">
        <div className={styles.sheetFields}>
          <FilterFields filters={filters} update={update} stacked />
        </div>
        <div className={styles.sheetActions}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => update({ city: '', maxPrice: 0, thisWeek: false, sort: 'soonest' })}
          >
            Reset
          </button>
          <button type="button" className="btn" onClick={() => setSheetOpen(false)}>
            Show {results.data?.length ?? ''} results
          </button>
        </div>
      </Dialog>
    </div>
  )
}

function FilterFields({ filters, update, stacked }: { filters: Filters; update: (p: Partial<Filters>) => void; stacked?: boolean }) {
  const id = useId()
  return (
    <div className={stacked ? styles.fieldsStacked : styles.fields}>
      <div className={styles.select}>
        <label htmlFor={`${id}-city`}>City</label>
        <select id={`${id}-city`} value={filters.city} onChange={(e) => update({ city: e.target.value })}>
          <option value="">Anywhere</option>
          <option value="Lagos">Lagos</option>
          <option value="Abuja">Abuja</option>
        </select>
      </div>
      <div className={styles.select}>
        <label htmlFor={`${id}-max`}>Starting price</label>
        <select id={`${id}-max`} value={filters.maxPrice} onChange={(e) => update({ maxPrice: Number(e.target.value) })}>
          <option value={0}>Any price</option>
          {PRICE_CAPS.map((p) => (
            <option key={p} value={p}>
              Under {formatNaira(p)}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.select}>
        <label htmlFor={`${id}-sort`}>Sort</label>
        <select id={`${id}-sort`} value={filters.sort} onChange={(e) => update({ sort: e.target.value as Filters['sort'] })}>
          <option value="soonest">Soonest available</option>
          <option value="rating">Highest rated</option>
          <option value="price">Lowest price</option>
        </select>
      </div>
      <label className={styles.toggle}>
        <input type="checkbox" checked={filters.thisWeek} onChange={(e) => update({ thisWeek: e.target.checked })} />
        Free this week
      </label>
    </div>
  )
}
