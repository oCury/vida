import { describe, expect, it } from 'vitest'
import { avaliarSync } from './idade-sync'

const agora = new Date('2026-10-12T12:00:00Z')

describe('avaliarSync', () => {
  it('considera fresco um sync de hoje', () => {
    const r = avaliarSync(new Date('2026-10-12T06:00:00Z'), 'UPDATED', agora)
    expect(r.alerta).toBe(false)
    expect(r.horas).toBe(6)
  })

  it('alerta quando passou de 48h', () => {
    const r = avaliarSync(new Date('2026-10-10T06:00:00Z'), 'UPDATED', agora)
    expect(r.alerta).toBe(true)
    expect(r.motivo).toContain('54h')
  })

  it('não alerta exatamente em 48h, só acima', () => {
    const r = avaliarSync(new Date('2026-10-10T12:00:00Z'), 'UPDATED', agora)
    expect(r.alerta).toBe(false)
    expect(r.horas).toBe(48)
  })

  it('alerta quando nunca sincronizou', () => {
    const r = avaliarSync(null, 'UPDATED', agora)
    expect(r.alerta).toBe(true)
    expect(r.motivo).toContain('nunca')
  })

  it('alerta quando a conexão pede reautenticação, mesmo com sync recente', () => {
    const r = avaliarSync(new Date('2026-10-12T06:00:00Z'), 'LOGIN_ERROR', agora)
    expect(r.alerta).toBe(true)
    expect(r.motivo).toContain('reconectar')
  })

  it('alerta em WAITING_USER_INPUT, que é o MFA esperando o usuário', () => {
    expect(avaliarSync(new Date('2026-10-12T06:00:00Z'), 'WAITING_USER_INPUT', agora).alerta).toBe(
      true,
    )
  })
})
