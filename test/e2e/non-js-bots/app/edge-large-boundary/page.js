import { LargeBoundary } from '../../components/large-boundary'

export const dynamic = 'force-dynamic'
export const runtime = 'edge'

export default function Page() {
  return <LargeBoundary id="app" />
}
