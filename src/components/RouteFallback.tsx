import { Skeleton } from './States'

export function RouteFallback() {
  return (
    <div className="page" style={{ paddingBlock: '2rem', display: 'grid', gap: '1rem' }} aria-busy="true">
      <Skeleton height={48} width="60%" />
      <Skeleton height={18} width="40%" />
      <Skeleton height={320} radius={8} />
    </div>
  )
}
