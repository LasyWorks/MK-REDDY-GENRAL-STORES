/**
 * MK Reddy General Stores — Cluster Load Balancer
 *
 * Spawns one worker per logical CPU core so all cores handle HTTP requests
 * in parallel. The master process watches workers and restarts any that crash,
 * ensuring zero-downtime under high load.
 *
 *  Start with:  node src/cluster.js
 *  Production:  NODE_ENV=production node src/cluster.js
 */

const cluster = require("cluster");
const os      = require("os");
const logger  = require("./utils/logger");

// ─── tunables ────────────────────────────────────────────────────────────────
const WORKERS        = parseInt(process.env.CLUSTER_WORKERS, 10) || os.cpus().length;
const RESTART_DELAY  = parseInt(process.env.CLUSTER_RESTART_DELAY_MS, 10) || 1000; // ms before respawning
const MAX_RESTARTS   = parseInt(process.env.CLUSTER_MAX_RESTARTS, 10)  || 10;      // per worker lifetime
// ─────────────────────────────────────────────────────────────────────────────

if (cluster.isPrimary) {
  // ── MASTER ──────────────────────────────────────────────────────────────────
  const workerRestarts = new Map(); // workerId → restart count

  logger.info(`
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║   🔄  MK Reddy General Stores — Cluster Load Balancer            ║
║                                                                  ║
║   Master PID : ${String(process.pid).padEnd(48)}║
║   CPU Cores  : ${String(os.cpus().length).padEnd(48)}║
║   Workers    : ${String(WORKERS).padEnd(48)}║
║   Environment: ${String(process.env.NODE_ENV || "development").padEnd(48)}║
║   Node.js    : ${String(process.version).padEnd(48)}║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝`);

  // Spawn all workers
  for (let i = 0; i < WORKERS; i++) {
    spawnWorker();
  }

  function spawnWorker() {
    const w = cluster.fork();
    workerRestarts.set(w.id, workerRestarts.get(w.id) || 0);

    w.on("online", () => {
      logger.info(`[cluster] Worker ${w.process.pid} online (id=${w.id})`);
    });

    w.on("message", (msg) => {
      if (msg?.type === "health") {
        logger.info(`[cluster] Worker ${w.process.pid} health: ${JSON.stringify(msg.data)}`);
      }
    });

    return w;
  }

  // ── Worker exit / crash handling ───────────────────────────────────────────
  cluster.on("exit", (worker, code, signal) => {
    const exits = (workerRestarts.get(worker.id) || 0) + 1;
    const reason = signal ? `signal ${signal}` : `exit code ${code}`;

    if (code === 0) {
      // Graceful shutdown — don't restart
      logger.info(`[cluster] Worker ${worker.process.pid} exited cleanly`);
      workerRestarts.delete(worker.id);
      return;
    }

    logger.warn(
      `[cluster] Worker ${worker.process.pid} died (${reason}), restart #${exits}`,
    );

    if (exits > MAX_RESTARTS) {
      logger.error(
        `[cluster] Worker ${worker.id} exceeded ${MAX_RESTARTS} restarts — not respawning. ` +
        `Check logs for repeated crashes.`,
      );
      workerRestarts.delete(worker.id);
      return;
    }

    // Brief delay to avoid tight crash loops
    setTimeout(() => {
      const newWorker = spawnWorker();
      workerRestarts.set(newWorker.id, exits);
    }, RESTART_DELAY);
  });

  // ── Graceful master shutdown ───────────────────────────────────────────────
  async function masterShutdown(signal) {
    logger.info(`[cluster] ${signal} received — shutting down all workers…`);

    // Ask every worker to shut down gracefully first
    for (const id in cluster.workers) {
      cluster.workers[id]?.send({ type: "shutdown" });
    }

    // Give workers 15 s to finish in-flight requests, then force-kill
    const forceKillTimer = setTimeout(() => {
      logger.warn("[cluster] Force-killing remaining workers");
      for (const id in cluster.workers) {
        cluster.workers[id]?.kill("SIGKILL");
      }
      process.exit(1);
    }, 15_000);

    // Wait for all workers to exit
    let aliveCount = Object.keys(cluster.workers).length;
    if (aliveCount === 0) {
      clearTimeout(forceKillTimer);
      logger.info("[cluster] All workers gone — master exiting");
      process.exit(0);
    }

    cluster.on("exit", () => {
      aliveCount--;
      if (aliveCount <= 0) {
        clearTimeout(forceKillTimer);
        logger.info("[cluster] All workers gone — master exiting");
        process.exit(0);
      }
    });
  }

  process.on("SIGTERM", () => masterShutdown("SIGTERM"));
  process.on("SIGINT",  () => masterShutdown("SIGINT"));

  // ── Periodic health probe (every 60 s) ────────────────────────────────────
  setInterval(() => {
    const alive = Object.keys(cluster.workers).length;
    logger.info(
      `[cluster] Health — alive workers: ${alive}/${WORKERS}, master uptime: ${Math.floor(process.uptime())}s`,
    );
    for (const id in cluster.workers) {
      cluster.workers[id]?.send({ type: "healthCheck" });
    }
  }, 60_000).unref(); // .unref() so the timer never keeps the process alive alone

} else {
  // ── WORKER ──────────────────────────────────────────────────────────────────
  // Each worker runs the full Express app independently.
  // The OS kernel load-balances incoming TCP connections across workers.
  require("./server");

  // Respond to master health checks
  process.on("message", (msg) => {
    if (msg?.type === "healthCheck") {
      process.send?.({
        type: "health",
        data: {
          pid:    process.pid,
          uptime: Math.floor(process.uptime()),
          mem:    Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + " MB",
        },
      });
    }
    if (msg?.type === "shutdown") {
      // Let the server.js SIGTERM handler close DB connections cleanly
      process.emit("SIGTERM");
    }
  });
}
