# Filtro de jogos na liga — design

**Data:** 2026-06-07
**Tela:** Pré-jogo (`/`), seção `Browse` (lista de jogos após escolher a liga).

## Problema

Ao abrir uma liga, a lista de jogos não tem filtros. A casa de aposta lista até 50 jogos
e o usuário precisa rolar tudo pra achar o que quer. Falta uma forma rápida de achar um
time específico ou recortar por janela de tempo.

## Restrição dos dados (importante)

`GET /ligas/:id/jogos?status=notstarted` (backend `service.listarJogos`) retorna **apenas**:

```
id, mandante, visitante, data, status, placar, league_id   (máx. 50 jogos)
```

Não há odd, edge/EV, mercado nem favorito salvo no nível da lista — **valor só existe
depois de clicar no jogo e analisar**. Portanto os filtros viáveis saem só de `data` e
dos nomes dos times. Tudo é client-side sobre os jogos já carregados; **nenhuma mudança
de API**.

## Escopo (decidido com o dono)

Três recursos:

1. **Buscar time** (texto) — casa em `mandante` OU `visitante`.
2. **Filtro por período** — chips `Todos / Hoje / Próximos 7 dias`.
3. **Ordenação por horário dentro do dia** — corrige a ordem crua da API dentro de cada
   grupo de dia.

Fora de escopo: filtro por horário do dia (manhã/tarde/noite), por odd/edge, favoritos.

## Componentes

### 1. `lib/jogosFiltro.ts` — lógica pura (testável)

```ts
export type Periodo = "todos" | "hoje" | "7d";
export interface FiltroJogos { busca: string; periodo: Periodo; }

export function filtrarJogos(
  jogos: Jogo[],
  filtro: FiltroJogos,
  agora?: Date,            // default new Date(); injetável p/ teste
): Jogo[];
```

Regras:

- **busca**: `trim().toLowerCase()`; vazio = passa tudo. Casa por substring em
  `mandante.toLowerCase()` OU `visitante.toLowerCase()`.
- **periodo**:
  - `"todos"` → passa tudo (inclusive jogos sem data).
  - `"hoje"` → `j.data` cai no mesmo dia-calendário de `agora`.
  - `"7d"` → `j.data` entre o início de hoje e o fim do 7º dia à frente (hoje + 6 dias,
    inclusive). Janela: `[início de hoje, fim de hoje+6]`.
  - Em `"hoje"` e `"7d"`, jogos **sem data** (ou data inválida) são **excluídos** — não há
    como posicioná-los no tempo.
- **Combinação**: busca E período aplicados juntos (AND).
- Comparação de dia reaproveita a lógica `ymd` de `lib/date.ts` (exportar se preciso).

### 2. `lib/date.ts` — ajuste em `agruparPorData`

Dentro de cada `GrupoDia.jogos`, ordenar por horário (`data` ascendente). Jogos com data
inválida vão ao fim do próprio grupo. A ordem **entre** grupos (por dia, crescente) e a
posição do grupo `sem-data` (último) não mudam.

### 3. `components/JogosFiltro.tsx` — UI (client)

Estilo reaproveita o visual de `MercadoChips` (chip ativo = cor `value`/verde).

```tsx
export function JogosFiltro({
  busca, setBusca,
  periodo, setPeriodo,
}: {
  busca: string; setBusca: (v: string) => void;
  periodo: Periodo; setPeriodo: (p: Periodo) => void;
}): JSX.Element;
```

Layout: linha com `input` "buscar time…" + 3 chips `Todos / Hoje / Próximos 7 dias`.

### 4. Fiação em `app/page.tsx` (`Browse`)

- `Browse` ganha estado local `busca` (string) e `periodo` (`Periodo`, default `"todos"`).
- Aplica `filtrarJogos(jogos, { busca, periodo })` → `jogosFiltrados`.
- Renderiza `<JogosFiltro …/>` acima da lista, **só quando** há liga selecionada e
  `jogos.length > 0` (não mostrar a barra durante loading / liga vazia).
- Passa `jogosFiltrados` pra `JogosLista`.
- Quando filtro ativo (busca não-vazia ou período ≠ `todos`): mostra contagem
  `"N de M jogos"` + botão/link **limpar** (reseta busca e período).

### 5. Estado vazio com filtro

`JogosLista` hoje mostra "sem jogos não iniciados nessa liga" quando recebe lista vazia.
Distinguir o caso "a liga tem jogos mas o filtro zerou":

- `Browse` trata isso: se `jogos.length > 0 && jogosFiltrados.length === 0`, renderiza uma
  mensagem própria ("nenhum jogo bate o filtro — ajuste a busca ou o período") em vez de
  chamar `JogosLista` com lista vazia. `JogosLista` permanece responsável só pelo caso
  "liga sem jogos".

## Testes

- `filtrarJogos`:
  - busca casa em mandante; casa em visitante; case-insensitive; vazia passa tudo.
  - `hoje`: inclui jogo de hoje, exclui amanhã/ontem.
  - `7d`: inclui hoje e hoje+6; exclui hoje+7 e passado.
  - sem-data: incluído em `todos`, excluído em `hoje`/`7d`.
  - combinação busca + período (AND).
  - `agora` injetado para datas determinísticas.
- `agruparPorData`: dentro de um dia com jogos fora de ordem, retorna ordenado por horário;
  data inválida vai ao fim do grupo; ordem entre dias inalterada.

## Não-objetivos

- Sem mudança de contrato/endpoint do backend.
- Sem persistência do filtro entre trocas de liga (reseta ao trocar — comportamento atual
  do `Browse`).
