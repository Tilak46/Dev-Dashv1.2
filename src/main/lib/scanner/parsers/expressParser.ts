import traverse from "@babel/traverse";
import { joinPaths, normalizePath } from "../core/pathUtils";
import {
  exprToString,
  isHttpMethodName,
  literalString,
  methodToUpper,
} from "../core/astUtils";
import type {
  DetectedRoute,
  FrameworkParser,
  ScannerContext,
} from "../core/types";
import type { Method } from "../../../../types";

type EntityId = string;

type FileInfo = {
  filePath: string;
  appVars: Set<string>;
  routerVars: Set<string>;
  importToFile: Map<string, string>; // local identifier -> resolved file
  exportedRouterEntities: EntityId[];
  routes: Array<{
    owner: EntityId;
    method: Method;
    path: string;
    handler?: string;
    middlewares: string[];
  }>;
  mounts: Array<{
    from: EntityId;
    mountPath: string; // '/api'
    to:
      | { kind: "local"; varName: string }
      | { kind: "import"; filePath: string }
      | { kind: "require"; filePath: string };
  }>;
};

function appEntity(filePath: string, varName: string): EntityId {
  return `app:${filePath}:${varName}`;
}

function routerEntity(filePath: string, varName: string): EntityId {
  return `router:${filePath}:${varName}`;
}

function isIdent(node: any): node is { type: "Identifier"; name: string } {
  return !!node && node.type === "Identifier" && typeof node.name === "string";
}

function pickDefaultRouterEntity(info: FileInfo): EntityId | null {
  if (info.exportedRouterEntities.length > 0)
    return info.exportedRouterEntities[0];
  if (info.routerVars.size === 1) {
    const only = Array.from(info.routerVars)[0];
    return routerEntity(info.filePath, only);
  }
  return null;
}

function isRequireCall(
  node: any,
): node is { type: "CallExpression"; callee: any; arguments: any[] } {
  if (!node || node.type !== "CallExpression") return false;
  if (
    !node.callee ||
    node.callee.type !== "Identifier" ||
    node.callee.name !== "require"
  )
    return false;
  return Array.isArray(node.arguments) && node.arguments.length >= 1;
}

function evalStringExpr(
  node: any,
  constStrings: Map<string, string>,
): string | null {
  if (!node) return null;
  if (node.type === "StringLiteral") return node.value;
  if (node.type === "TemplateLiteral") {
    if (node.expressions?.length) return null;
    return (node.quasis || []).map((q: any) => q.value?.cooked ?? "").join("");
  }
  if (node.type === "Identifier") return constStrings.get(node.name) ?? null;
  if (node.type === "BinaryExpression" && node.operator === "+") {
    const l = evalStringExpr(node.left, constStrings);
    const r = evalStringExpr(node.right, constStrings);
    if (typeof l === "string" && typeof r === "string") return `${l}${r}`;
  }
  return null;
}

function findRouteBaseFromCall(
  expr: any,
): { ownerIdent: string; routePath: string } | null {
  // Supports chains like:
  // router.route('/x').get(...)
  // router.route('/x').get(...).post(...)
  let cur: any = expr;
  const maxHops = 25;

  for (let i = 0; i < maxHops; i++) {
    if (!cur || cur.type !== "CallExpression") return null;
    const callee = cur.callee;
    if (!callee || callee.type !== "MemberExpression" || callee.computed)
      return null;
    if (!callee.property || callee.property.type !== "Identifier") return null;

    const prop = callee.property.name;
    if (prop === "route") {
      if (callee.object?.type !== "Identifier") return null;
      const ownerIdent = callee.object.name;
      const routePath = literalString(cur.arguments?.[0] as any);
      if (!routePath) return null;
      return { ownerIdent, routePath };
    }

    if (!isHttpMethodName(prop)) return null;
    const next = callee.object;
    if (!next || next.type !== "CallExpression") return null;
    cur = next;
  }

  return null;
}

