<div align="center">

# 🎓 ENEM.DEV

### `Compile seu conhecimento. Faça deploy do seu futuro.`

**Uma plataforma de estudos gamificada para quem quer evoluir no ENEM.**

Questões • Revisões • Redações • Conquistas • Progresso

![Expo](https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Platform](https://img.shields.io/badge/Platform-Web%20%7C%20Android-22C55E?style=for-the-badge)

· [🐛 Reportar problema](https://github.com/RenanoRuim/ENEM.DEV/issues)**

</div>

---

## 📖 Sobre o projeto

O **ENEM.DEV** é uma aplicação de estudos desenvolvida para tornar a preparação para o Exame Nacional do Ensino Médio (ENEM) mais interativa, organizada e motivadora.

A plataforma reúne questões de edições anteriores do exame, revisão de erros, acompanhamento de desempenho, prática de redações e elementos de gamificação.

Seu objetivo é ajudar estudantes a desenvolver uma rotina de estudos consistente, identificar dificuldades e acompanhar sua evolução.

O aplicativo foi desenvolvido com **Expo, React Native, TypeScript e Expo Router**, com suporte à Web e a dispositivos móveis.

> [!NOTE]
> **Desenvolvimento com Vibe Coding**
>
> O ENEM.DEV foi desenvolvido predominantemente com o auxílio de ferramentas de Inteligência Artificial.
>
> A concepção do produto, a definição das funcionalidades, o direcionamento do desenvolvimento, os testes e as decisões de evolução foram conduzidos pelo criador do projeto.
>
> Grande parte da implementação do código foi realizada por IA a partir de instruções em linguagem natural.
>
> Essa abordagem faz parte da proposta experimental do projeto e é apresentada de forma transparente.

---

## 💡 Como surgiu o ENEM.DEV?

O projeto nasceu de uma necessidade pessoal: **encontrar uma forma mais interessante e organizada de estudar para o ENEM**.

A ideia era criar uma ferramenta que fosse além de apresentar questões e mostrar respostas.

Queria desenvolver um ambiente em que fosse possível:

- Praticar questões de provas anteriores.
- Identificar os conteúdos com maior dificuldade.
- Revisar questões respondidas incorretamente.
- Acompanhar o progresso ao longo dos estudos.
- Criar o hábito de estudar diariamente.
- Praticar redações e organizar materiais de revisão.

A identidade visual e a gamificação foram inspiradas no universo da programação.

Por isso, o ENEM.DEV utiliza conceitos como **Debug Mode**, **Daily Commit** e **Review Build**.

A proposta é simples:

**Estudar, identificar erros, aprender com eles e continuar evoluindo.**

---


## 🚀 Funcionalidades

### 📚 Banco de questões

Pratique utilizando questões de edições anteriores do ENEM, carregadas por meio de uma API comunitária.

**Funcionalidades:**

- Seleção do ano da prova.
- Filtros por área do conhecimento.
- Seleção de idioma quando aplicável.
- Verificação das alternativas.
- Histórico de respostas.
- Identificação de questões concluídas.
- Tratamento de questões incompletas ou indisponíveis.

### 🐛 Debug Mode

Um sistema de revisão inspirado na depuração de código.

Quando o estudante erra uma questão, ela passa a integrar sua fila de revisão.

Ao responder corretamente em uma nova tentativa, a questão deixa de estar pendente.

**O objetivo não é apenas acertar, mas aprender com os erros.**

### 📝 Explicações de questões

O ENEM.DEV permite consultar explicações cadastradas no catálogo do aplicativo e registrar anotações pessoais.

O estudante pode:

- Consultar explicações disponíveis.
- Registrar seu próprio raciocínio.
- Comentar alternativas individualmente.
- Adicionar fontes consultadas.
- Editar suas anotações.
- Marcar questões para revisão.

As explicações pessoais são independentes do catálogo distribuído com o aplicativo.

### 🧪 Review Build

O **Review Build** permite criar sessões personalizadas de revisão.

As questões podem ser selecionadas a partir de critérios como:

- Questões respondidas incorretamente.
- Questões favoritas.
- Questões com explicações pessoais.

A proposta é oferecer uma maneira de revisitar conteúdos já estudados e avaliar a retenção do conhecimento.

### ✍️ Redação Lab

Um ambiente dedicado à prática de redações.

**Recursos:**

- Catálogo de temas.
- Temas oficiais e autorais, quando disponíveis.
- Criação de temas personalizados.
- Editor de redações.
- Salvamento de rascunhos.
- Histórico de textos.
- Contador de palavras.
- Cronômetro opcional.
- Checklist de autoavaliação.
- Guia das cinco competências do ENEM.
- Exportação de redações.

Os estudantes podem utilizar temas disponibilizados pelo aplicativo ou criar suas próprias propostas.

O Redação Lab não atribui notas oficiais e não substitui a avaliação realizada por professores ou corretores especializados.

### 🏆 Gamificação

O sistema de gamificação foi desenvolvido para incentivar a continuidade dos estudos.

Inclui:

- Pontos de experiência (XP).
- Progressão de níveis.
- **25 conquistas**.
- Indicadores de progresso.
- Feedback visual.
- Recompensas por atividades válidas.

As regras procuram evitar a obtenção ilimitada de XP pela repetição das mesmas questões.

### 🔥 Daily Commit

O Daily Commit incentiva a criação de uma rotina de estudos.

O estudante pode definir uma meta diária e acompanhar:

- Questões respondidas no dia.
- Metas concluídas.
- Sequências de estudo.
- Histórico de consistência.

A inspiração vem da prática de realizar commits frequentes durante o desenvolvimento de software.

### 📊 Dashboard de desempenho

O dashboard apresenta indicadores baseados no histórico real do estudante:

- Tentativas realizadas.
- Acertos e erros.
- Taxa de acerto.
- Desempenho por área.
- Questões concluídas.
- Pendências de revisão.
- XP e nível atual.

---

## 🛠️ Tecnologias

| Tecnologia | Finalidade |
|---|---|
| React Native | Desenvolvimento multiplataforma |
| Expo | Ambiente de desenvolvimento e build |
| TypeScript | Linguagem de programação |
| Expo Router | Navegação |
| ENEM.DEV API | Fonte externa de questões |
| Armazenamento local | Persistência do progresso e das redações |

O projeto utiliza uma arquitetura orientada a componentes, com separação entre interface, tipos, serviços e dados.

---

## 📂 Estrutura do projeto

A estrutura segue os padrões utilizados pelo Expo Router.

```text
ENEM.DEV/
├── src/
│   ├── app/          # Rotas e telas
│   ├── components/   # Componentes reutilizáveis
│   ├── constants/    # Configurações
│   ├── hooks/        # Hooks personalizados
│   ├── services/     # Serviços e integrações
│   └── types/        # Tipagens
│
├── assets/           # Imagens e recursos visuais
├── package.json
├── app.json
└── README.md
```

*A estrutura apresentada é ilustrativa e deve ser ajustada conforme os arquivos atuais do repositório.*

---

## 💻 Executando localmente

### Pré-requisitos

- Node.js.
- npm.
- Git, para clonar o repositório.

### 1. Clone o projeto

```bash
git clone URL_DO_REPOSITORIO
```

Entre na pasta:

```bash
cd enem-dev
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Execute na Web

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

A execução nativa depende das ferramentas e configurações disponíveis no ambiente.

---

## 💾 Armazenamento e privacidade

O ENEM.DEV foi projetado para funcionar sem exigir uma conta de usuário.

O progresso de estudos, as anotações e as redações são armazenados localmente no ambiente utilizado.

**Limitações importantes:**

- O progresso não é sincronizado automaticamente entre dispositivos.
- A limpeza dos dados locais pode apagar informações armazenadas.
- A disponibilidade das questões depende da API externa.
- Não há garantia de funcionamento integral sem conexão com a internet.

Recomenda-se manter cópias dos textos e dados importantes quando houver ferramentas de exportação disponíveis.

---

## 🌐 Fonte das questões

O aplicativo utiliza a **ENEM.DEV API**, mantida pela comunidade.

**Documentação:** https://api.enem.dev/

**Repositório:** https://github.com/yunger7/enem-api

O conteúdo disponibilizado pela API pode apresentar limitações, incluindo:

- Enunciados incompletos.
- Imagens ausentes.
- Problemas de formatação.
- Inconsistências nos dados.
- Indisponibilidade temporária.

O aplicativo procura identificar questões inválidas antes de permitir que sejam respondidas.

> [!IMPORTANT]
> O ENEM.DEV é um projeto independente e não possui vínculo oficial com o INEP ou com o Ministério da Educação (MEC).

---

## 🤖 Desenvolvimento com Vibe Coding

### O que significa?

O termo **Vibe Coding** descreve uma abordagem de desenvolvimento em que ferramentas de Inteligência Artificial são utilizadas para gerar e modificar código a partir de instruções em linguagem natural.

No ENEM.DEV, essa abordagem foi utilizada extensivamente.

### Como o projeto foi desenvolvido?

O processo envolveu:

1. Identificar um problema real.
2. Definir a proposta da aplicação.
3. Planejar funcionalidades e comportamentos.
4. Utilizar IA para implementar o código.
5. Testar as funcionalidades.
6. Identificar erros e limitações.
7. Solicitar correções e melhorias.
8. Refinar a experiência do usuário.

### Qual foi o papel do criador?

O criador foi responsável por idealizar o produto, direcionar seu desenvolvimento, definir prioridades, avaliar funcionalidades e realizar testes.

A implementação foi realizada majoritariamente com auxílio de Inteligência Artificial.

O projeto não é apresentado como um aplicativo inteiramente programado manualmente.

**A transparência sobre o uso de IA é parte importante da documentação do ENEM.DEV.**

---

## 🗺️ Roadmap

### Versão 1.0 — Base da plataforma

- [x] Integração com questões do ENEM.
- [x] Histórico de respostas.
- [x] Debug Mode.
- [x] Dashboard de desempenho.
- [x] XP, níveis e conquistas.
- [x] Daily Commit.

### Versão 2.0 — Ambiente de estudos

- [x] Sistema de explicações.
- [x] Redação Lab.
- [x] Temas personalizados.
- [x] Guia de competências.
- [x] Explicações pessoais.
- [x] Review Build.
- [x] Finalizar e validar suporte a imagens nos textos motivadores.
- [x] Validar exportação de redações em todas as plataformas.

### Versão 3.0 — Próximos passos

- [ ] Ampliar o catálogo de questões.
- [ ] Investigar integração com Inteligência Artificial.
- [ ] Estudar correção assistida de redações.
- [ ] Melhorar recomendações de estudo.
- [ ] Explorar novas ferramentas de revisão.

As funcionalidades futuras estão sujeitas a mudanças.

---

## 👨‍💻 Créditos

**Idealizado e conduzido por Pedro Renan.**

O ENEM.DEV surgiu como uma ferramenta pessoal de estudos e evoluiu com o objetivo de também ajudar amigos e outros estudantes na preparação para o ENEM.

O desenvolvimento utilizou extensivamente ferramentas de Inteligência Artificial por meio de Vibe Coding.


---

## 📄 Licença

**Licença a definir.**

---

<div align="center">

### `ENEM.DEV`

**Compile seu conhecimento. Faça deploy do seu futuro.**

Feito para estudar, aprender e evoluir. 🚀

</div>
