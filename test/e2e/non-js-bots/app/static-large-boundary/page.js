import { LargeBoundary } from '../../components/large-boundary'

// ISR so the request still reaches the function when deployed; purely static
// routes are served from the CDN without invoking it.
export const revalidate = 60

export default function Page() {
  return <LargeBoundary id="app" />
}
