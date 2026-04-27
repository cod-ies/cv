/**
 * TypeScript declarations for the ERiC N-API native binding.
 * All functions are promise-based wrappers around the async workers in eric_addon.cc.
 */

export interface EricSendResult {
  returnCode: number;
  responseXml: string;
}

/** Initialize the ERiC library. Must be called once at process start. */
export function init(logPath: string): Promise<number>;

/** Release all ERiC resources. Call on process exit. */
export function shutdown(): void;

/**
 * Load the ELSTER PKCS#12 certificate into ERiC.
 * Must be called after init() and before sende().
 */
export function createKey(certPath: string, password: string): Promise<number>;

/**
 * Sign and transmit an XML payload to ELSTER.
 * Returns the ELSTER server response XML and an ERiC return code.
 * returnCode === 0 means success.
 */
export function sende(xmlData: string, datenartVersion: string): Promise<EricSendResult>;
