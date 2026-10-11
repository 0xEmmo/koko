import { Link } from 'react-router'
import { EmptyState } from '../components/States'

export function NotFound({ what = 'page' }: { what?: string }) {
  return (
    <div className="page" style={{ paddingBlock: '3rem' }}>
      <EmptyState
        title={`We couldn’t find that ${what}`}
        action={
          <Link to="/" className="btn">
            Back to Discover
          </Link>
        }
      >
        The link might be old, or the {what} may have moved.
      </EmptyState>
    </div>
  )
}

export default function NotFoundPage() {
  return <NotFound />
}
