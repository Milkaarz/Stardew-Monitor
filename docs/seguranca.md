# Segurança

O Stardew Monitor roda **no próprio computador** e **não tem login**. O modelo de segurança é: só quem está usando este computador controla o painel.

## Acesso ao painel

- O servidor escuta apenas em **127.0.0.1** (padrão de `HOST`). Outros computadores da rede não conseguem conectar.
- **Proteção contra DNS rebinding**: o cabeçalho `Host` precisa ser `localhost`, `127.0.0.1` ou `[::1]` (ou um nome liberado em `ALLOWED_HOSTS`). Um site malicioso que aponte um domínio para 127.0.0.1 é recusado.
- **Proteção contra CSRF**: toda alteração exige o cabeçalho `X-Stardew-Monitor`, e, quando o navegador envia `Origin`, ele precisa ser o próprio painel. Um site aberto em outra aba não consegue enviar esse cabeçalho (o servidor nunca libera CORS).
- **Rate limiting**: geral (600/min), agentes (240/min) e encerramento de processos (10/min).
- Cabeçalhos com Helmet: CSP restritiva (só recursos do próprio painel; fontes embutidas, sem CDN), `X-Content-Type-Options`, `frame-ancestors 'none'`.
- Toda entrada da API é validada com esquemas (tipos, tamanhos e listas limitadas).

> Não exponha o painel à internet nem à rede (por exemplo com `HOST=0.0.0.0` + `ALLOWED_HOSTS` + redirecionamento de porta): sem login, qualquer pessoa que alcance o painel poderia alterar configurações. Mesmo assim, encerrar processos continua restrito ao próprio computador.

## Encerrar processos ("Expulsar morador")

Exige, ao mesmo tempo: requisição vinda **do próprio computador** (endereço de loopback), cabeçalho do painel, **confirmação explícita** (`confirm: true`) e limite de 10/min. Antes de agir, o servidor confere que o PID ainda pertence ao **mesmo processo** (evita PID reaproveitado) e que ele **não é protegido**: núcleo do sistema, serviços essenciais do Windows/Linux, o próprio monitor e o processo que o iniciou, além da lista `PROTECTED_PROCESSES`. O sistema operacional aplica as permissões dele: sem privilégio, a ação falha com mensagem clara. Toda tentativa (com sucesso ou não) vai para a **auditoria**. Pode ser desligado com `ALLOW_PROCESS_KILL=false`.

## Agentes (outras máquinas, opcional)

- Para receber agentes, o servidor central precisa de `HOST=0.0.0.0`. O painel continua respondendo só a `localhost`; o endpoint dos agentes usa autenticação própria.
- Token individual por máquina (`sdm_` + 256 bits), mostrado uma vez; o servidor guarda só o SHA-256.
- Assinatura HMAC-SHA256 do corpo + carimbo de tempo (±5 min) + bloqueio de replay.
- O agente recusa `http://` para servidores fora de localhost, a menos que `STARDEW_ALLOW_INSECURE=true` (aceitável numa rede doméstica confiável).
- Comandos só chegam na resposta ao envio do próprio agente e só são executados com consentimento local (`STARDEW_ALLOW_REMOTE_KILL=true`).

## Segredos

- Credenciais de Discord/Telegram/SMTP: por variável de ambiente (prioridade) ou pelo painel, guardadas com **AES-256-GCM** usando a chave de `APP_SECRET` (gerada automaticamente em `.app-secret` na pasta de dados).
- A API **nunca devolve** segredos: só "configurado / origem".

## Privacidade

Nada sai do computador, exceto as notificações que você configurar (Discord, Telegram, e-mail). Não há telemetria. Linhas de comando dos processos não são coletadas.

## Auditoria

Ficam registradas (com data, endereço e resultado): alterações de configurações e segredos, fazendas e tokens, testes de canal, limpeza de avisos, exclusão de anotações e todas as tentativas de encerrar processos. Retenção padrão: 365 dias.

Vulnerabilidades: veja [SECURITY.md](../SECURITY.md).
