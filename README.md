# 🎓 ENEM.DEV

### `Compile seu conhecimento. Faça deploy do seu futuro.`

**ENEM.DEV** é uma plataforma de estudos gamificada, desenvolvida para tornar a preparação para o Exame Nacional do Ensino Médio (ENEM) mais organizada, interativa e motivadora.

A aplicação combina questões reais de edições anteriores do exame, acompanhamento de desempenho, revisão de erros e elementos de gamificação, como XP, níveis, conquistas e metas diárias.

O projeto foi desenvolvido com **Expo, React Native, TypeScript e Expo Router**, oferecendo uma experiência responsiva para Web e dispositivos móveis.

> **🤖 Projeto desenvolvido com Vibe Coding**
>
> O ENEM.DEV foi construído majoritariamente com o auxílio de ferramentas de Inteligência Artificial, utilizando a abordagem conhecida como **Vibe Coding**.
>
> A IA foi responsável por grande parte da implementação do código, enquanto o desenvolvimento do projeto envolveu a definição da ideia, das funcionalidades, das regras de negócio, da experiência do usuário, além de testes, identificação de problemas e decisões sobre melhorias.
>
> O objetivo também foi experimentar o uso da IA como ferramenta de desenvolvimento e compreender as possibilidades e limitações dessa abordagem na criação de um produto funcional.

---

## 💡 Como surgiu o projeto?

O ENEM.DEV nasceu de um problema pessoal: **a necessidade de estudar para o ENEM**.

Durante a preparação para o exame, surgiu a ideia de criar uma ferramenta que tornasse o processo de estudo mais interessante e ajudasse a acompanhar a evolução ao longo do tempo.

A proposta era simples: desenvolver uma plataforma em que responder questões não fosse apenas uma atividade repetitiva, mas parte de um sistema de progresso.

Inspirado em conceitos de programação e desenvolvimento de software, o ENEM.DEV transforma atividades de estudo em uma experiência gamificada.

Cada questão respondida representa uma oportunidade de aprender, corrigir erros e evoluir.

Além de servir como ferramenta de estudos, o projeto também se tornou uma experiência prática de desenvolvimento de software com Inteligência Artificial.

---

## 🚀 Funcionalidades

### 📚 Questões do ENEM

A plataforma utiliza a API pública ENEM.DEV para carregar questões de edições anteriores do exame.

**Recursos disponíveis:**
- Seleção do ano da prova.
- Filtros por área do conhecimento.
- Seleção de idioma quando aplicável.
- Visualização de enunciados e alternativas.
- Verificação das respostas.
- Controle de progresso para evitar repetições desnecessárias.
- Tratamento de questões com conteúdo incompleto ou indisponível.

### 🐛 Debug Mode

O **Debug Mode** é um sistema de revisão inspirado no processo de depuração de código.

Quando uma questão é respondida incorretamente, ela passa a fazer parte da fila de revisão.

O estudante pode retornar a essas questões e tentar resolvê-las novamente.

Ao acertar, a questão deixa a fila de pendências.

**A ideia é simples: identificar erros, corrigi-los e continuar evoluindo.**

### 📊 Desempenho

O ENEM.DEV acompanha o desempenho do estudante com base nas respostas registradas.

Entre os indicadores estão:

- Total de tentativas.
- Quantidade de acertos e erros.
- Taxa de acerto.
- Desempenho por área do conhecimento.
- Questões concluídas.
- Questões pendentes de revisão.

Os indicadores são calculados a partir dos dados reais de utilização, sem depender de estatísticas fictícias.

### ⚡ Sistema de XP e níveis

O estudante recebe pontos de experiência (XP) ao realizar atividades válidas dentro da plataforma.

O XP permite avançar de nível e acompanhar a evolução nos estudos.

O sistema possui regras para evitar que a repetição indevida de uma mesma questão gere recompensas ilimitadas.

### 🏆 Conquistas

A plataforma possui **25 conquistas**, organizadas em diferentes categorias:

- **Início:** primeiros passos na plataforma.
- **Estudos:** quantidade de questões respondidas.
- **Precisão:** questões resolvidas corretamente.
- **Debug Mode:** correção de erros.
- **Consistência:** frequência nos estudos.
- **Exploração:** atividades nas diferentes áreas do ENEM.
- **Evolução:** progressão de níveis.

As conquistas são desbloqueadas de acordo com o progresso real do estudante.

### 🔥 Daily Commit

Inspirado na ideia de realizar commits frequentes durante o desenvolvimento de software, o **Daily Commit** incentiva a consistência nos estudos.

O estudante pode acompanhar:

- Meta diária de questões.
- Progresso da meta.
- Dias consecutivos de estudo.
- Maior sequência alcançada.
- Histórico de metas concluídas.

O objetivo é incentivar o hábito de estudar regularmente, valorizando a consistência ao longo do tempo.

### 💾 Progresso persistente

O histórico de respostas, o progresso das questões e os dados de gamificação são armazenados localmente.

Assim, o estudante pode fechar e reabrir o aplicativo sem perder seu progresso no mesmo ambiente.

**Observação:** atualmente, o projeto não possui sincronização de progresso entre diferentes dispositivos.

---

## 🛠️ Tecnologias utilizadas

| Tecnologia | Utilização |
|---|---|
| React Native | Construção da interface multiplataforma |
| Expo | Desenvolvimento e execução do aplicativo |
| TypeScript | Linguagem utilizada no projeto |
| Expo Router | Navegação e organização das rotas |
| ENEM.DEV API | Fornecimento das questões do ENEM |

