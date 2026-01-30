import { ipcMain } from "electron";
import si from "systeminformation";
import treeKill from "tree-kill";

export const registerSystemHandlers = () => {
    
  // Check ports
  ipcMain.handle("system:check-ports", async () => {
    try {
      // Get all network connections (this can be slow, so be careful)
      const connections = await si.networkConnections();
      
      // Filter for LISTEN state and common dev ports? 
      // Or just return all LISTEN ports to let UI decide
      const listening = connections.filter(c => c.state === 'LISTEN');
      
      // We need more info (process name, memory)
      // Getting full process list is heavy, so let's just get unique PIDs from listeners
      const pids = Array.from(new Set(listening.map(c => c.pid)));
      
      const processes = await si.processes();
      const processMap = new Map(processes.list.map(p => [p.pid, p]));

      // Combine
      const result = listening.map(conn => {
        const proc = processMap.get(conn.pid);
        return {
          pid: conn.pid,
          port: conn.localPort,
          name: proc ? proc.name : `PID: ${conn.pid}`,
          memory: proc && typeof proc.mem === 'number' ? `${(proc.mem / 1024 / 1024).toFixed(1)} MB` : undefined
        };
      });

      // Filter out system ports? Let's just return everything for now, maybe filter < 1024 if needed unless it's user space
      // User specifically cared about 3000, 8080 etc.
      // Let's sort by port
      return result.sort((a, b) => a.port - b.port);

    } catch (error: any) {
      console.error("Error checking ports:", error);
      throw new Error(error.message);
    }
  });

  // Kill Process
  ipcMain.handle("system:kill-process", async (_, pid: number) => {
      return new Promise<void>((resolve, reject) => {
          treeKill(pid, 'SIGKILL', (err) => {
              if (err) {
                  console.error(`Failed to kill process ${pid}:`, err);
                  reject(err);
              } else {
                  console.log(`Killed process ${pid}`);
                  resolve();
              }
          });
      });
  });
};
