import * as crypto from "crypto";

export const hashSHA256 = (password: string): string => {
    return crypto.createHash("sha256").update(password).digest("hex");
};