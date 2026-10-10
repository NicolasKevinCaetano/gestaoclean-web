# GestãoClean Web — Mantis React/Vite

## Rodar localmente

1. Inicie o backend Spring Boot na porta 8080.
2. Abra esta pasta no terminal, execute `npm install` e `npm run start`.
3. Abra http://localhost:3000 e entre com um usuário cadastrado na API.

O Vite redireciona `/api/*` para `http://localhost:8080/*` em desenvolvimento. Não é necessário habilitar CORS para esse cenário.

## O que foi integrado

- Login real em `POST /auth/login` com `email` e `senha`.
- Token JWT em `sessionStorage`, enviado como Bearer nas chamadas.
- Proteção de rotas e navegação por perfil (a API continua responsável pela autorização real).
- Dashboard consultando `GET /dashboard?inicio=...&fim=...`.
- Listagens de clientes, agendamentos, ordens de serviço, pagamentos, despesas e usuários.

## Próximos ajustes

Esta é a **primeira integração funcional**, não um CRUD completo. As tabelas exibem os campos retornados pela API, sem formulários de cadastro/edição/exclusão. Conferir os formatos exatos do LoginResponseDTO e de cada endpoint durante testes com backend ativo. O frontend não foi testado contra sua API local.

A versão enviada do Mantis usa JavaScript/JSX, não TypeScript. Mantivemos essa base para preservar compatibilidade com o template.
