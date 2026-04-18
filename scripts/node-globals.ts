import { Buffer as NodeBuffer } from 'node:buffer';
import NodeProcess from 'node:process';

// Ensure process.nextTick is available (fallback to queueMicrotask)
const polyfilledProcess = NodeProcess || {};
if (!polyfilledProcess.nextTick) {
  (polyfilledProcess as any).nextTick = (cb: Function, ...args: any[]) => queueMicrotask(() => cb(...args));
}

export const process = polyfilledProcess;
export const Buffer = NodeBuffer;
export { polyfilledProcess as NodeProcess };
