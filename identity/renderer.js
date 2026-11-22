import { camera, layers, outline } from './model.js';

const vertexSource = `
  attribute vec3 position;
  attribute vec2 uv;
  attribute float shade;
  uniform vec2 rotation;
  uniform float elevation;
  varying vec2 surfaceUV;
  varying float light;
  void main() {
    float c = cos(rotation.x), s = sin(rotation.x);
    float x = position.x*c - position.y*s;
    float y = position.x*s + position.y*c;
    float z = position.z + elevation;
    float height = y*cos(rotation.y) - z*sin(rotation.y);
    float depth = y*sin(rotation.y) + z*cos(rotation.y);
    gl_Position = vec4(x/${camera.width/2}.0, -height/${camera.height/2}.0, -depth/500.0, 1.0-depth/1900.0);
    surfaceUV = uv;
    light = shade;
  }`;
const fragmentSource = `
  precision mediump float;
  uniform sampler2D face;
  uniform vec3 metal;
  uniform float reflection;
  uniform float shadowStrength;
  uniform float themeLight;
  varying vec2 surfaceUV;
  varying float light;
  void main() {
    if (light > 1.9) {
      vec4 texel = texture2D(face, surfaceUV);
      float stripe = max(0.0, 1.0-abs(surfaceUV.x+surfaceUV.y*.54-reflection)*2.7);
      vec2 offset = abs(surfaceUV-vec2(.53,.55));
      float shadow = 1.0-smoothstep(.33,.49,max(offset.x,offset.y));
      gl_FragColor = vec4(texel.rgb * (0.96+themeLight*.045-shadow*shadowStrength) + vec3(.035,.055,.048)*stripe*stripe,1.0);
    } else {
      gl_FragColor = vec4(metal*(light+themeLight*.09),1.0);
    }
  }`;

function geometry(layer) {
  const vertices = [];
  const add = ([x,y], z, shade) => vertices.push(x*layer.half, y*layer.half, z, (x+1)/2, (y+1)/2, shade);
  for (const [i, a] of outline.entries()) {
    const b = outline[(i+1)%outline.length];
    add([0,0], layer.height, 2); add(a,layer.height,2); add(b,layer.height,2);
    const dx = b[0]-a[0], dy = b[1]-a[1];
    const light = .83 + (.36*dx-.42*dy)/Math.hypot(dx,dy);
    const side = (top, bottom, shade) => {
      add(a,top,shade); add(b,top,shade); add(b,bottom,shade);
      add(a,top,shade); add(b,bottom,shade); add(a,bottom,shade);
    };
    side(layer.height, layer.height-1.15, 1.65);
    side(layer.height-1.15, layer.height-layer.thickness, light);
  }
  return new Float32Array(vertices);
}

function textureImage(name) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = '/images/identity/' + name + '.svg';
  });
}

export async function createRenderer(canvas) {
  const gl = canvas.getContext('webgl', { alpha: true, antialias: true, powerPreference: 'low-power', failIfMajorPerformanceCaveat: true });
  if (!gl) return null;
  const images = await Promise.all(layers.map(layer => textureImage(layer.name)));
  if (gl.isContextLost()) return null;
  const program = gl.createProgram();
  for (const [type, source] of [[gl.VERTEX_SHADER,vertexSource],[gl.FRAGMENT_SHADER,fragmentSource]]) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    gl.attachShader(program,shader);
    gl.deleteShader(shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  const uniforms = Object.fromEntries(['rotation','elevation','metal','reflection','themeLight','shadowStrength'].map(name => [name,gl.getUniformLocation(program,name)]));
  const attributes = [['position',3,0],['uv',2,12],['shade',1,20]].map(([name,size,offset]) => {
    const location = gl.getAttribLocation(program,name);
    gl.enableVertexAttribArray(location);
    return { location, size, offset };
  });
  const meshes = layers.map((layer,i) => {
    const vertices = geometry(layer);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.STATIC_DRAW);
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,images[i]);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    return { buffer,texture,count:vertices.length/6,metal:layer.metal };
  });
  gl.enable(gl.DEPTH_TEST);
  return function render({ width,height,x,y,time,scroll,light }) {
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    gl.viewport(0,0,width,height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniform2f(uniforms.rotation, camera.roll + x*.18 + Math.sin(time*.26)*.039 + scroll*.075,
      camera.tilt + y*.10 + Math.sin(time*.35)*.024 + scroll*.07);
    gl.uniform1f(uniforms.reflection,.78 + x*.22 + Math.sin(time*.32)*.19);
    gl.uniform1f(uniforms.themeLight,light ? 1 : 0);
    const settle = Math.pow(Math.max(0,1-time/1.25),3);
    meshes.forEach((mesh,i) => {
      gl.uniform1f(uniforms.elevation,Math.sin(time*.65)*1.6 + i*(settle*6 + Math.sin(time*.52)*1.9 + scroll*5.2));
      gl.uniform3fv(uniforms.metal,mesh.metal);
      gl.uniform1f(uniforms.shadowStrength,i === meshes.length-1 ? 0 : .43);
      gl.bindBuffer(gl.ARRAY_BUFFER,mesh.buffer);
      for (const { location,size,offset } of attributes) gl.vertexAttribPointer(location,size,gl.FLOAT,false,24,offset);
      gl.bindTexture(gl.TEXTURE_2D,mesh.texture);
      gl.drawArrays(gl.TRIANGLES,0,mesh.count);
    });
  };
}
