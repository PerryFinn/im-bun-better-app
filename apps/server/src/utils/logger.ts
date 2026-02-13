import { getLogger } from "@logtape/logtape";
import { name as pkgName } from "../../package.json";

export const appLogger = getLogger([pkgName]);

export const databaseLogger = getLogger([pkgName, "database"]);
