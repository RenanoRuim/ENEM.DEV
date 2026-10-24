# Relatorio tecnico: API ENEM e estrutura atual do projeto

Este documento registra a investigacao inicial da API ENEM e explica as partes
principais do projeto que ja existem. Ele **nao implementa a integracao**.

Nesta tarefa, criei somente este arquivo; nao alterei nenhum arquivo existente.

## 1. O que e a API ENEMQuero iniciar a integração da API ENEM ao meu projeto.

Por enquanto, NÃO implemente a integração completa e NÃO modifique os arquivos existentes.

Sua tarefa é investigar a API e me apresentar um relatório técnico.

1. Consulte a documentação oficial disponível em https://api.enem.dev/.
2. Identifique os endpoints necessários para listar provas e buscar questões.
3. Verifique como consultar questões por ano e área de conhecimento.
4. Identifique a estrutura real de uma questão retornada pela API, incluindo enunciado, alternativas, imagens, gabarito e demais campos disponíveis.
5. Verifique como a API representa as alternativas e a resposta correta.
6. Identifique possíveis limitações, como paginação, disponibilidade dos anos e erros de requisição.
7. Faça uma requisição de teste, se o ambiente permitir.
8. Apresente um exemplo real da resposta JSON, sem inventar campos.
9. Explique como esses dados poderão ser utilizados no meu projeto React + TypeScript.

Ao final, recomende a maneira mais simples de integrar a API à arquitetura existente.

Sou iniciante em TypeScript, portanto explique os conceitos técnicos de maneira clara.

Não implemente funcionalidades ainda. Quero entender a API antes de começar a integração.Quero iniciar a integração da API ENEM ao meu projeto.

Por enquanto, NÃO implemente a integração completa e NÃO modifique os arquivos existentes.

Sua tarefa é investigar a API e me apresentar um relatório técnico.

1. Consulte a documentação oficial disponível em https://api.enem.dev/.
2. Identifique os endpoints necessários para listar provas e buscar questões.
3. Verifique como consultar questões por ano e área de conhecimento.
4. Identifique a estrutura real de uma questão retornada pela API, incluindo enunciado, alternativas, imagens, gabarito e demais campos disponíveis.
5. Verifique como a API representa as alternativas e a resposta correta.
6. Identifique possíveis limitações, como paginação, disponibilidade dos anos e erros de requisição.
7. Faça uma requisição de teste, se o ambiente permitir.
8. Apresente um exemplo real da resposta JSON, sem inventar campos.
9. Explique como esses dados poderão ser utilizados no meu projeto React + TypeScript.

Ao final, recomende a maneira mais simples de integrar a API à arquitetura existente.

Sou iniciante em TypeScript, portanto explique os conceitos técnicos de maneira clara.

Não implemente funcionalidades ainda. Quero entender a API antes de começar a integração.

A API publica questoes e provas do ENEM. Ela e mantida pela comunidade e nao e
afiliada, endossada ou patrocinada pelo INEP ou pelo MEC. A documentacao informa
que os dados sao publicos e estao sob a licenca GNU GPL-2.0.

Na consulta realizada em 23/10/2026, a pagina inicial informava mais de 2.700
questoes entre os anos de 2009 e 2023. A lista consultada na API continha provas
de 2009 a 2023. Como os anos disponiveis podem mudar, o aplicativo deve consultar
o catalogo em vez de assumir que um ano especifico sempre existira.

## 2. Endpoints principais

A base usada nos exemplos e `https://api.enem.dev/v1`.

| Metodo e caminho                      | Para que serve                                                         |
| ------------------------------------- | ---------------------------------------------------------------------- |
| `GET /exams`                          | Lista os anos de prova disponiveis e as areas e idiomas de cada prova. |
| `GET /exams/{year}`                   | Consulta os detalhes de uma prova pelo ano.                            |
| `GET /exams/{year}/questions`         | Lista questoes daquele ano, com paginacao.                             |
| `GET /exams/{year}/questions/{index}` | Consulta uma questao pelo numero dentro daquele ano.                   |

Exemplos de URLs completos:

```text
https://api.enem.dev/v1/exams
https://api.enem.dev/v1/exams/2023
https://api.enem.dev/v1/exams/2023/questions?limit=10&offset=0
https://api.enem.dev/v1/exams/2023/questions/1
```

O numero da questao (`index`) e o numero dela naquela prova, nao um identificador
global que dispense o ano.

### Areas e consulta por ano

O ano e informado no caminho da URL. Por exemplo,
`/exams/2023/questions` lista questoes do ENEM 2023.

