import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    // Carrega o .env: módulos que importam `@/lib/prisma` instanciam o client
    // na importação, e o adapter exige DATABASE_URL presente (não conectada —
    // o Prisma só abre conexão na primeira query).
    setupFiles: ['dotenv/config'],
    include: ['src/**/*.test.ts'],
    coverage: { include: ['src/features/**', 'src/lib/**'] },
  },
})
