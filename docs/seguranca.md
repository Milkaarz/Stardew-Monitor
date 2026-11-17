# Segurança

## Acesso ao painel

- Login obrigatório para tudo que não seja `/api/health` (e o resumo público opcional).
- Senhas com **scrypt** (sal aleatório); mínimo de 10 caracteres. Usuário inexistente leva o mesmo tempo para responder que senha errada.
- Sessão: token aleatório de 256 bits em cookie `HttpOnly` + `SameSite=Strict` (+ `Secure` em HTTPS). O banco guarda só o hash. Expira após 12 h sem uso (configurável). Trocar a senha encerra as outras sessões.
- **CSRF**: toda alteração exige o cabeçalho `X-CSRF-Token` da sessão.
- **Papéis**: `admin` faz tudo; `viewer` só lê. Não é possível remover ou rebaixar o último administrador.
- **Rate limiting**: geral (600/min por IP), login (10 por 15 min por IP+usuário), agentes (240/min), encerramento de processos (10/min).
- Cabeçalhos com Helmet: CSP restritiva (só recursos do próprio domínio; fontes empacotadas, sem CDN), `X-Content-Type-Options`, `frame-ancestors 'none'`, HSTS em produção.

## Agentes

- Token individual por máquina (`sdm_` + 256 bits), mostrado uma vez; o servidor guarda só o SHA-256.
- Assinatura HMAC-SHA256 do corpo + carimbo de tempo (±5 min) + bloqueio de replay.
- HTTPS obrigatório para servidores remotos (o agente recusa `http://` fora de localhost).
- Leituras validadas com esquema (tipos, tamanhos de listas e textos); campos desconhecidos são descartados.
- Comandos só na resposta ao envio do próprio agente, e execução só com consentimento local (`STARDEW_ALLOW_REMOTE_KILL`).

## Encerrar processos ("Expulsar morador")

Nunca disponível por API pública. Exige, ao mesmo tempo: sessão de **administrador**, **CSRF**, **senha digitada de novo**, **confirmação explícita** (`confirm: true`) e limite de 10/min. Antes de agir, o servidor confere que o PID ainda pertence ao **mesmo processo** (evita PID reaproveitado) e que ele **não é protegido**: núcleo do sistema, serviços essenciais do Windows/Linux, o próprio monitor e o processo que o iniciou, além da lista `PROTECTED_PROCESSES`. O sistema operacional aplica as permissões dele (sem privilégio, a ação falha com mensagem clara). Toda tentativa — com sucesso ou não — vai para a **auditoria**. Pode ser desligado com `ALLOW_PROCESS_KILL=false`.

## Segredos

- Credenciais de Discord/Telegram/SMTP: por variável de ambiente (prioridade) ou pelo painel, guardadas com **AES-256-GCM** usando chave derivada de `APP_SECRET`.
- A API **nunca devolve** segredos: só "configurado / origem". O frontend não armazena nenhum token.
- O `.env` e a pasta `data/` estão no `.gitignore` e no `.dockerignore`.

## Privacidade

- O resumo público (`PUBLIC_DASHBOARD=true`) mostra só nome da fazenda, status e percentuais: nada de hostname, IP, modelo de hardware, processos ou usuários.
- Visitantes não veem o motivo de proteção dos processos nem o status dos segredos.
- Linhas de comando dos processos não são coletadas.

## Auditoria

Registradas: logins (inclusive falhos), troca/redefinição de senha, usuários, fazendas e tokens, configurações e segredos, testes de canal, limpeza de avisos, exclusão de anotações e todas as tentativas de encerrar processos. Retenção padrão: 365 dias.

## Recomendações de implantação

- Use HTTPS (proxy reverso) e `TRUST_PROXY=1` atrás dele.
- Defina `APP_SECRET` e `ADMIN_PASSWORD` fortes; troque a senha gerada no primeiro acesso.
- Prefira VPN a expor o painel na internet quando possível.
- Rode o servidor com um usuário sem privilégios (a imagem Docker já faz isso).

Vulnerabilidades: veja [SECURITY.md](../SECURITY.md).
