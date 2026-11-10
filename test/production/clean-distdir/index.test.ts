/* eslint-env jest */

import fs from 'fs'
import path from 'path'
import { nextTestSetup } from 'e2e-utils'

// Entries of the distDir that are kept across builds.
const RETAINED_ENTRIES = new Set([
  'cache',
  'dev',
  'diagnostics',
  'lock',
  'trace',
])

describe('Cleaning distDir', () => {
  const { next, isTurbopack } = nextTestSetup({
    files: __dirname,
    skipStart: true,
  })

  beforeEach(async () => {
    await next.stop()
    await next.remove('.next')
  })

  /** Lists all files (and empty directories) in the distDir, except retained entries. */
  function listDistDir(dir = path.join(next.testDir, '.next'), prefix = '') {
    const result: string[] = []
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    if (prefix && entries.length === 0) {
      result.push(`${prefix}/`)
    }
    for (const entry of entries) {
      if (!prefix && RETAINED_ENTRIES.has(entry.name)) continue
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name
      if (entry.isDirectory()) {
        result.push(...listDistDir(path.join(dir, entry.name), relative))
      } else {
        result.push(relative)
      }
    }
    return result.sort()
  }

  async function checkFileWrite(existsAfterBuild: boolean) {
    await next.build()

    const customFile = '.next/extra-file.txt'
    await next.patchFile(customFile, 'this is a testing file')

    await next.build()

    expect(await next.hasFile(customFile)).toBe(existsAfterBuild)

    // `.next/cache` should be preserved in all cases
    expect(await next.hasFile('.next/cache')).toBe(true)
    if (!isTurbopack) {
      expect(await next.hasFile('.next/cache/swc')).toBe(true)
    }
  }

  describe('disabled write', () => {
    it('should clean up .next before build start', async () => {
      await checkFileWrite(false)
    })

    it('should not clean up .next before build start', async () => {
      await next.patchFile(
        'next.config.js',
        `
          module.exports = {
            cleanDistDir: false
          }
        `,
        async () => {
          await checkFileWrite(true)
        }
      )
    })
  })

  it('should produce the same output as a clean build when rebuilding', async () => {
    await next.patchFile(
      'next.config.js',
      `
        module.exports = {
          output: 'standalone',
          // A stable build ID makes the output of both builds comparable.
          generateBuildId: () => 'test-build-id',
        }
      `,
      async () => {
        await next.build()
        const cleanBuildOutput = listDistDir()
        expect(cleanBuildOutput).toContain('BUILD_ID')
        expect(cleanBuildOutput).toContain('standalone/server.js')

        // Leftovers of a previous build that this build does not produce
        await next.patchFile('.next/stale-file.json', '{}')
        await next.patchFile('.next/server/stale-file.js', 'stale')
        await next.patchFile('.next/server/stale-dir/stale.js', 'stale')
        await next.patchFile('.next/static/stale-build-id/stale.js', 'stale')
        await next.patchFile('.next/standalone/stale-file.js', 'stale')
        fs.mkdirSync(path.join(next.testDir, '.next/server/stale-empty-dir'))
        await next.patchFile('.next/cache/keep.txt', 'keep')

        await next.build()

        // Exactly the files a clean build produces: stale files are gone and
        // unchanged output that was not rewritten is kept.
        expect(listDistDir()).toEqual(cleanBuildOutput)
        expect(await next.hasFile('.next/cache/keep.txt')).toBe(true)

        await next.start({ skipBuild: true })
        const html = await next.render('/')
        expect(html).toContain('hello from index')
        await next.stop()
      }
    )
  })

  it('should not leave a startable build behind when the build fails', async () => {
    await next.build()
    expect(await next.hasFile('.next/BUILD_ID')).toBe(true)

    await next.patchFile(
      'pages/index.js',
      'export default () => <div>{</div>',
      async () => {
        const { exitCode } = await next.build()
        expect(exitCode).not.toBe(0)
      }
    )

    expect(await next.hasFile('.next/BUILD_ID')).toBe(false)
  })
})
