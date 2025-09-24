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

export async function waitForPortAvailable(port: number, retries = 5, delay = 1000): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    if (await isPortAvailable(port)) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  return false;
}