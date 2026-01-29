import { ipcMain } from "electron";
import si from "systeminformation";
import { spawn } from "node:child_process";
import type { SystemStats } from "../../types";

let cached: SystemStats | null = null;
let updating = false;

async function safe<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

function normalizePercent(value: any): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, n));
}

function execPowerShellJson(
  command: string,
  timeoutMs: number = 1500,
): Promise<any> {
  return new Promise((resolve, reject) => {
    const child = spawn("powershell.exe", ["-NoProfile", "-Command", command], {
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      try {
        child.kill();
      } catch {
        // ignore
      }
      reject(new Error("PowerShell query timed out"));
    }, timeoutMs);

    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("error", (e) => {
      clearTimeout(timeout);
      reject(e);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        reject(new Error(stderr.trim() || `PowerShell exited ${code}`));
        return;
      }
      const text = stdout.trim();
      if (!text) {
        resolve(null);
        return;
      }
      try {
        resolve(JSON.parse(text));
      } catch {
        resolve(text);
      }
    });
  });
}

async function windowsThermalZoneTempC(): Promise<{
  tempC: number | null;
  status?: SystemStats["sensors"];
}> {
  try {
    const json = await execPowerShellJson(
      "Get-CimInstance -Namespace root\\wmi -ClassName MSAcpi_ThermalZoneTemperature | Select-Object CurrentTemperature,InstanceName | ConvertTo-Json -Compress",
    );
    const arr = Array.isArray(json) ? json : json ? [json] : [];
    for (const item of arr) {
      const raw = Number((item as any)?.CurrentTemperature);
      if (Number.isFinite(raw) && raw > 0) {
        const c = raw / 10 - 273.15;
        if (Number.isFinite(c)) {
          return { tempC: c, status: { status: "ok" } };
        }
      }
    }
    return {
      tempC: null,
      status: {
        status: "unavailable",
        message: "No temperature sensors exposed by Windows.",
      },
    };
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    if (
      msg.toLowerCase().includes("access denied") ||
      msg.includes("0x80041003")
    ) {
      return {
        tempC: null,
        status: {
          status: "permission-denied",
          message:
            "Windows blocked sensor access. Try running DevDash as Administrator to read temps/fan (if supported).",
        },
      };
    }
    return {
      tempC: null,
      status: {
        status: "unavailable",
        message: "Temperature sensors unavailable.",
      },
    };
  }
}

async function windowsFanRpm(): Promise<{
  rpm: number[] | null;
  status?: SystemStats["sensors"];
}> {
  try {
    const json = await execPowerShellJson(
      "$x=Get-CimInstance Win32_Fan; if($null -eq $x){$null} else { $x | Select-Object DesiredSpeed,VariableSpeed,Status | ConvertTo-Json -Compress }",
    );
    const arr = Array.isArray(json) ? json : json ? [json] : [];
    const rpms: number[] = [];
    for (const item of arr) {
      // Win32_Fan rarely reports real RPM; DesiredSpeed is sometimes present.
      const s = Number((item as any)?.DesiredSpeed);
      if (Number.isFinite(s) && s > 0) rpms.push(s);
    }
    if (rpms.length) return { rpm: rpms, status: { status: "ok" } };
    return {
      rpm: null,
      status: {
        status: "unavailable",
        message: "Fan speed not exposed by this device/driver.",
      },
    };
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    if (
      msg.toLowerCase().includes("access denied") ||
      msg.includes("0x80041003")
    ) {
      return {
        rpm: null,
        status: {
          status: "permission-denied",
          message:
            "Windows blocked sensor access. Try running DevDash as Administrator to read temps/fan (if supported).",
        },
      };
    }
    return {
      rpm: null,
      status: { status: "unavailable", message: "Fan speed unavailable." },
    };
  }
}

