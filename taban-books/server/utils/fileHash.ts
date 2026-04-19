import fs from "fs";
import { createHash } from "crypto";

export const hashFile = (filePath: string, algorithm: "sha256" | "md5" = "sha256") =>
  new Promise<string>((resolve, reject) => {
    const hash = createHash(algorithm);
    const stream = fs.createReadStream(filePath);

    stream.on("data", (chunk) => {
      hash.update(chunk);
    });

    stream.on("end", () => {
      resolve(hash.digest("hex"));
    });

    stream.on("error", (error) => {
      reject(error);
    });
  });
