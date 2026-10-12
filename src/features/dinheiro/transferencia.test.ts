import { describe, expect, it } from 'vitest'
import { detectarTransferenciaInterna } from './transferencia'

const COM_CARTAO = [{ tipo: 'CORRENTE' as const }, { tipo: 'CREDITO' as const }]
const SO_CORRENTE = [{ tipo: 'CORRENTE' as const }]

describe('detectarTransferenciaInterna', () => {
  describe('os dois lados do pagamento de fatura', () => {
    it('marca o débito na conta corrente', () => {
      expect(
        detectarTransferenciaInterna(
          { descricao: 'Pagamento de fatura', valor: -1200, tipoConta: 'CORRENTE' },
          COM_CARTAO,
        ),
      ).toBe(true)
    })

    it('marca o crédito correspondente no cartão — senão ele entra como RECEITA', () => {
      expect(
        detectarTransferenciaInterna(
          { descricao: 'Pagamento recebido', valor: 1200, tipoConta: 'CREDITO' },
          COM_CARTAO,
        ),
      ).toBe(true)
    })

    it('reconhece a variação sem acento e em maiúsculas', () => {
      expect(
        detectarTransferenciaInterna(
          { descricao: 'PAGAMENTO FATURA CARTAO NUBANK', valor: -800, tipoConta: 'CORRENTE' },
          COM_CARTAO,
        ),
      ).toBe(true)
    })

    it('não marca nada de fatura quando a conexão não tem cartão', () => {
      expect(
        detectarTransferenciaInterna(
          { descricao: 'Pagamento de fatura', valor: -1200, tipoConta: 'CORRENTE' },
          SO_CORRENTE,
        ),
      ).toBe(false)
    })

    it('não marca crédito na conta corrente com texto de pagamento', () => {
      expect(
        detectarTransferenciaInterna(
          { descricao: 'Pagamento recebido', valor: 1200, tipoConta: 'CORRENTE' },
          COM_CARTAO,
        ),
      ).toBe(false)
    })
  })

  describe('movimentação para investimento, nos dois sentidos', () => {
    it('marca a aplicação, que sai da conta', () => {
      expect(
        detectarTransferenciaInterna(
          { descricao: 'Aplicação RDB', valor: -500, tipoConta: 'CORRENTE' },
          COM_CARTAO,
        ),
      ).toBe(true)
    })

    it('marca o resgate, que volta como crédito e seria contado como receita', () => {
      expect(
        detectarTransferenciaInterna(
          { descricao: 'Resgate RDB', valor: 500, tipoConta: 'CORRENTE' },
          SO_CORRENTE,
        ),
      ).toBe(true)
    })
  })

  describe('o que NÃO pode ser marcado', () => {
    it('compra comum no débito — falso-positivo aqui esconde gasto real', () => {
      expect(
        detectarTransferenciaInterna(
          { descricao: 'MERCADO PAGUE MENOS', valor: -180, tipoConta: 'CORRENTE' },
          COM_CARTAO,
        ),
      ).toBe(false)
    })

    it('compra no cartão', () => {
      expect(
        detectarTransferenciaInterna(
          { descricao: 'IFOOD *PEDIDO', valor: -48.9, tipoConta: 'CREDITO' },
          COM_CARTAO,
        ),
      ).toBe(false)
    })

    it('salário recebido', () => {
      expect(
        detectarTransferenciaInterna(
          { descricao: 'Transferencia recebida', valor: 5000, tipoConta: 'CORRENTE' },
          COM_CARTAO,
        ),
      ).toBe(false)
    })
  })
})
