(function () {
  "use strict";

  var canvas = document.querySelector("#liquid-canvas");
  var fallbackStack = document.querySelector("#liquid-art-stack");
  var fallbackA = document.querySelector("#liquid-fallback-a");
  var fallbackB = document.querySelector("#liquid-fallback-b");
  if (!canvas || !fallbackStack || !fallbackA || !fallbackB) return;

  // ---- Tunable settings (mirrors the Framer component's property controls) ----
  // Adjust these to change how the effect looks/feels.
  var SETTINGS = {
    imageSrc: fallbackA.getAttribute("src"), // reads assets/hero.webp
    //  automatically
    intensity: 0.35, // ambient flow strength
    hoverIntensity: 0.7, // ripple strength that follows the pointer
    clickIntensity: 1, // burst strength on click/tap
    speed: 1, // ambient flow speed
    frequency: 3, // noise frequency — higher = smaller, tighter ripples
    crossfadeDuration: 0.85, // seconds for scene image crossfade
  };

  function showFallback() {
    canvas.style.display = "none";
    fallbackStack.classList.add("is-fallback-visible");
  }

  function crossfadeFallback(src) {
    if (!src || src === SETTINGS.imageSrc) return;
    var active = fallbackA.classList.contains("is-active") ? fallbackA : fallbackB;
    var inactive = active === fallbackA ? fallbackB : fallbackA;

    function activateFallback() {
      active.classList.remove("is-active");
      inactive.classList.add("is-active");
      SETTINGS.imageSrc = src;
    }

    if (inactive.getAttribute("src") === src && inactive.complete) {
      activateFallback();
      return;
    }

    inactive.src = src;
    if (inactive.complete) {
      activateFallback();
      return;
    }
    inactive.onload = activateFallback;
  }

  window.liquidDistortion = {
    setImage: function (src) {
      crossfadeFallback(src);
    },
  };

  var prefersReducedMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (prefersReducedMotion) {
    showFallback();
    return;
  }

  var gl =
    canvas.getContext("webgl", {
      alpha: true,
      antialias: true,
      premultipliedAlpha: true,
    }) || canvas.getContext("experimental-webgl");

  if (!gl) {
    showFallback();
    return;
  }

  var vertexShaderSource =
    "attribute vec2 aPosition;" +
    "varying vec2 vUv;" +
    "void main() {" +
    "  vUv = (aPosition + 1.0) * 0.5;" +
    "  gl_Position = vec4(aPosition, 0.0, 1.0);" +
    "}";

  var fragmentShaderSource =
    "precision mediump float;" +
    "varying vec2 vUv;" +
    "uniform sampler2D uTexture;" +
    "uniform sampler2D uTextureNext;" +
    "uniform float uCrossfade;" +
    "uniform vec2 uResolution;" +
    "uniform vec2 uImageResolution;" +
    "uniform vec2 uMouse;" +
    "uniform float uTime;" +
    "uniform float uIntensity;" +
    "uniform float uHoverIntensity;" +
    "uniform float uPointerStrength;" +
    "uniform float uClickImpulse;" +
    "uniform float uClickIntensity;" +
    "uniform float uFrequency;" +
    "float hash(vec2 p) {" +
    "  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));" +
    "  return -1.0 + 2.0 * fract(sin(p.x + p.y) * 43758.5453123);" +
    "}" +
    "float noise(vec2 p) {" +
    "  vec2 i = floor(p);" +
    "  vec2 f = fract(p);" +
    "  vec2 u = f * f * (3.0 - 2.0 * f);" +
    "  return mix(" +
    "    mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x)," +
    "    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x)," +
    "    u.y" +
    "  );" +
    "}" +
    "float fbm(vec2 p) {" +
    "  float value = 0.0;" +
    "  float amp = 0.5;" +
    "  for (int i = 0; i < 4; i++) {" +
    "    value += amp * noise(p);" +
    "    p *= 2.03;" +
    "    amp *= 0.5;" +
    "  }" +
    "  return value;" +
    "}" +
    "vec2 coverUv(vec2 uv) {" +
    "  float canvasAspect = uResolution.x / max(uResolution.y, 0.0001);" +
    "  float imageAspect = uImageResolution.x / max(uImageResolution.y, 0.0001);" +
    "  vec2 scale = vec2(1.0, 1.0);" +
    "  if (canvasAspect > imageAspect) {" +
    "    scale.y = imageAspect / canvasAspect;" +
    "  } else {" +
    "    scale.x = canvasAspect / imageAspect;" +
    "  }" +
    "  return (uv - 0.5) * scale + 0.5;" +
    "}" +
    "void main() {" +
    "  vec2 uv = coverUv(vUv);" +
    "  vec2 p = uv * max(uFrequency, 0.001);" +
    "  float t = uTime;" +
    "  float n1 = fbm(p + vec2(t * 0.22, t * 0.17));" +
    "  float n2 = fbm(p * 1.7 - vec2(t * 0.19, t * 0.21));" +
    "  vec2 flow = vec2(n1, n2) * 2.0 - 1.0;" +
    "  vec2 displacement = flow * (uIntensity * 0.04);" +
    "  vec2 toMouse = uv - uMouse;" +
    "  float d = length(toMouse);" +
    "  float influence = smoothstep(0.42, 0.0, d) * uPointerStrength;" +
    "  vec2 dir = toMouse / max(d, 0.0001);" +
    "  float ripple = sin(d * 35.0 - t * 5.0) * 0.5 + 0.5;" +
    "  displacement += dir * ripple * influence * (uHoverIntensity * 0.06);" +
    "  float burstInfluence = smoothstep(0.8, 0.0, d) * uClickImpulse;" +
    "  float burstRipple = sin(d * (65.0 + uFrequency * 7.0) - t * 11.0);" +
    "  displacement += dir * burstRipple * burstInfluence * (uClickIntensity * 0.09);" +
    "  vec2 sampleUv = clamp(uv + displacement, 0.0, 1.0);" +
    "  vec4 colA = texture2D(uTexture, sampleUv);" +
    "  vec4 colB = texture2D(uTextureNext, sampleUv);" +
    "  gl_FragColor = mix(colA, colB, clamp(uCrossfade, 0.0, 1.0));" +
    "}";

  function createShader(type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn(
        "liquid-distortion: shader failed to compile",
        gl.getShaderInfoLog(shader)
      );
      return null;
    }
    return shader;
  }

  var vertexShader = createShader(gl.VERTEX_SHADER, vertexShaderSource);
  var fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
  if (!vertexShader || !fragmentShader) {
    showFallback();
    return;
  }

  var program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    showFallback();
    return;
  }

  var positionLocation = gl.getAttribLocation(program, "aPosition");
  var uTexture = gl.getUniformLocation(program, "uTexture");
  var uTextureNext = gl.getUniformLocation(program, "uTextureNext");
  var uCrossfade = gl.getUniformLocation(program, "uCrossfade");
  var uResolution = gl.getUniformLocation(program, "uResolution");
  var uImageResolution = gl.getUniformLocation(program, "uImageResolution");
  var uMouse = gl.getUniformLocation(program, "uMouse");
  var uTime = gl.getUniformLocation(program, "uTime");
  var uIntensity = gl.getUniformLocation(program, "uIntensity");
  var uHoverIntensity = gl.getUniformLocation(program, "uHoverIntensity");
  var uPointerStrength = gl.getUniformLocation(program, "uPointerStrength");
  var uClickImpulse = gl.getUniformLocation(program, "uClickImpulse");
  var uClickIntensity = gl.getUniformLocation(program, "uClickIntensity");
  var uFrequency = gl.getUniformLocation(program, "uFrequency");

  var buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW
  );

  var texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    1,
    1,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    new Uint8Array([0, 0, 0, 255])
  );

  var textureNext = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, textureNext);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    1,
    1,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    new Uint8Array([0, 0, 0, 255])
  );

  var imageWidth = 1;
  var imageHeight = 1;
  var disposed = false;
  var crossfade = 0;
  var crossfadeAnimating = false;
  var pendingImage = null;
  var pendingSrc = null;

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
    var height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    }
  }

  var observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  var textureImage = new Image();
  textureImage.crossOrigin = "anonymous";
  function bindTextureData(targetTexture, image) {
    gl.bindTexture(gl.TEXTURE_2D, targetTexture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      image
    );
  }

  function uploadTexture(image) {
    imageWidth = image.naturalWidth || 1;
    imageHeight = image.naturalHeight || 1;
    bindTextureData(texture, image);
  }

  function finishCrossfade() {
    if (!pendingImage) return;
    uploadTexture(pendingImage);
    SETTINGS.imageSrc = pendingSrc;
    crossfade = 0;
    crossfadeAnimating = false;
    pendingImage = null;
    pendingSrc = null;
  }

  textureImage.onload = function () {
    if (disposed) return;
    uploadTexture(textureImage);
    bindTextureData(textureNext, textureImage);
  };
  textureImage.onerror = function () {
    if (disposed) return;
    showFallback();
  };
  textureImage.src = SETTINGS.imageSrc;

  window.liquidDistortion = {
    setImage: function (src) {
      if (!src || (src === SETTINGS.imageSrc && !crossfadeAnimating)) return;

      var swapImage = new Image();
      swapImage.crossOrigin = "anonymous";
      swapImage.onload = function () {
        if (disposed) return;
        pendingSrc = src;
        pendingImage = swapImage;
        bindTextureData(textureNext, swapImage);
        crossfade = 0;
        crossfadeAnimating = true;
        crossfadeFallback(src);
      };
      swapImage.onerror = function () {
        if (disposed) return;
        showFallback();
        crossfadeFallback(src);
      };
      swapImage.src = src;
    },
  };

  var mouseTarget = { x: 0.5, y: 0.5 };
  var mouseCurrent = { x: 0.5, y: 0.5 };
  var hoverTarget = 0;
  var hoverCurrent = 0;
  var clickImpulse = 0;

  function setPointer(event) {
    var rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    mouseTarget.x = Math.min(
      1,
      Math.max(0, (event.clientX - rect.left) / rect.width)
    );
    mouseTarget.y =
      1 - Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
  }

  canvas.addEventListener("pointermove", function (event) {
    setPointer(event);
    hoverTarget = 1;
  });
  canvas.addEventListener("pointerdown", function (event) {
    setPointer(event);
    hoverTarget = 1;
    clickImpulse = 1;
  });
  canvas.addEventListener("pointerenter", function () {
    hoverTarget = 1;
  });
  canvas.addEventListener("pointerleave", function () {
    hoverTarget = 0;
  });

  var rafId = 0;
  var start = performance.now();
  var previousTime = start;

  function render(now) {
    if (disposed) return;
    resize();
    var delta = Math.min(0.05, Math.max(0.001, (now - previousTime) / 1000));
    previousTime = now;

    mouseCurrent.x += (mouseTarget.x - mouseCurrent.x) * 0.14;
    mouseCurrent.y += (mouseTarget.y - mouseCurrent.y) * 0.14;
    hoverCurrent += (hoverTarget - hoverCurrent) * 0.08;
    clickImpulse *= Math.exp(-delta * 4.2);

    if (crossfadeAnimating) {
      crossfade = Math.min(
        1,
        crossfade + delta / Math.max(SETTINGS.crossfadeDuration, 0.001)
      );
      if (crossfade >= 1) finishCrossfade();
    }

    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    gl.uniform1i(uTexture, 0);
    gl.uniform1i(uTextureNext, 1);
    gl.uniform1f(uCrossfade, crossfade);
    gl.uniform2f(uResolution, canvas.width, canvas.height);
    gl.uniform2f(uImageResolution, imageWidth, imageHeight);
    gl.uniform2f(uMouse, mouseCurrent.x, mouseCurrent.y);
    gl.uniform1f(uTime, ((now - start) / 1000) * SETTINGS.speed);
    gl.uniform1f(uIntensity, SETTINGS.intensity);
    gl.uniform1f(uHoverIntensity, SETTINGS.hoverIntensity);
    gl.uniform1f(uPointerStrength, hoverCurrent);
    gl.uniform1f(uClickImpulse, clickImpulse);
    gl.uniform1f(uClickIntensity, SETTINGS.clickIntensity);
    gl.uniform1f(uFrequency, SETTINGS.frequency);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, textureNext);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    rafId = window.requestAnimationFrame(render);
  }

  rafId = window.requestAnimationFrame(render);

  window.addEventListener("beforeunload", function () {
    disposed = true;
    window.cancelAnimationFrame(rafId);
    observer.disconnect();
  });
})();