A aplicação utiliza uma interface responsiva, com navegação lateral em telas maiores e navegação inferior em dispositivos móveis.

---

## 📂 Estrutura do projeto

A organização segue a estrutura existente do Expo e do Expo Router.

```text
ENEM.DEV/
├── src/
│   ├── app/          # Telas e rotas
│   ├── components/   # Componentes reutilizáveis
│   ├── constants/    # Constantes e configurações
│   ├── hooks/        # Hooks personalizados
│   ├── services/     # Integrações e serviços
│   └── types/        # Definições de tipos
│
├── assets/           # Recursos visuais
├── package.json
├── app.json
└── README.md
```

*A estrutura pode variar conforme a evolução do projeto.*

---

## 💻 Como executar

### Pré-requisitos

- Node.js instalado.
- npm disponível.
- Git, caso deseje clonar o repositório.

### 1. Obtenha o código-fonte

Clone o repositório pelo Git ou faça o download dos arquivos pelo GitHub.

### 2. Instale as dependências

Na pasta principal do projeto, execute:

```bash
npm install
```

### 3. Execute a versão Web

```bash
npm run web
```

### 4. Execute no Android

```bash
npm run android
```

### 5. Execute no iOS

```bash
npm run ios
```

A execução nativa depende da configuração do ambiente e da compatibilidade com as ferramentas do Expo.

---

## 🌐 API utilizada

O ENEM.DEV utiliza a **ENEM.DEV API**, um projeto comunitário que disponibiliza dados de questões de edições anteriores do ENEM.

**Documentação da API:**

https://api.enem.dev/

**Repositório da API:**

https://github.com/yunger7/enem-api

A aplicação utiliza essa API como fonte externa de conteúdo e não controla diretamente a disponibilidade ou a integridade de todos os dados fornecidos.

### ⚠️ Limitações conhecidas

Por depender de uma API externa, algumas questões podem apresentar:

- Enunciados ausentes ou incompletos.
- Imagens indisponíveis.
- Problemas de formatação.
- Informações inconsistentes.
- Falhas temporárias de carregamento.

A aplicação possui mecanismos para validar os dados e evitar que questões incompletas sejam respondidas normalmente.

Entretanto, nem todas as limitações da fonte externa podem ser resolvidas diretamente pelo aplicativo.

**O ENEM.DEV é um projeto independente, sem vínculo oficial com o INEP ou com o Ministério da Educação (MEC).**

---

## 🤖 Desenvolvimento com Inteligência Artificial

### O papel do Vibe Coding

O desenvolvimento do ENEM.DEV foi realizado predominantemente por meio de **Vibe Coding**, uma abordagem em que ferramentas de Inteligência Artificial são utilizadas para gerar e modificar código a partir de instruções em linguagem natural.

Em vez de escrever manualmente a maior parte da implementação, o processo envolveu descrever funcionalidades, estabelecer comportamentos esperados, analisar resultados e solicitar correções e melhorias.

O uso da IA esteve presente em diferentes etapas, incluindo:

- Construção da interface.
- Implementação das funcionalidades.
- Integração com a API.
- Desenvolvimento da gamificação.
- Implementação da persistência de dados.
- Correção de bugs.
- Melhorias de responsividade e animações.

### Qual foi meu papel?

Minha participação esteve principalmente na concepção e na condução do projeto:

- Identificação do problema que motivou a aplicação.
- Definição da proposta e das funcionalidades.
- Planejamento da experiência de estudo.
- Definição e refinamento das regras de funcionamento.
- Testes das funcionalidades implementadas.
- Identificação de erros e comportamentos inesperados.
- Solicitação e avaliação de correções.
- Decisões sobre prioridades e evolução do produto.

### Por que utilizar Vibe Coding?

Um dos objetivos foi explorar até que ponto ferramentas de IA poderiam auxiliar na transformação de uma ideia em um aplicativo funcional.

A experiência também permitiu observar desafios importantes, como a necessidade de validar o código gerado, compreender as limitações das integrações externas e garantir que diferentes funcionalidades trabalhassem corretamente em conjunto.

**O ENEM.DEV não é apresentado como um projeto inteiramente programado manualmente. O uso extensivo de Inteligência Artificial faz parte da proposta experimental e do processo de desenvolvimento.**

---

## 🔮 Melhorias futuras

O ENEM.DEV poderá receber novas funcionalidades, como:

- **Redação Lab:** módulo para prática de redações com temas do ENEM.
- **Assistente de IA:** apoio na análise de redações e sugestões de estudo.
- **Simulados:** sessões de estudo com quantidade definida de questões.
- **Revisão inteligente:** priorização de conteúdos conforme as dificuldades.
- **Autenticação:** contas individuais.
- **Sincronização em nuvem:** progresso compartilhado entre dispositivos.
- **Modo offline:** acesso a conteúdos previamente disponibilizados.

Essas funcionalidades são possibilidades futuras e não fazem parte da versão atual.

---

## 🎯 Objetivo do projeto

O ENEM.DEV busca unir três interesses:

**Educação, programação e tecnologia.**

A proposta é transformar uma necessidade real de estudo em uma experiência interativa e, ao mesmo tempo, explorar novas formas de desenvolver software utilizando Inteligência Artificial.

O projeto continuará evoluindo conforme novas ideias, testes e aprendizados.

---

### `ENEM.DEV`

**Compile seu conhecimento. Faça deploy do seu futuro.**

*Projeto independente desenvolvido para fins educacionais e de aprendizado em desenvolvimento de software.*