async function collectSystemStats(): Promise<SystemStats> {
  const [load, mem, cpuTemp, graphics] = await Promise.all([
    safe(() => si.currentLoad()),
    safe(() => si.mem()),
    safe(() => si.cpuTemperature()),
    safe(() => si.graphics()),
  ]);

  const cpuLoad = normalizePercent((load as any)?.currentLoad) ?? 0;
  const cpuTempMain = (cpuTemp as any)?.main;
  const cpuTempNum =
    typeof cpuTempMain === "number" && Number.isFinite(cpuTempMain)
      ? cpuTempMain
      : null;
  let cpuTempC = cpuTempNum !== null && cpuTempNum > 0 ? cpuTempNum : null;

  const memTotal =
    typeof (mem as any)?.total === "number" ? (mem as any).total : 0;
  const memUsed =
    typeof (mem as any)?.used === "number" ? (mem as any).used : 0;
  const memUsedPercent =
    memTotal > 0 ? Math.round((memUsed / memTotal) * 1000) / 10 : 0;

  const controller = (graphics as any)?.controllers?.[0];
  const gpuName =
    typeof controller?.model === "string" ? controller.model : null;
  const gpuLoad = normalizePercent(
    controller?.utilizationGpu ?? controller?.utilizationGPU,
  );
  const gpuTemp = controller?.temperatureGpu ?? controller?.temperatureGPU;
  const gpuTempNum =
    typeof gpuTemp === "number" && Number.isFinite(gpuTemp) ? gpuTemp : null;
  const gpuTempC = gpuTempNum !== null && gpuTempNum > 0 ? gpuTempNum : null;

  // systeminformation does not expose a dedicated fan() API on some builds; best-effort from cpuTemperature().fans
  const cpuFans = (cpuTemp as any)?.fans;
  let fanValues = Array.isArray(cpuFans)
    ? cpuFans
        .map((x: any) => (typeof x === "number" ? x : Number(x)))
        .filter(
          (x: any) => typeof x === "number" && Number.isFinite(x) && x > 0,
        )
    : null;

  // Windows best-effort fallbacks (may require admin and/or supported hardware)
  let sensors: SystemStats["sensors"] | undefined;
  if (process.platform === "win32") {
    if (cpuTempC === null) {
      const tz = await windowsThermalZoneTempC();
      if (tz.tempC !== null) cpuTempC = tz.tempC;
      if (tz.status) sensors = tz.status;
    }
    if (!fanValues || fanValues.length === 0) {
      const fan = await windowsFanRpm();
      if (fan.rpm) fanValues = fan.rpm;
      if (!sensors && fan.status) sensors = fan.status;
    }
  }

  const warningState =
    cpuLoad >= 70 ||
    (cpuTempC !== null && cpuTempC >= 80) ||
    (gpuLoad !== null && gpuLoad >= 70) ||
    (gpuTempC !== null && gpuTempC >= 80);

  let topProcess: SystemStats["topProcess"] = null;
  if (warningState) {
    const procInfo = await safe(() => si.processes());
    const list = (procInfo as any)?.list;
    if (Array.isArray(list) && list.length > 0) {
      const top = list
        .slice()
        .sort(
          (a: any, b: any) => (Number(b?.cpu) || 0) - (Number(a?.cpu) || 0),
        )[0];
      if (top) {
        topProcess = {
          pid: Number(top.pid) || 0,
          name: String(top.name ?? ""),
          cpu: normalizePercent(top.cpu) ?? 0,
          mem: normalizePercent(top.mem) ?? 0,
        };
      }
    }
  }

  return {
    at: Date.now(),
    cpu: { load: cpuLoad, tempC: cpuTempC },
    memory: { total: memTotal, used: memUsed, usedPercent: memUsedPercent },
    gpu:
      gpuName || gpuLoad !== null || gpuTempC !== null
        ? { name: gpuName, load: gpuLoad, tempC: gpuTempC }
        : null,
    fans: fanValues ? { rpm: fanValues } : null,
    topProcess,
    sensors,
  };
}

export function registerSystemStatsHandlers() {
  // Keep a warm cache so the renderer can poll cheaply.
  if (!cached && !updating) {
    updating = true;
    collectSystemStats()
      .then((s) => (cached = s))
      .finally(() => (updating = false));
  }

  setInterval(() => {
    if (updating) return;
    updating = true;
    collectSystemStats()
      .then((s) => (cached = s))
      .finally(() => (updating = false));
  }, 2000).unref?.();

  ipcMain.handle("system:stats", async () => {
    if (cached) return cached;
    cached = await collectSystemStats();
    return cached;
  });
}