O catalogo de provas retorna as areas em `disciplines`, cada uma com um nome
legivel (`label`) e um codigo (`value`). Na resposta consultada, os codigos eram:

- `ciencias-humanas`
- `ciencias-natureza`
- `linguagens`
- `matematica`

A documentacao da lista de questoes apresenta os parametros `limit`, `offset` e
`language`; ela **nao apresenta um parametro de area**. Tambem testei, por
exemplo, `?discipline=matematica`: a API respondeu com a mesma primeira questao
de Linguagens que respondeu sem esse parametro. Portanto, nao conte com
`discipline` na URL para filtrar por area.

Para mostrar uma area especifica, a abordagem segura e consultar as paginas do
ano e filtrar as questoes recebidas pelo campo `discipline` no proprio
aplicativo. O codigo de area vem de dados da API; antes de comparar, vale
confirmar os valores efetivamente retornados para aquele ano.

O parametro `language` e diferente: escolhe a versao de idioma das questoes
quando aplicavel. Por exemplo, `?language=ingles` retornou uma versao em ingles
na questao 1 de 2023. O catalogo tambem lista os idiomas disponiveis para cada
prova.

### Paginacao

`limit` define quantas questoes pedir e `offset` de onde comecar:

```text
/exams/2023/questions?limit=10&offset=0
/exams/2023/questions?limit=10&offset=10
```

O padrao documentado e `limit=10` e `offset=0`. A resposta da lista traz
`metadata`, incluindo `limit`, `offset`, `total` e `hasMore`, alem do array
`questions`. A documentacao nao explica o teto de `limit`, mas um teste com
`limit=200` retornou HTTP 400 e a mensagem `Limit cannot be greater than 50`;
portanto, use no maximo 50 por requisicao.

O cliente deve continuar usando o proximo `offset` enquanto `hasMore` for
`true`. Como a API informa limite de requisicoes, nao se deve buscar todas as
paginas de uma vez sem controle (ver a secao de limites).

## 3. Formato de uma questao

Na documentacao oficial, a questao inclui estes campos:

| Campo                      | O que representa                                                            |
| -------------------------- | --------------------------------------------------------------------------- |
| `title`                    | Titulo da questao.                                                          |
| `index`                    | Numero da questao na prova.                                                 |
| `discipline`               | Codigo da area.                                                             |
| `language`                 | Idioma da questao, quando aplicavel.                                        |
| `year`                     | Ano da prova.                                                               |
| `context`                  | Texto de apoio/contexto em Markdown; pode ser `null`.                       |
| `files`                    | Lista de URLs de arquivos associados a questao.                             |
| `correctAlternative`       | Letra da alternativa correta (A a E).                                       |
| `alternativesIntroduction` | Texto introdutorio das alternativas; pode ser `null`.                       |
| `alternatives`             | Lista de alternativas, cada uma com `letter`, `text`, `file` e `isCorrect`. |

Na estrutura oficial, `discipline`, `language`, `context`,
`alternativesIntroduction`, e os campos `text` e `file` de uma alternativa
podem aceitar `null` conforme a especificacao. Uma resposta real tambem deve
ser conferida, pois dados externos podem ter casos incompletos.

### Alternativas e gabarito

Cada alternativa tem uma letra (`A` a `E`) e um texto. A API indica o gabarito
de duas maneiras:

- `correctAlternative` guarda a letra correta, por exemplo `"B"`.
- `alternatives[].isCorrect` e `true` somente para a alternativa certa.

Essas duas informacoes permitem exibir o gabarito ou comparar a escolha da
pessoa. Em uma tela de exercicio, a interface deve evitar revelar a resposta
antes de a pessoa responder.

### Imagens

Imagens podem aparecer como URLs em `files` e/ou no campo `file` de uma
alternativa. Tambem podem estar dentro do texto `context` como Markdown,
por exemplo `![](https://...)`. No exemplo real abaixo, a imagem principal
aparece tanto no Markdown do contexto quanto em `files`.

Como o projeto usa componentes React Native, um texto com Markdown nao vira
automaticamente uma imagem formatada. A futura tela precisara interpretar o
Markdown e carregar a imagem remota; o projeto ja possui `expo-image` como
dependencia, mas ainda nao tem essa renderizacao implementada.

## 4. Exemplo real retornado pela API

Este e o objeto da primeira questao devolvida por
`GET /v1/exams/2023/questions?limit=2&language=ingles`. O conteudo abaixo
mantem os nomes e valores devolvidos pela API:

