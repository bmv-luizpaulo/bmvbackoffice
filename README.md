# BMV Nexus

O **BMV Nexus** é uma plataforma integrada de gestão de projetos, tarefas, contatos e comunicação interna, construída com Next.js, Firebase e IA. O sistema foi projetado para otimizar as operações de back-office e vendas.

## Funcionalidades Desenvolvidas

1.  **Painel de Controle (Dashboard):**
    *   **Visão Geral:** Centraliza os principais indicadores de desempenho (KPIs), como projetos ativos, tarefas abertas e valor total de projetos.
    *   **Análise de Tarefas:** Exibe um gráfico que ilustra a distribuição de tarefas por etapa (A Fazer, Em Progresso, Concluído).
    *   **Colaboração com IA:** Apresenta um resumo diário das conversas de chat, gerado por inteligência artificial.

2.  **Funil de Projetos (Kanban):**
    *   **Gestão Visual:** Um quadro Kanban interativo onde você pode arrastar e soltar tarefas entre as etapas do projeto.
    *   **Criação Detalhada:** Permite criar projetos e tarefas com informações completas, incluindo responsável, datas, dependências e recorrência (diária, semanal, mensal).
    *   **Controle de Acesso por Papel:** "Gestores" têm uma visão completa de todas as tarefas, enquanto "Funcionários" visualizam apenas as que lhes foram atribuídas.
    *   **Gestão de Arquivos:** Funcionalidade para anexar arquivos diretamente aos projetos (usando Firebase Storage).

3.  **Agenda de Tarefas (Calendário):**
    *   Visualização em calendário que destaca os dias com tarefas agendadas.
    *   Ao selecionar um dia, exibe a lista de tarefas correspondente.
    *   Visão diferenciada para "Gestores" (que podem filtrar por funcionário) e "Funcionários" (que veem apenas suas próprias tarefas).

4.  **Agenda de Contatos:**
    *   Centraliza o gerenciamento de todos os contatos da empresa.
    *   Organizado em abas: **Clientes**, **Fornecedores**, **Parceiros** e **Funcionários**.
    *   Oferece formulários completos para criar, editar e excluir contatos.

5.  **Chat Interno:**
    *   Sistema de mensagens em tempo real para colaboração entre os membros da equipe.
    *   As conversas são salvas e carregadas dinamicamente, permitindo a criação de novos chats a qualquer momento.

6.  **Usuários & Equipes:**
    *   **Gerenciamento de Usuários:** Formulário completo para cadastrar e editar usuários com informações detalhadas (nome, contato, endereço, documentos, cargo).
    *   **Gerenciamento de Núcleos (Equipes):** Permite criar, editar e organizar equipes, associando usuários a um ou mais "núcleos" (ex: Contabilidade, TI).

7.  **Autenticação Segura:**
    *   Sistema de login com e-mail e senha, integrado ao Firebase Authentication.

## Como Começar

Para rodar este projeto, navegue até o diretório e execute o comando `npm run dev`.
