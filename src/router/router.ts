interface Route {
  pattern: RegExp;
  handler: (params: Record<string, string>) => void;
}

const routes: Route[] = [];

export function addRoute(path: string, handler: (params: Record<string, string>) => void): void {
  // Convert path pattern like "/watch/:id" to regex
  const paramNames: string[] = [];
  const regexStr = path.replace(/:([^/]+)/g, (_match, paramName) => {
    paramNames.push(paramName);
    return '([^/]+)';
  });
  const pattern = new RegExp(`^${regexStr}$`);

  routes.push({
    pattern,
    handler: (params) => handler(params),
  });

  // Store param names on the regex for extraction
  (pattern as RegExp & { _paramNames?: string[] })._paramNames = paramNames;
}

export function navigate(path: string): void {
  window.location.hash = path;
}

function matchRoute(path: string): void {
  for (const route of routes) {
    const match = path.match(route.pattern);
    if (match) {
      const paramNames = (route.pattern as RegExp & { _paramNames?: string[] })._paramNames || [];
      const params: Record<string, string> = {};
      paramNames.forEach((name, i) => {
        params[name] = match[i + 1];
      });
      route.handler(params);
      return;
    }
  }
  // Default: go home
  if (routes.length > 0) {
    routes[0].handler({});
  }
}

function getPathFromHash(): string {
  const hash = window.location.hash.slice(1) || '/';
  return hash;
}

export function startRouter(): void {
  window.addEventListener('hashchange', () => {
    matchRoute(getPathFromHash());
  });
  // Initial route
  matchRoute(getPathFromHash());
}