```json
{
  "title": "Questão 1 - ENEM 2023",
  "index": 1,
  "discipline": "linguagens",
  "language": "ingles",
  "year": 2023,
  "context": "![](https://enem.dev/2023/questions/1-ingles/59a5b837-9914-48b0-a1b4-959562038c9a.png)",
  "files": [
    "https://enem.dev/2023/questions/1-ingles/59a5b837-9914-48b0-a1b4-959562038c9a.png"
  ],
  "correctAlternative": "B",
  "alternativesIntroduction": "Esse cartaz de campanha sugere que",
  "alternatives": [
    {
      "letter": "A",
      "text": "Os lixões precisam de ampliação.",
      "file": null,
      "isCorrect": false
    },
    {
      "letter": "B",
      "text": "O desperdício degrada o ambiente.",
      "file": null,
      "isCorrect": true
    },
    {
      "letter": "C",
      "text": "Os mercados doam alimentos perecíveis.",
      "file": null,
      "isCorrect": false
    },
    {
      "letter": "D",
      "text": "A desnutrição compromete o raciocínio.",
      "file": null,
      "isCorrect": false
    },
    {
      "letter": "E",
      "text": "As residências carecem de refrigeradores.",
      "file": null,
      "isCorrect": false
    }
  ]
}
```

## 5. Limites, disponibilidade e erros

- **Anos:** na consulta feita, o catalogo abrangia 2009-2023. Uma consulta a
  `/exams/2024` retornou HTTP 404 com `No exam found for year 2024`.
- **Quantidade por pagina:** o padrao e 10 e `limit` maior que 50 foi recusado
  com HTTP 400. Use `metadata.hasMore` e `metadata.offset` para paginar.
- **Frequencia:** a documentacao informa limite de 1 requisicao por segundo
  para endpoints sem cache. A janela e recalculada a cada 10 segundos. Em caso
  de excesso, a API retorna HTTP 429. Os cabecalhos documentados incluem
  `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` e
  `Retry-After`.
- **Erros documentados:** HTTP 400 (`bad_request`), 404 (`not_found`), 422
  (`unprocessable_entity`), 429 (`rate_limit_exceeded`) e 500
  (`internal_server_error`). O corpo documentado usa um objeto `error` com
  `code`, `message` e `docUrl`.
- **Area:** a API nao documenta filtro de area na listagem. Os testes com
  `discipline` na query string nao filtraram as questoes.

Na integracao, erros precisam virar estados visiveis na tela (por exemplo,
mensagem para tentar novamente), sem tratar uma falha como se fosse uma lista
vazia bem-sucedida. Para HTTP 429, respeite `Retry-After`; evite repetir a
chamada imediatamente.

## 6. Testes de requisicao realizados

As chamadas foram feitas durante esta investigacao e retornaram:

| Requisicao                                             | Resultado observado                                    |
| ------------------------------------------------------ | ------------------------------------------------------ |
| `GET /v1/exams`                                        | HTTP 200; lista provas e areas/idiomas disponiveis.    |
| `GET /v1/exams/2023/questions?limit=1`                 | HTTP 200; lista paginada e questao real.               |
| `GET /v1/exams/2023/questions/1`                       | HTTP 200; detalhe da questao 1.                        |
| `GET /v1/exams/2023/questions?limit=2&language=ingles` | HTTP 200; questoes com idioma `ingles` e imagem real.  |
| `GET /v1/exams/2024`                                   | HTTP 404; ano sem prova encontrada.                    |
| `GET /v1/exams/2023/questions/999`                     | HTTP 404; numero de questao nao encontrado.            |
| `GET /v1/exams/2023/questions?limit=200`               | HTTP 400; a mensagem informa que o limite maximo e 50. |

As requisicoes de teste foram possiveis a partir deste ambiente. Resultados,
anos e limites podem mudar com atualizacoes futuras da API.

## 7. Como isso se encaixa no projeto atual

Embora a ideia inicial mencione React + TypeScript, o codigo atual e um
aplicativo **Expo com React Native e TypeScript**, usando Expo Router para
navegacao. O Expo tambem permite executar a interface na Web. A estrutura
observada e:

- `src/app/`: telas/rotas do Expo Router.
- `src/components/`: componentes compartilhados de interface.
- `src/constants/`: dados e configuracoes constantes.
- `src/hooks/`: hooks reutilizaveis do React.
- `src/types/`: declaracoes de tipos atuais.

### O que o codigo existente faz

