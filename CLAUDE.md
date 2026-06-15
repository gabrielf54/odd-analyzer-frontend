# CLAUDE.md — odd-analyzer-frontend

> **Este é o FRONTEND.** Consome os dados (API REST) do backend, que fica em: `C:\Users\gabri\Documents\projects\odd-analyzer`

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

### Nomenclatura — código em inglês

- **Identificadores em inglês.** Nomes de **arquivos, variáveis, funções, componentes, tipos/interfaces** sempre em inglês (`MatchCard.tsx`, `filterMatches`, `LeagueRail`). Nada de PT-BR em código (`Escalacao.tsx`, `agruparPorData` → `Lineup.tsx`, `groupByDay`).
- **Exceção — chaves da API ficam snake_case PT.** Campos que espelham o JSON do backend (`prob_devig`, `market_type`, `mandante`, `jogadores`, `amostra_jogos`…) **não traduzir** — o nome do tipo é inglês (`interface Match`), mas os campos mantêm o nome do backend.
- **Texto de UI fica em português.** Strings visíveis pro dono (labels, mensagens, placeholders) continuam em PT-BR — é a língua do produto. Só os *identificadores* viram inglês.

### Botões

- **Todo botão tem `cursor: pointer`.** Garantido global em `app/globals.css` (`button:not(:disabled) { cursor: pointer !important }` — o `!important` é necessário porque no Tailwind v4 o preflight vence a regra em botão simples). Botão desabilitado usa `not-allowed` (o `:not(:disabled)` preserva isso). **Não repetir `cursor-pointer` por botão.** Exceção: elementos clicáveis que não são `<button>` (ex.: `<summary>`) precisam da classe explícita.

## Padrões de UI compartilhados (universais — usar SEMPRE estes)

> Dois provedores montados **uma única vez** no `app/layout.tsx`, disponíveis em
> **qualquer client component**. **NÃO** usar `alert()`/`confirm()` nativos do navegador,
> nem repetir mensagem de aviso/confirmação dentro do próprio componente. Estes são o
> padrão do projeto — toda notificação e toda confirmação passam por eles.

### Toast — aviso transitório (`components/Toast.tsx`)

Notificação que aparece no canto inferior-direito e some sozinha. Para **feedback** de
ação (deu certo / deu erro / aviso).

```tsx
"use client";
import { useToast } from "@/components/Toast";

const toast = useToast();
toast.success("Odds salvas.");
toast.error("Falhou ao salvar.");
toast.warn("Mercado em validação.");
toast.info("Coletando nas casas…");
// avançado: toast.show("msg", { tone: "cyan", duration: 6000 });
```

Tons casam com o tema: `value` (verde) · `bad` (vermelho) · `warn` (âmbar) · `cyan`.

### Confirm — modal de confirmação em foco (`components/ConfirmDialog.tsx`)

Modal centrado, com overlay, para **ações destrutivas/irreversíveis**. Promessa que
resolve `true`/`false`. ESC ou clicar fora = cancela; Enter = confirma.

```tsx
"use client";
import { useConfirm } from "@/components/ConfirmDialog";

const confirm = useConfirm();
const ok = await confirm({
  title: "Apagar todas as odds?",
  message: "Isso não pode ser desfeito.",
  confirmLabel: "Apagar tudo",
  tone: "bad", // "bad" = destrutivo (vermelho) · "value" = normal (verde, default)
});
if (!ok) return;
// ... segue a ação
```

**Regra:** qualquer ação que apaga/sobrescreve dado usa `useConfirm` (não `window.confirm`);
qualquer resultado de ação que valha avisar usa `useToast`.

## Rodar

- Backend primeiro: no repo `odd-analyzer`, `npm run dev` na raiz (porta 3001).
- Front: `npm run dev` (porta 3000).
