const PALAVRAS_NO_PADRAO = 2

/**
 * Extrai da descrição um padrão reutilizável para virar regra.
 *
 * Descrições de banco carregam sufixo variável ("IFOOD *PEDIDO 4821"), então
 * guardar a descrição inteira criaria uma regra que nunca casa de novo. Duas
 * palavras é o equilíbrio entre casar o futuro e não casar demais: "PIX" só
 * casaria todo PIX, "PIX MARIA" casa a pessoa certa.
 */
export function padraoDe(descricao: string): string {
  return descricao.trim().split(/\s+/).slice(0, PALAVRAS_NO_PADRAO).join(' ').toUpperCase()
}