- `src/app/index.tsx`: tela do Dashboard. O componente `DashboardScreen`
  monta a saudacao, o botao que navega para `/questions`, os cartoes de
  indicadores, o progresso por materia e a sugestao de estudo. Os valores
  exibidos sao dados de demonstracao. `MetricCard` reaproveita o layout dos
  cartoes, `TextLabel` aplica o estilo comum ao texto, e `StyleSheet.create`
  agrupa os estilos da tela.
- `src/app/questions.tsx`: rota de Questões; no momento, apenas mostra a tela
  compartilhada para a secao `questions`.
- `src/components/section-screen.tsx`: apresenta telas de placeholder para
  Questões, Debug e Desempenho. Ainda nao busca nem mostra questoes da API.
- `src/constants/dashboard-data.ts`: contem valores ficticios de nivel, XP,
  sequencia, taxa de acerto, materias e recomendacao.
- `src/app/_layout.tsx` e `src/components/app-tabs.tsx`: configuram o tema
  escuro e as abas de navegacao.
- `src/hooks/use-is-wide-layout.ts`: ajuda o Dashboard a ajustar o layout a
  largura da tela.
- `package.json`: declara Expo, React, React Native, TypeScript e os comandos
  para iniciar e verificar o projeto. `expo-image` ja esta listado como
  dependencia.

O `README.md` existente documenta como executar o prototipo e seu escopo.
Nao o alterei nesta tarefa. Nao existe integracao ENEM, persistencia de respostas
ou calculo real de desempenho neste momento.

### Como os dados podem virar uma tela

Em termos simples, uma requisicao HTTP pede dados a um servidor. A resposta e
JSON (texto estruturado em objetos e listas); o TypeScript permite descrever o
formato esperado com tipos, para que o editor ajude a detectar erros enquanto
o codigo e escrito. O tipo nao valida sozinho o conteudo que veio pela rede,
entao a aplicacao ainda precisa lidar com campos nulos, erros e respostas
inesperadas.

Na futura tela de questoes, a aplicacao podera:

1. Consultar `/exams` para preencher uma selecao de ano.
2. Consultar as questoes daquele ano com `limit` e `offset`.
3. Filtrar a lista carregada por `discipline` para exibir a area escolhida.
4. Mostrar `context`, a introducao e as alternativas, carregando as imagens
   referenciadas nos campos de arquivo.
5. Guardar a alternativa escolhida e compara-la com `correctAlternative` ou
   `isCorrect` para dar retorno.

## 8. Recomendacao para a integracao futura

A maneira mais simples, mantendo a arquitetura atual, e deixar as chamadas
HTTP fora dos componentes visuais:

1. Criar um pequeno servico, por exemplo `src/services/enem-api.ts`, com
   funcoes para listar provas e buscar paginas de questoes usando o `fetch`
   nativo.
2. Definir tipos TypeScript para prova, questao, alternativa e resposta
   paginada em um arquivo dedicado, sem misturar esses tipos com
   `src/types/styles.d.ts`.
3. Conectar o servico a tela `src/app/questions.tsx` (ou a um hook chamado por
   ela), mantendo estados de carregamento, erro, lista vazia e dados carregados.
4. Buscar uma pagina por vez, respeitar `hasMore`, manter `limit` ate 50 e
   limitar a frequencia das chamadas.
5. Aplicar o filtro por area no cliente, pois a API nao oferece esse filtro na
   query documentada.

Isso comeca com o menor numero de partes novas: uma camada de acesso a API,
tipos para os dados externos e a tela que consome esses dados. Nao e necessario
adicionar uma biblioteca HTTP para essa primeira etapa. A implementacao deve
ser feita apenas quando a integracao for autorizada.

## 9. Fontes oficiais

- [Pagina da API ENEM](https://api.enem.dev/)
- [Documentacao: introducao](https://docs.enem.dev/introduction.md)
- [Documentacao: listar provas](https://docs.enem.dev/api-reference/provas/listar-provas.md)
- [Documentacao: listar uma prova](https://docs.enem.dev/api-reference/provas/listar-prova.md)
- [Documentacao: listar questoes](https://docs.enem.dev/api-reference/questões/listar-questões.md)
- [Documentacao: listar uma questao](https://docs.enem.dev/api-reference/questões/listar-questão.md)
- [Documentacao: limites](https://docs.enem.dev/rate-limits.md)
- [Documentacao: erros](https://docs.enem.dev/errors.md)
- [Repositorio oficial da API](https://github.com/yunger7/enem-api)
