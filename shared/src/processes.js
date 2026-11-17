/**
 * Proteção de processos essenciais. Usado pelo backend (máquina local) e pelo agente
 * (máquinas remotas) ANTES de qualquer encerramento ("Expulsar morador").
 */

const WINDOWS_PROTECTED = [
  'system', 'system idle process', 'idle', 'registry', 'secure system', 'memory compression',
  'smss.exe', 'csrss.exe', 'wininit.exe', 'winlogon.exe', 'services.exe', 'lsass.exe', 'lsaiso.exe',
  'svchost.exe', 'dwm.exe', 'fontdrvhost.exe', 'sihost.exe', 'ctfmon.exe', 'spoolsv.exe',
  'msmpeng.exe', 'nissrv.exe', 'securityhealthservice.exe', 'wudfhost.exe', 'audiodg.exe',
  'explorer.exe', 'conhost.exe', 'taskhostw.exe', 'runtimebroker.exe', 'searchindexer.exe',
];

const UNIX_PROTECTED = [
  'init', 'systemd', 'launchd', 'kthreadd', 'kernel_task', 'systemd-journald', 'systemd-logind',
  'systemd-udevd', 'systemd-networkd', 'systemd-resolved', 'dbus-daemon', 'dbus-broker', 'sshd',
  'login', 'agetty', 'getty', 'polkitd', 'udevd', 'networkmanager', 'wpa_supplicant', 'cron', 'crond',
  'rsyslogd', 'journald', 'xorg', 'xwayland', 'gnome-shell', 'kwin_x11', 'kwin_wayland', 'plasmashell',
  'gdm', 'gdm3', 'sddm', 'lightdm', 'containerd', 'dockerd', 'windowserver', 'loginwindow',
];

const normalize = (n) => String(n || '').trim().toLowerCase();

/**
 * @param {{ pid: number, name: string, user?: string }} proc
 * @param {{ platform?: string, selfPid?: number, parentPid?: number, extra?: string[] }} ctx
 * @returns {{ protected: boolean, reason?: string }}
 */
export function protectionReason(proc, { platform = 'linux', selfPid = null, parentPid = null, extra = [] } = {}) {
  const pid = Number(proc?.pid);
  const name = normalize(proc?.name);
  if (!Number.isInteger(pid) || pid <= 0) return { protected: true, reason: 'PID inválido ou do núcleo do sistema.' };
  if (selfPid != null && pid === selfPid) return { protected: true, reason: 'É o próprio Stardew Monitor.' };
  if (parentPid != null && pid === parentPid) return { protected: true, reason: 'É o processo que iniciou o Stardew Monitor.' };

  const extraList = extra.map(normalize);
  if (extraList.includes(name)) return { protected: true, reason: 'Processo protegido pela configuração.' };

  if (platform === 'win32') {
    if (pid <= 4) return { protected: true, reason: 'Processo do núcleo do Windows.' };
    if (WINDOWS_PROTECTED.includes(name) || WINDOWS_PROTECTED.includes(`${name}.exe`)) {
      return { protected: true, reason: 'Processo essencial do Windows.' };
    }
  } else {
    if (pid === 1 || pid === 2) return { protected: true, reason: 'Processo de inicialização do sistema.' };
    if (/^k(worker|softirqd|threadd|swapd)/.test(name) || /^\[.*\]$/.test(name)) {
      return { protected: true, reason: 'Thread do kernel.' };
    }
    if (UNIX_PROTECTED.includes(name)) return { protected: true, reason: 'Processo essencial do sistema.' };
    if (proc?.user === 'root' && name.startsWith('systemd')) return { protected: true, reason: 'Serviço do systemd.' };
  }
  return { protected: false };
}

export const isProtectedProcess = (proc, ctx) => protectionReason(proc, ctx).protected;

/** Compara nomes de processo tolerando a extensão .exe. */
export function sameProcessName(a, b) {
  const x = normalize(a).replace(/\.exe$/, '');
  const y = normalize(b).replace(/\.exe$/, '');
  return x.length > 0 && x === y;
}
