# CLAUDE.md — odd-analyzer-frontend

Front Next.js do odd-analyzer. **Leia "Produto" primeiro** — define a mentalidade. O backend (Node/TS, repo `odd-analyzer`) expõe a API REST que este front consome.

## Produto — o que é (e o que o dono entende)

> O dono entende o PRODUTO mas **não lê código**. Ao explicar qualquer coisa pra ele, use analogia do dia a dia, não jargão.

Para um jogo escolhido, o sistema compara a **probabilidade do nosso modelo** (calculada no backend, em código) com a **odd da casa sem a margem** (de-vig) e **só sinaliza quando o modelo está claramente à frente**. A IA escreve a explicação; **nunca inventa o número**.

**Princípio inegociável:** valor = `prob_modelo > prob_justa_da_casa_sem_margem` (filtra por EV/edge positivo). **NUNCA** se filtra por "probabilidade alta" — favorito eficientemente precificado = −EV. O front só **exibe** os candidatos que o backend já filtrou; não recalcula nada.

**Mercados:** jogador (chutes a gol/SOT, finalizações, desarmes) · partida (gols, vitória, escanteios). Mercados de partida (gols/escanteios) entram **em validação** → o front sela ("não apostar").

## Glossário (linguagem do dono, leigo)

- **De-vig** = tirar o lucro embutido da casa pra achar a probabilidade "justa" que ela acredita. Comparamos NOSSO número com esse, não com a odd crua.
- **Edge / EV** = Edge é o tamanho da vantagem (nosso número − número justo). EV é quanto se ganha em média por R$1 no longo prazo. Só aposta com os dois positivos.
- **Calibração** = "detector de mentira" do modelo (provado no backend antes de dinheiro real).
- **Lineup** = 11 titulares confirmados (~1h antes). Não recomendar quem pode ficar no banco.
- **Em validação** = mercado que ainda não passou na calibração → o front mostra mas marca "não apostar".

## Convenções de código

- **Next App Router** + TypeScript. Server Components p/ dados; **Client Components só onde há interação** (selects, botão analisar).
- **`lib/api.ts` é o ÚNICO ponto que fala com o backend.** Nenhum componente faz `fetch` solto. Tipos em `lib/types.ts` espelham o JSON do backend (chaves **snake_case PT**: `prob_devig`, `prob_modelo`, `amostra_jogos`, `market_type`).
- URL do backend via `NEXT_PUBLIC_API_URL` (`.env.local`; default `http://localhost:3001`).
- Visual **simples e limpo** (Tailwind, sem libs pesadas). Foco em funcionar ponta-a-ponta.
- 2 telas: **Pré-jogo** (`/`) liga→jogo→mercado→análise; **Pós-jogo** (`/pos`) confere resultado real.

## Rodar

- Backend primeiro: no repo `odd-analyzer`, `cd ts && npm run dev` (porta 3001).
- Front: `npm run dev` (porta 3000).