function extractExpressInfo(
  ctx: ScannerContext,
  filePath: string,
  ast: any,
): FileInfo {
  const appVars = new Set<string>();
  const routerVars = new Set<string>();
  const importToFile = new Map<string, string>();
  const exportedRouterEntities: EntityId[] = [];

  const constStrings = new Map<string, string>();

  const routes: FileInfo["routes"] = [];
  const mounts: FileInfo["mounts"] = [];

  let expressDefault: string | null = null;
  const expressRouters = new Set<string>();

  function markExported(varName: string) {
    if (!routerVars.has(varName)) return;
    const ent = routerEntity(filePath, varName);
    if (!exportedRouterEntities.includes(ent)) exportedRouterEntities.push(ent);
  }

  traverse(ast, {
    VariableDeclaration(p) {
      // Capture simple top-level const strings: const API_PREFIX = '/api'
      if (p.parentPath?.node?.type !== "Program") return;
      if (p.node.kind !== "const") return;
      for (const d of p.node.declarations) {
        if (d.id.type !== "Identifier") continue;
        const v = literalString(d.init as any);
        if (typeof v === "string") constStrings.set(d.id.name, v);
      }
    },

    ImportDeclaration(p) {
      const src = p.node.source.value;
      for (const s of p.node.specifiers) {
        if (s.type === "ImportDefaultSpecifier") {
          if (src === "express") expressDefault = s.local.name;
          const resolved = ctx.resolveImport(filePath, src);
          if (resolved) importToFile.set(s.local.name, resolved);
        } else if (s.type === "ImportSpecifier") {
          if (
            src === "express" &&
            s.imported.type === "Identifier" &&
            s.imported.name === "Router"
          ) {
            expressRouters.add(s.local.name);
          }
          const resolved = ctx.resolveImport(filePath, src);
          if (resolved) importToFile.set(s.local.name, resolved);
        }
      }
    },

    VariableDeclarator(p) {
      const init: any = p.node.init;

      if (!init) return;

      // Destructured require: const { router: productsRouter } = require('./x')
      if (p.node.id?.type === "ObjectPattern" && isRequireCall(init)) {
        const src = literalString(init.arguments[0] as any);
        const resolved = src ? ctx.resolveImport(filePath, src) : null;
        if (!resolved) return;
        for (const prop of p.node.id.properties) {
          if (prop.type !== "ObjectProperty") continue;
          const value = prop.value;
          if (value.type === "Identifier")
            importToFile.set(value.name, resolved);
        }
        return;
      }

      if (!p.node.id || p.node.id.type !== "Identifier") return;
      const localName = p.node.id.name;

      // const x = require('...')
      if (isRequireCall(init)) {
        const src = literalString(init.arguments[0] as any);
        if (src === "express") expressDefault = localName;
        const resolved = src ? ctx.resolveImport(filePath, src) : null;
        if (resolved) importToFile.set(localName, resolved);
        return;
      }

      // const app = express()
      if (init.type === "CallExpression" && isIdent(init.callee)) {
        if (expressDefault && init.callee.name === expressDefault) {
          appVars.add(localName);
          return;
        }
        if (expressRouters.has(init.callee.name)) {
          routerVars.add(localName);
          return;
        }
      }

      // const router = express.Router()
      if (
        init.type === "CallExpression" &&
        init.callee &&
        init.callee.type === "MemberExpression"
      ) {
        const callee = init.callee;
        if (
          !callee.computed &&
          callee.object.type === "Identifier" &&
          callee.property.type === "Identifier" &&
          callee.property.name === "Router" &&
          expressDefault &&
          callee.object.name === expressDefault
        ) {
          routerVars.add(localName);
          return;
        }

        // const router = require('express').Router()
        if (
          !callee.computed &&
          callee.property.type === "Identifier" &&
          callee.property.name === "Router" &&
          callee.object.type === "CallExpression" &&
          isRequireCall(callee.object) &&
          literalString(callee.object.arguments[0] as any) === "express"
        ) {
          routerVars.add(localName);
          return;
        }
      }
    },

    ExportDefaultDeclaration(p) {
      const decl = p.node.declaration;
      if (decl.type === "Identifier") {
        markExported(decl.name);
      } else if (decl.type === "CallExpression") {
        // export default Router() etc. (no named entity)
      }
    },

    AssignmentExpression(p) {
      // module.exports = router
      const left = p.node.left;
      const right = p.node.right;
      if (
        left.type === "MemberExpression" &&
        !left.computed &&
        left.object.type === "Identifier" &&
        left.object.name === "module" &&
        left.property.type === "Identifier" &&
        left.property.name === "exports" &&
        right.type === "Identifier"
      ) {
        markExported(right.name);
      }
    },

    CallExpression(p) {
      const callee = p.node.callee;
      if (callee.type !== "MemberExpression" || callee.computed) return;
      if (callee.property.type !== "Identifier") return;

      const prop = callee.property.name;
      const obj = callee.object;

      // router.route('/x').get(...)
      if (isHttpMethodName(prop) && obj.type === "CallExpression") {
        const base = findRouteBaseFromCall(obj);
        if (
          base &&
          (routerVars.has(base.ownerIdent) || appVars.has(base.ownerIdent))
        ) {
          const args = p.node.arguments;
          const handlerNode = args.length > 0 ? args[args.length - 1] : null;
          const middlewareNodes = args.slice(0, Math.max(0, args.length - 1));

          const middlewares = middlewareNodes
            .map((a) => exprToString(a as any))
            .filter(Boolean);
          const handler = handlerNode
            ? exprToString(handlerNode as any)
            : undefined;

          const method = methodToUpper(prop) as Method;
          const ownerIdent = base.ownerIdent;
          const owner = appVars.has(ownerIdent)
            ? appEntity(filePath, ownerIdent)
            : routerEntity(filePath, ownerIdent);

          routes.push({
            owner,
            method,
            path: base.routePath,
            handler,
            middlewares,
          });
          return;
        }
      }

      // app.get('/x', ...)
      if (isHttpMethodName(prop) && obj.type === "Identifier") {
        const ownerIdent = obj.name;
        if (!appVars.has(ownerIdent) && !routerVars.has(ownerIdent)) return;

        const routePath = literalString(p.node.arguments[0] as any);
        if (!routePath) return;

        const rest = p.node.arguments.slice(1);
        const handlerNode = rest.length > 0 ? rest[rest.length - 1] : null;
        const middlewareNodes = rest.slice(0, Math.max(0, rest.length - 1));

        const middlewares = middlewareNodes
          .map((a) => exprToString(a as any))
          .filter(Boolean);
        const handler = handlerNode
          ? exprToString(handlerNode as any)
          : undefined;

        const method = methodToUpper(prop) as Method;
        const owner = appVars.has(ownerIdent)
          ? appEntity(filePath, ownerIdent)
          : routerEntity(filePath, ownerIdent);

        routes.push({ owner, method, path: routePath, handler, middlewares });
        return;
      }

      // mounts: app.use('/prefix', router)
      if (prop === "use" && obj.type === "Identifier") {
        const ownerIdent = obj.name;
        if (!appVars.has(ownerIdent) && !routerVars.has(ownerIdent)) return;

        const args = p.node.arguments;
        if (args.length === 0) return;

        let mountPath = "/";
        let rest = args;
        const maybePath =
          evalStringExpr(args[0] as any, constStrings) ??
          literalString(args[0] as any);
        if (maybePath) {
          mountPath = maybePath;
          rest = args.slice(1);
        }

        if (rest.length === 0) return;

        // pick last router-ish argument
        const cand = rest[rest.length - 1];
        let to: FileInfo["mounts"][number]["to"] | null = null;

        if (cand.type === "Identifier") {
          if (routerVars.has(cand.name)) {
            to = { kind: "local", varName: cand.name };
          } else {
            const importedFile = importToFile.get(cand.name);
            if (importedFile) {
              to = { kind: "import", filePath: importedFile };
            }
          }
        } else if (cand.type === "CallExpression" && isIdent(cand.callee)) {
          // app.use('/x', createRouter()) where createRouter was imported/required
          const importedFile = importToFile.get(cand.callee.name);
          if (importedFile) {
            to = { kind: "import", filePath: importedFile };
          }
        } else if (isRequireCall(cand)) {
          const src = literalString(cand.arguments[0] as any);
          const resolved = src ? ctx.resolveImport(filePath, src) : null;
          if (resolved) to = { kind: "require", filePath: resolved };
        }

        if (!to) return;

        const from = appVars.has(ownerIdent)
          ? appEntity(filePath, ownerIdent)
          : routerEntity(filePath, ownerIdent);

        mounts.push({ from, mountPath: normalizePath(mountPath), to });
      }
    },
  });

  return {
    filePath,
    appVars,
    routerVars,
    importToFile,
    exportedRouterEntities,
    routes,
    mounts,
  };
}

