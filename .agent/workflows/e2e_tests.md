---
description: Como executar testes End-to-End para o Nexo SGFM
---

Este workflow orienta-o na execução dos testes E2E automatizados usando o browser_subagent.

## Pré-requisitos
1. Garantir que o servidor está a correr: `npm run dev`.
2. Garantir que a base de dados está limpa/nova: `node clear_db.js`.
3. O servidor deve estar acessível em `http://localhost:3000/`.

## Passos do Workflow

1. **Iniciar a Aplicação**
   - Execute `npm run dev` num terminal se ainda não estiver a correr.

2. **Executar Teste de Login Básico**
// turbo
   - Use o `browser_subagent` para visitar `http://localhost:3000/`, fazer login como `admin@nexo.com` e verificar as métricas do dashboard.

3. **Verificar Criação de Ativos**
// turbo
   - Use o `browser_subagent` para navegar para a página de Ativos, criar um novo ativo "Unidade de Teste X" e confirmar que aparece na lista.

4. **Verificar Fluxo de Incidentes**
// turbo
   - Use o `browser_subagent` para criar um incidente para a "Unidade de Teste X", depois navegue para a lista de Incidentes para confirmar que existe e está atribuído.

5. **Teste do Portal do Cliente**
// turbo
   - Use o `browser_subagent` para visitar o login do portal do cliente, introduzir as credenciais de teste (criadas em `clear_db.js`) e verificar se o dashboard carrega para o cliente.
