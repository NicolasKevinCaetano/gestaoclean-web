# GestãoClean Web — atualização Higienizei

Esta versão substitui a identidade visual demonstrativa do Mantis pela Higienizei, mantém a comunicação com a API e acrescenta cadastro, edição e desativação lógica de clientes.

## Como atualizar no IntelliJ IDEA

1. Faça uma cópia de segurança da pasta atual `C:\Projetos\gestaoclean-web-inicial\gestaoclean-web`.
2. Extraia este ZIP. Abra a pasta `gestaoclean-web` no IntelliJ IDEA (File > Open).
3. No terminal **dentro da pasta que contém `package.json`**, execute `npm.cmd install` e `npm.cmd run start`.
4. Abra o endereço exibido pelo Vite (normalmente http://localhost:3000/free).
5. Inicie o backend GestãoClean API na porta 8080.

## Mudanças

- Logo Higienizei no menu e no login; novo texto no cabeçalho e rodapé.
- Remoção da propaganda Mantis Pro e do botão GitHub demonstrativo no cabeçalho.
- Dashboard com cabeçalho da Higienizei, indicadores com títulos legíveis e formatação de valores monetários.
- Pesquisa em todas as tabelas; clientes com cadastro (POST), edição (PUT) e desativação (DELETE).
- Ajustadas as versões de `eslint` e `@eslint/js` para 9.39.1, corrigindo o conflito de instalação reportado.

## Limites e próximos passos

- Não foi possível testar a API que roda apenas no computador do usuário; valide operações com dados de teste.
- Formulários de agendamentos, ordens de serviço e financeiro ainda não foram implementados.
- O backend atualmente não retorna o perfil no login/JWT. A detecção de ADMIN permanece provisória por consulta ao dashboard; recomenda-se corrigir no backend.
- As imagens da marca foram fornecidas pelo usuário. Créditos e condições de uso do template Mantis original devem ser preservados conforme sua licença.
