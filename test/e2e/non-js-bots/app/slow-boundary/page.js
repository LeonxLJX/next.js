import { Suspense } from 'react'

export const dynamic = 'force-dynamic'

async function SlowContent() {
  await new Promise((resolve) => setTimeout(resolve, 500))
  return <p>slow-content-marker</p>
}

export default function Page() {
  return (
    <Suspense fallback={<p>slow-fallback-marker</p>}>
      <SlowContent />
    </Suspense>
  )
}
