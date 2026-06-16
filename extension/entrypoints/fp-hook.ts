interface HookDeps {
  canvasProto: { toDataURL: (...a: unknown[]) => unknown };
  ctx2dProto?: { getImageData: (...a: unknown[]) => unknown };
  webglProtos?: Array<{ getParameter: (...a: unknown[]) => unknown }>;
  post: (msg: { __atlasLens: true; api: string }) => void;
}

// WebGL UNMASKED_VENDOR_WEBGL / UNMASKED_RENDERER_WEBGL — reading these reveals the GPU
// (the classic WebGL fingerprinting tell). Legit WebGL apps rarely read them.
const UNMASKED_VENDOR = 37445;
const UNMASKED_RENDERER = 37446;

/** Wrap fingerprinting-prone APIs to flag *use* (not content). Testable via injected deps. */
export function installFpHook({ canvasProto, ctx2dProto, webglProtos, post }: HookDeps): void {
  const signalled = new Set<string>();
  const signal = (api: string) => { if (!signalled.has(api)) { signalled.add(api); post({ __atlasLens: true, api }); } };

  const origToDataURL = canvasProto.toDataURL;
  canvasProto.toDataURL = function (this: unknown, ...args: unknown[]) {
    signal("canvas.toDataURL");
    return origToDataURL.apply(this, args);
  };

  if (ctx2dProto) {
    const origGetImageData = ctx2dProto.getImageData;
    ctx2dProto.getImageData = function (this: unknown, ...args: unknown[]) {
      signal("canvas.getImageData");
      return origGetImageData.apply(this, args);
    };
  }

  for (const proto of webglProtos ?? []) {
    const origGetParameter = proto.getParameter;
    proto.getParameter = function (this: unknown, ...args: unknown[]) {
      const p = args[0];
      if (p === UNMASKED_VENDOR || p === UNMASKED_RENDERER) signal("webgl.getParameter");
      return origGetParameter.apply(this, args);
    };
  }
}

/** Real entrypoint: run in the page's main world. */
export default defineUnlistedScript(() => {
  const webglProtos: Array<{ getParameter: (...a: unknown[]) => unknown }> = [];
  if (typeof WebGLRenderingContext !== "undefined") webglProtos.push(WebGLRenderingContext.prototype as unknown as { getParameter: (...a: unknown[]) => unknown });
  if (typeof WebGL2RenderingContext !== "undefined") webglProtos.push(WebGL2RenderingContext.prototype as unknown as { getParameter: (...a: unknown[]) => unknown });
  installFpHook({
    canvasProto: HTMLCanvasElement.prototype as unknown as HookDeps["canvasProto"],
    ctx2dProto: CanvasRenderingContext2D.prototype as unknown as NonNullable<HookDeps["ctx2dProto"]>,
    webglProtos,
    post: (msg) => window.postMessage(msg, "*"),
  });
});