function computeRouterPrefixes(
  fileInfos: Map<string, FileInfo>,
  ctx: ScannerContext,
): Map<EntityId, string[]> {
  const prefixes = new Map<EntityId, string[]>();

  // Important: do NOT default routers to [""] if they are mounted.
  // We'll add [""] only for routers that are never reached from any app.

  // Build edge list after resolving import/require targets to router entities
  const edges = new Map<EntityId, Array<{ to: EntityId; mountPath: string }>>();

  const getInfo = (filePath: string): FileInfo | null =>
    fileInfos.get(filePath) || null;

  const resolveToEntity = (
    to: FileInfo["mounts"][number]["to"],
  ): EntityId | null => {
    if (to.kind === "local") return null; // handled at call site
    const imported = getInfo(to.filePath);
    if (!imported) return null;
    return pickDefaultRouterEntity(imported);
  };

  for (const info of fileInfos.values()) {
    for (const m of info.mounts) {
      let target: EntityId | null = null;
      if (m.to.kind === "local") {
        target = routerEntity(info.filePath, m.to.varName);
      } else {
        target = resolveToEntity(m.to);
      }

      if (!target) continue;
      const list = edges.get(m.from) || [];
      list.push({ to: target, mountPath: m.mountPath });
      edges.set(m.from, list);
    }
  }

  const starts: Array<{ entity: EntityId; prefix: string }> = [];
  for (const info of fileInfos.values()) {
    for (const a of info.appVars) {
      starts.push({ entity: appEntity(info.filePath, a), prefix: "" });
    }
  }

  const maxDepth = 20;
  for (const s of starts) {
    const queue: Array<{ entity: EntityId; prefix: string; depth: number }> = [
      { ...s, depth: 0 },
    ];
    const seen = new Set<string>();

    while (queue.length) {
      const cur = queue.shift()!;
      if (cur.depth > maxDepth) continue;

      const k = `${cur.entity}|${cur.prefix}`;
      if (seen.has(k)) continue;
      seen.add(k);

      const outEdges = edges.get(cur.entity) || [];
      for (const e of outEdges) {
        const nextPrefix = cur.prefix
          ? joinPaths(cur.prefix, e.mountPath)
          : normalizePath(e.mountPath);

        const prev = prefixes.get(e.to) || [];
        if (!prev.includes(nextPrefix))
          prefixes.set(e.to, [...prev, nextPrefix]);

        queue.push({ entity: e.to, prefix: nextPrefix, depth: cur.depth + 1 });
      }
    }
  }

  // For routers that were never reached from an app mount, keep them visible as unmounted routes.
  for (const info of fileInfos.values()) {
    for (const r of info.routerVars) {
      const ent = routerEntity(info.filePath, r);
      if (!prefixes.has(ent)) prefixes.set(ent, [""]);
    }
  }

  return prefixes;
}

