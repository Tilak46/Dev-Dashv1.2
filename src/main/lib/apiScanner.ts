import fs from "fs";
import path from "path";
import { ApiFolder, ApiRoute, Method } from "../../types";

// Helper to generate IDs
const generateId = () => Math.random().toString(36).substring(7);

function normalizeJoinedPath(p: string): string {
  const s = String(p || "").trim();
  if (!s) return s;

  let out = s.startsWith("/") ? s : `/${s}`;
  // Collapse duplicate slashes
  out = out.replace(/\/+/g, "/");
  // Remove trailing slash except root
  if (out.length > 1) out = out.replace(/\/+$/, "");
  return out;
}

function joinMountAndRoute(mountPath: string, routePath: string): string {
  const mount = normalizeJoinedPath(mountPath);
  const routeRaw = String(routePath || "").trim();
  if (!routeRaw || routeRaw === "/") return mount;

  const route = routeRaw.startsWith("/") ? routeRaw : `/${routeRaw}`;
  return normalizeJoinedPath(`${mount}${route}`);
}

function resolveImportToFile(
  fromFile: string,
  importPath: string,
): string | null {
  const raw = String(importPath || "").trim();
  if (!raw) return null;
  if (!raw.startsWith(".") && !raw.startsWith("/")) return null; // ignore packages

  const base = path.resolve(path.dirname(fromFile), raw);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.js`,
    `${base}.tsx`,
    `${base}.jsx`,
    path.join(base, "index.ts"),
    path.join(base, "index.js"),
    path.join(base, "index.tsx"),
    path.join(base, "index.jsx"),
  ];

  for (const c of candidates) {
    try {
      if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
    } catch {
      // ignore
    }
  }

  return null;
}

function buildMountedRouterPrefixMap(
  files: string[],
  logs: string[],
): Map<string, string[]> {
  const mountedByFile = new Map<string, string[]>();

  const addMount = (routerFile: string, mount: string) => {
    const normalized = normalizeJoinedPath(mount);
    if (!normalized) return;
    const prev = mountedByFile.get(routerFile) || [];
    if (!prev.includes(normalized))
      mountedByFile.set(routerFile, [...prev, normalized]);
  };

  for (const filePath of files) {
    let content = "";
    try {
      content = fs.readFileSync(filePath, "utf-8");
    } catch {
      continue;
    }

    // Map variable name -> import path
    const importMap = new Map<string, string>();

    // ESM default import: import authRoute from "./routes/auth.route.js";
    const esmImport = /import\s+([A-Za-z_$][\w$]*)\s+from\s+['"]([^'"]+)['"]/g;
    for (const m of content.matchAll(esmImport)) {
      importMap.set(m[1], m[2]);
    }

    // CJS require: const authRoute = require('./routes/auth.route');
    const cjsRequire =
      /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*require\(\s*['"]([^'"]+)['"]\s*\)/g;
    for (const m of content.matchAll(cjsRequire)) {
      importMap.set(m[1], m[2]);
    }

    // app.use('/prefix', routerVar)
    const appUseVar =
      /\bapp\s*\.\s*use\s*\(\s*['"]([^'"]+)['"]\s*,\s*([A-Za-z_$][\w$]*)/g;
    for (const m of content.matchAll(appUseVar)) {
      const mount = m[1];
      const varName = m[2];
      const importPath = importMap.get(varName);
      if (!importPath) continue;
      const resolved = resolveImportToFile(filePath, importPath);
      if (!resolved) continue;
      addMount(resolved, mount);
    }

    // app.use('/prefix', require('./routes/auth.route'))
    const appUseInlineRequire =
      /\bapp\s*\.\s*use\s*\(\s*['"]([^'"]+)['"]\s*,\s*require\(\s*['"]([^'"]+)['"]\s*\)/g;
    for (const m of content.matchAll(appUseInlineRequire)) {
      const mount = m[1];
      const importPath = m[2];
      const resolved = resolveImportToFile(filePath, importPath);
      if (!resolved) continue;
      addMount(resolved, mount);
    }
  }

  if (mountedByFile.size > 0) {
    logs.push(
      `[Scanner] Mounted router prefixes resolved: ${mountedByFile.size}`,
    );
  }
  return mountedByFile;
}

/**
 * Scans a directory recursively for files that might contain API routes.
 */
function walk(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (
        file !== "node_modules" &&
        file !== ".git" &&
        file !== "dist" &&
        file !== "build"
      ) {
        walk(filePath, fileList);
      }
    } else {
      if (
        file.endsWith(".ts") ||
        file.endsWith(".js") ||
        file.endsWith(".tsx") ||
        file.endsWith(".jsx")
      ) {
        fileList.push(filePath);
      }
    }
  }
  return fileList;
}

/**
 * Simple Regex-based parser for Express/Router patterns.
 * Matches:
 *  - app.get('/path', ...)
 *  - router.post('/path', ...)
 *  - @Get('/path') (NestJS style common decoration)
 */
function extractRoutesFromFile(filePath: string): ApiRoute[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const routes: ApiRoute[] = [];

  // Regex for Express/Router: (app|router).(get|post|put|delete|patch) (['"`](.*?)['"`]
  // Capture groups: 1=obj, 2=method, 4=path
  const expressRegex =
    /(?:app|router)\.(get|post|put|delete|patch)\s*\(\s*['"`](.*?)['"`]/gi;

  let match;
  while ((match = expressRegex.exec(content)) !== null) {
    const method = match[1].toUpperCase() as Method;
    const routePath = match[2];

    const leaf = routePath
      .split("?")[0]
      .split("#")[0]
      .split("/")
      .filter(Boolean)
      .at(-1);

    routes.push({
      id: generateId(),
      name: leaf ? `${method} ${leaf}` : `${method} ${routePath}`,
      method,
      path: routePath,
    });
  }

  // Future: Add Next.js App Router support here
  // Checks for export async function GET(...) in route.ts files

  // Express router.route('/path').get(...).post(...)
  // Heuristic: find router.route('/x') occurrences and then look shortly after for chained method calls.
  const routeChain = /router\.route\s*\(\s*['"`](.*?)['"`]\s*\)/gi;
  for (const m of content.matchAll(routeChain)) {
    const routePath = m[1];
    const chunkStart = m.index ?? 0;
    const chunk = content.slice(
      chunkStart,
      Math.min(content.length, chunkStart + 400),
    );
    const methodMatches =
      chunk.match(/\.(get|post|put|delete|patch)\s*\(/gi) || [];
    for (const mm of methodMatches) {
      const method = mm.replace(/[^a-z]/gi, "").toUpperCase() as Method;
      const leaf = routePath
        .split("?")[0]
        .split("#")[0]
        .split("/")
        .filter(Boolean)
        .at(-1);

      routes.push({
        id: generateId(),
        name: leaf ? `${method} ${leaf}` : `${method} ${routePath}`,
        method,
        path: routePath,
      });
    }
  }

  return routes;
}

function toTitleCaseFromSlug(slug: string) {
  return slug
    .replace(/[-_]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function normalizePathSegments(routePath: string): string[] {
  const cleaned = routePath.split("?")[0].split("#")[0];
  const segments = cleaned.split("/").filter(Boolean);

  // Heuristic: drop common API prefixes
  const drop = new Set(["api"]);
  const out: string[] = [];

  for (const seg of segments) {
    if (drop.has(seg.toLowerCase())) continue;
    // drop v1/v2/etc
    if (/^v\d+$/i.test(seg)) continue;
    out.push(seg);
  }

  return out;
}

function buildTreeFromRoutePaths(routes: ApiRoute[]): ApiFolder[] {
  const root: ApiFolder = { id: "root", name: "root", children: [] };

  // Used to decide whether a single-segment route like `/posts` should live
  // inside a `Posts` folder (Postman-style) or remain at the root.
  const firstSegmentStats = new Map<
    string,
    { count: number; hasNested: boolean }
  >();

  for (const r of routes) {
    const segments = normalizePathSegments(r.path);
    if (segments.length === 0) continue;
    const first = segments[0];
    const prev = firstSegmentStats.get(first) || { count: 0, hasNested: false };
    firstSegmentStats.set(first, {
      count: prev.count + 1,
      hasNested: prev.hasNested || segments.length > 1,
    });
  }

  const getOrCreateFolder = (
    children: (ApiFolder | ApiRoute)[],
    name: string,
  ) => {
    let folder = children.find(
      (c) => !(c as any).method && (c as any).name === name,
    ) as ApiFolder | undefined;
    if (!folder) {
      folder = { id: generateId(), name, children: [] };
      children.push(folder);
    }
    return folder;
  };

  for (const r of routes) {
    const segments = normalizePathSegments(r.path);
    if (segments.length === 0) {
      root.children.push(r);
      continue;
    }

    // If this is a base route like `/posts` and there are nested routes like
    // `/posts/:id` (or multiple base methods), put it inside the resource folder.
    if (segments.length === 1) {
      const first = segments[0];
      const stats = firstSegmentStats.get(first);

      if (stats?.hasNested || (stats?.count ?? 0) > 1) {
        const folder = getOrCreateFolder(
          root.children,
          toTitleCaseFromSlug(first),
        );
        folder.children.push({
          ...r,
          name: `${r.method} /`,
        });
        continue;
      }

      // Singleton segment routes (e.g. `/health`) stay at root.
      root.children.push(r);
      continue;
    }

    // Put the route under folders for each segment EXCEPT the last, so the last segment remains a route leaf.
    const folderSegments = segments.slice(0, -1);

    let current = root;
    for (const seg of folderSegments) {
      current = getOrCreateFolder(current.children, toTitleCaseFromSlug(seg));
    }

    current.children.push({
      ...r,
      name: `${r.method} ${segments.at(-1)}`,
    });
  }

  return root.children as ApiFolder[];
}

export async function scanProjectForRoutes(
  projectPath: string,
): Promise<{ tree: ApiFolder[]; logs: string[] }> {
  const logs: string[] = [];
  const log = (msg: string) => {
    console.log(msg);
    logs.push(msg);
  };

  log(`[Scanner] Starting scan for: ${projectPath}`);
  try {
    const files = walk(projectPath);
    log(`[Scanner] Found ${files.length} candidate files.`);

    const mountedPrefixesByFile = buildMountedRouterPrefixMap(files, logs);

    const fileRoutes = new Map<string, ApiRoute[]>();
    const allRoutes: ApiRoute[] = [];

    for (const file of files) {
      const routes = extractRoutesFromFile(file);
      if (routes.length > 0) {
        const mounts = mountedPrefixesByFile.get(file) || [];
        const expanded = mounts.length
          ? routes.flatMap((r) =>
              mounts.map((m) => ({ ...r, path: joinMountAndRoute(m, r.path) })),
            )
          : routes;

        log(
          `[Scanner] Found ${routes.length} routes in ${file}${mounts.length ? ` (mounted: ${mounts.join(", ")})` : ""}`,
        );
        fileRoutes.set(file, expanded);
        allRoutes.push(...expanded);
      }
    }

    log(`[Scanner] Total files with routes: ${fileRoutes.size}`);
    const tree = buildTreeFromRoutePaths(allRoutes);
    log(
      `[Scanner] Tree built with ${tree.length} root items from ${allRoutes.length} routes.`,
    );
    return { tree, logs };
  } catch (error) {
    const errorMsg = `Failed to scan project: ${error}`;
    console.error(errorMsg);
    logs.push(errorMsg);
    return { tree: [], logs };
  }
}
