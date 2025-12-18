# SGI

O **SGI** é uma plataforma integrada de gestão de projetos, tarefas, contatos e comunicação interna, construída com Next.js, Firebase e IA. O sistema foi projetado para otimizar as operações de back-office e vendas.

## Funcionalidades Desenvolvidas

### Painel de Controle (Dashboard)

*   **Visão Geral:** Centraliza os principais indicadores de desempenho (KPIs), como projetos ativos, tarefas abertas e valor total de projetos.
*   **Análise de Tarefas:** Exibe um gráfico que ilustra a distribuição de tarefas por etapa (A Fazer, Em Progresso, Concluído).
*   **Colaboração com IA:** Apresenta um resumo diário das conversas de chat entre usuários, gerado por inteligência artificial.

### Comercial

*   **Agenda de Contatos:** Centraliza o gerenciamento de todos os contatos da empresa, organizados em abas: **Clientes**, **Fornecedores** e **Parceiros**. Oferece formulários completos para criar, editar e excluir contatos, além de funcionalidades de importação/exportação.
*   **Gestão de Produtos:** Permite cadastrar e gerenciar os produtos e serviços oferecidos pela empresa, com status de "Ativo" ou "Inativo".
*   **Gestão de Selos:** Sistema para emitir, monitorar e gerenciar a validade de selos de certificação para clientes e produtos específicos.

### Operacional

*   **Funil de Tarefas (Kanban):**
    *   **Gestão Visual:** Um quadro Kanban interativo onde você pode arrastar e soltar tarefas entre as etapas do projeto.
    *   **Criação Detalhada:** Permite criar projetos e tarefas com informações completas, incluindo responsável, datas, dependências e recorrência (diária, semanal, mensal).
    *   **Controle de Acesso por Papel:** "Gestores" têm uma visão completa de todas as tarefas, enquanto "Usuários" visualizam apenas as que lhes foram atribuídas.
*   **Gestão de Arquivos:** Funcionalidade para anexar arquivos diretamente aos projetos (usando Firebase Storage).
*   **Checklists:** Crie e gerencie checklists padronizados para processos internos, associando-os a equipes específicas para garantir a consistência das operações.

### Gestão de Ativos

*   **Inventário de Ativos:** Gerenciamento de ativos físicos e digitais, com histórico de movimentações e agendamento de manutenções.
*   **Contratos de Uso:** Crie, gerencie e gere relatórios de contratos de uso de ativos, vinculando-os a usuários e registrando termos de entrega e devolução.
*   **Manutenções:** Agende e acompanhe o status das manutenções preventivas e corretivas dos ativos.
*   **Modelos de Documentos:** Crie e gerencie templates reutilizáveis para contratos e termos.

### Financeiro

*   **Painel Financeiro:** Visão geral para gestores com KPIs de solicitações de reembolso, como valores pendentes, aprovados e recusados.
*   **Gestão de Reembolsos:** Permite que usuários solicitem reembolsos com anexo de comprovantes e que gestores aprovem ou recusem as solicitações.
*   **Centro de Custos:** Crie e organize os centros de custo da empresa para um melhor rastreamento financeiro.
*   **Gestão de Contratos:** Centralize o armazenamento e a gestão de contratos de serviços, garantias e outros documentos importantes.

### Equipe e Colaboração

*   **Agenda de Tarefas (Calendário):**
    *   Visualização em calendário que destaca os dias com tarefas agendadas.
    *   Ao selecionar um dia, exibe a lista de tarefas correspondente.
    *   Visão diferenciada para "Gestores" (que podem filtrar por usuário) e "Usuários" (que veem apenas suas próprias tarefas).
*   **Chat Interno:** Sistema de mensagens em tempo real para colaboração entre os membros da equipe.
*   **Usuários & Equipes:**
    *   **Gerenciamento de Usuários:** Formulário completo para cadastrar e editar usuários com informações detalhadas. Inclui gestão de status (ativo, inativo, suspenso) e log de atividades.
    *   **Gerenciamento de Equipes:** Permite criar, editar e organizar equipes, associando usuários a uma ou mais equipes.
    *   **Gerenciamento de Cargos & Diretorias:** Defina cargos, níveis hierárquicos, responsabilidades e permissões (Gestor/Dev), vinculando equipes a diretorias.

### Suporte & Ferramentas

*   **Central de Suporte:** Sistema de abertura e acompanhamento de tickets de suporte técnico e operacional com níveis de prioridade.
*   **Ferramentas de Desenvolvedor:** Página exclusiva para desenvolvedores com utilitários para testes, como simulador de notificações, monitor de erros, testador de IA e gerenciador de feature flags.

### Autenticação e Segurança

*   Sistema de login com e-mail e senha, integrado ao Firebase Authentication.
*   Mecanismo de definição de senha via link seguro para novos usuários.
*   Permissões de acesso baseadas em cargos (claims), atualizadas dinamicamente via Cloud Functions, para garantir a segurança dos dados.

## Como Começar

Para rodar este projeto, navegue até o diretório e execute o comando `npm run dev`.

```bash
npm run dev
```
