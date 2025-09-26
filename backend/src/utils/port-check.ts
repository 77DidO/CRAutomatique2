import net from 'node:net';

export function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => {
      resolve(false);
    });

    server.once('listening', () => {
      server.close();
      resolve(true);
    });

    server.listen(port);
  });
}

export async function findAvailablePort(
  startPort: number,
  maxAttempts = 20,
  delayMs = 1000,
): Promise<number> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidatePort = startPort + attempt;

    if (await isPortAvailable(candidatePort)) {
      return candidatePort;
    }

    if (attempt < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw new Error(`Unable to find an available port starting from ${startPort} after ${maxAttempts} attempts`);
}
