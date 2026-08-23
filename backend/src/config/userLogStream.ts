import { appendFile, mkdir, readdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import { Writable } from "node:stream";

interface UserLogStreamOptions {
  baseDirectory: string;
  retentionCount: number;
}

interface LogRecord {
  time?: string | number;
  userId?: unknown;
}

const getLogDate = (time: LogRecord["time"]): string => {
  // ISO dates keep daily filenames sortable and unambiguous across deployments.
  const date = time === undefined ? new Date() : new Date(time);
  return Number.isNaN(date.getTime())
    ? new Date().toISOString().slice(0, 10)
    : date.toISOString().slice(0, 10);
};

const getLogDirectoryParts = (userId: unknown): readonly string[] =>
  // Requests before authentication and process-level events stay separate from
  // user activity while malformed IDs cannot become filesystem paths.
  typeof userId === "number" && Number.isSafeInteger(userId) && userId > 0
    ? ["user-logs", `userId-${userId}`]
    : ["system"];

export class UserLogStream extends Writable {
  private readonly initializedDirectories = new Set<string>();

  constructor(private readonly options: UserLogStreamOptions) {
    super();
  }

  override _write(
    chunk: Buffer | string,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ): void {
    // Pino writes one JSON record at a time. Ignore malformed records instead
    // of allowing a logging failure to interrupt the API response.
    let record: LogRecord;

    try {
      record = JSON.parse(chunk.toString()) as LogRecord;
    } catch {
      callback();
      return;
    }

    const directory = join(
      this.options.baseDirectory,
      ...getLogDirectoryParts(record.userId),
    );
    // Each user receives one append-only file per UTC calendar day.
    const file = join(directory, `log-${getLogDate(record.time)}.log`);

    void this.writeLog(directory, file, chunk.toString())
      .then(() => callback())
      .catch((error: unknown) =>
        callback(error instanceof Error ? error : new Error("Unable to write log file")),
      );
  }

  private async writeLog(directory: string, file: string, line: string): Promise<void> {
    await mkdir(directory, { recursive: true });

    if (!this.initializedDirectories.has(directory)) {
      this.initializedDirectories.add(directory);
      // Prune once per active folder instead of scanning it for every request.
      await this.removeExpiredLogs(directory);
    }

    await appendFile(file, line.endsWith("\n") ? line : `${line}\n`);
  }

  private async removeExpiredLogs(directory: string): Promise<void> {
    // Only managed daily files participate in retention; unrelated files are
    // deliberately left untouched.
    const files = (await readdir(directory))
      .filter((file) => /^log-\d{4}-\d{2}-\d{2}\.log$/.test(file))
      .sort()
      .reverse();
    const expiredFiles = files.slice(this.options.retentionCount);

    await Promise.all(expiredFiles.map((file) => unlink(join(directory, file))));
  }
}
