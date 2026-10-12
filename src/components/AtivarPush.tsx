'use client'

import { useState } from 'react'

type Estado = 'parado' | 'ativando' | 'ativo' | 'erro'

/**
 * Converte a chave pública VAPID (base64url) no formato que o navegador exige.
 *
 * O retorno é anotado como `Uint8Array<ArrayBuffer>`, não `Uint8Array`: o
 * genérico resolve para `ArrayBufferLike`, que inclui `SharedArrayBuffer` e
 * por isso não satisfaz o `BufferSource` de `applicationServerKey`.
 */
function paraUint8(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  const bruto = atob(base64)
  // `new Uint8Array(n)` em vez de `Uint8Array.from`: só a primeira forma é
  // tipada sobre ArrayBuffer, que é o que `applicationServerKey` exige.
  const bytes = new Uint8Array(new ArrayBuffer(bruto.length))
  for (let i = 0; i < bruto.length; i += 1) bytes[i] = bruto.charCodeAt(i)
  return bytes
}

export function AtivarPush({ chavePublica }: { chavePublica: string }) {
  const [estado, setEstado] = useState<Estado>('parado')
  const [erro, setErro] = useState('')

  async function ativar() {
    setEstado('ativando')
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        // No iPhone isto acontece enquanto o site roda no Safari: push só
        // existe depois de "Adicionar à Tela de Início".
        throw new Error(
          'Este navegador não suporta push. No iPhone, instale pela Tela de Início primeiro.',
        )
      }

      const registro = await navigator.serviceWorker.register('/sw.js')
      if ((await Notification.requestPermission()) !== 'granted') {
        throw new Error('Permissão de notificação recusada.')
      }

      const inscricao = await registro.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: paraUint8(chavePublica),
      })

      const r = await fetch('/api/push/inscrever', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(inscricao),
      })
      if (!r.ok) throw new Error('O servidor recusou a inscrição.')

      setEstado('ativo')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falhou.')
      setEstado('erro')
    }
  }

  if (estado === 'ativo') {
    return <span className="habito-feito">lembretes ativos</span>
  }

  return (
    <>
      <button className="chip" type="button" onClick={ativar} disabled={estado === 'ativando'}>
        {estado === 'ativando' ? 'ativando…' : 'ativar lembretes'}
      </button>
      {estado === 'erro' ? (
        <span role="alert" style={{ fontSize: 'var(--texto-mini)', color: 'var(--cor-negativo)' }}>
          {erro}
        </span>
      ) : null}
    </>
  )
}
