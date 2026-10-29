// "Liquidity field": slowly drifting contour lines of a noise field, phosphor green on ink.
const FRAGMENT = `
precision mediump float;
uniform vec2 uRes;
uniform float uTime;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes.y;
  float t = uTime * 0.025;
  float field = fbm(uv * 2.2 + vec2(t, -t * 0.6)) + 0.35 * fbm(uv * 5.0 - t);
  float line = smoothstep(0.06, 0.0, abs(fract(field * 9.0) - 0.5)) * 0.55;
  float glow = smoothstep(0.9, 0.2, distance(gl_FragCoord.xy / uRes, vec2(0.78, 1.05)));
  vec3 ink = vec3(0.020, 0.051, 0.043);
  vec3 phosphor = vec3(0.12, 0.88, 0.49);
  gl_FragColor = vec4(ink + phosphor * (line * 0.10 + glow * 0.07), 1.0);
}`;

const VERTEX = "attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }";

function linkProgram(gl: WebGLRenderingContext): WebGLProgram {
  const program = gl.createProgram();
  for (const [type, source] of [[gl.VERTEX_SHADER, VERTEX], [gl.FRAGMENT_SHADER, FRAGMENT]] as const) {
    const shader = gl.createShader(type);
    if (!shader) throw new Error("WebGL shader could not be created");
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    gl.attachShader(program, shader);
  }
  gl.linkProgram(program);
  return program;
}

/** Starts rendering into the canvas; returns a stop function. Without WebGL it does nothing. */
export function startLiquidityField(canvas: HTMLCanvasElement): () => void {
  const gl = canvas.getContext("webgl", { antialias: false, alpha: false });
  if (!gl) return () => {};

  const program = linkProgram(gl);
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "p");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const uRes = gl.getUniformLocation(program, "uRes");
  const uTime = gl.getUniformLocation(program, "uTime");

  // Half resolution is plenty for a soft background and keeps the GPU mostly idle.
  const resize = () => {
    canvas.width = Math.floor(canvas.clientWidth / 2);
    canvas.height = Math.floor(canvas.clientHeight / 2);
    gl.viewport(0, 0, canvas.width, canvas.height);
  };
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let frame = 0;
  const draw = (ms: number) => {
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, ms / 1000);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!still && !document.hidden) frame = requestAnimationFrame(draw);
  };
  const resume = () => {
    if (!document.hidden && !still) frame = requestAnimationFrame(draw);
  };

  resize();
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", resume);
  frame = requestAnimationFrame(draw);
  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener("resize", resize);
    document.removeEventListener("visibilitychange", resume);
  };
}