export const expressParser: FrameworkParser = {
  id: "express",
  detectProject: () => true,
  async parseRoutes(ctx) {
    const fileInfos = new Map<string, FileInfo>();

    for (const f of ctx.files) {
      const ast = await ctx.getAst(f);
      if (!ast) continue;
      const info = extractExpressInfo(ctx, f, ast as any);
      if (
        info.appVars.size ||
        info.routerVars.size ||
        info.routes.length ||
        info.mounts.length
      ) {
        fileInfos.set(f, info);
      }
    }

    const prefixes = computeRouterPrefixes(fileInfos, ctx);

    const out: DetectedRoute[] = [];

    for (const info of fileInfos.values()) {
      for (const r of info.routes) {
        if (r.owner.startsWith("app:")) {
          out.push({
            id: "",
            framework: "express",
            method: r.method,
            path: normalizePath(r.path),
            file: info.filePath,
            handler: r.handler,
            middlewares: r.middlewares,
          });
          continue;
        }

        const ps = prefixes.get(r.owner) || [""];
        for (const pfx of ps) {
          const full = pfx ? joinPaths(pfx, r.path) : normalizePath(r.path);
          out.push({
            id: "",
            framework: "express",
            method: r.method,
            path: full,
            file: info.filePath,
            handler: r.handler,
            middlewares: r.middlewares,
          });
        }
      }
    }

    // Improve file path display by converting to rel path later in orchestrator.
    return out;
  },
};
