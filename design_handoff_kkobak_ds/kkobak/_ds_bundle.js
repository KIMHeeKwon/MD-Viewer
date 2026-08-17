/* @ds-bundle: {"namespace":"HKDS","components":[{"name":"Badge","sourcePath":"components/components/Badge/Badge.jsx"},{"name":"Button","sourcePath":"components/components/Button/Button.jsx"},{"name":"Card","sourcePath":"components/components/Card/Card.jsx"},{"name":"Checkbox","sourcePath":"components/components/Checkbox/Checkbox.jsx"},{"name":"Dialog","sourcePath":"components/components/Dialog/Dialog.jsx"},{"name":"Input","sourcePath":"components/components/Input/Input.jsx"},{"name":"Select","sourcePath":"components/components/Select/Select.jsx"},{"name":"Stack","sourcePath":"components/layout/Stack/Stack.jsx"},{"name":"Text","sourcePath":"components/components/Text/Text.jsx"}],"sourceHashes":{"components/components/Badge/Badge.jsx":"cf854fd68c80","components/components/Badge/Badge.d.ts":"55da1500234a","components/components/Badge/Badge.prompt.md":"e69f4ca510cd","components/components/Button/Button.jsx":"dfd3fc280918","components/components/Button/Button.d.ts":"d7755af274c5","components/components/Button/Button.prompt.md":"e3a5fcd11c2a","components/components/Card/Card.jsx":"95724326c788","components/components/Card/Card.d.ts":"fc1e889cf449","components/components/Card/Card.prompt.md":"ddcef62493d1","components/components/Checkbox/Checkbox.jsx":"d792b7aeb10f","components/components/Checkbox/Checkbox.d.ts":"af1a79c25fb6","components/components/Checkbox/Checkbox.prompt.md":"41f57b5f30dc","components/components/Dialog/Dialog.jsx":"b37dd01c1629","components/components/Dialog/Dialog.d.ts":"92f2471f8df8","components/components/Dialog/Dialog.prompt.md":"1dc88419f3ac","components/components/Input/Input.jsx":"02bf29e149d8","components/components/Input/Input.d.ts":"59c706b39e42","components/components/Input/Input.prompt.md":"bc015a73b83a","components/components/Select/Select.jsx":"31dcb6f3b3f2","components/components/Select/Select.d.ts":"42c0481e716c","components/components/Select/Select.prompt.md":"552302b07b08","components/layout/Stack/Stack.jsx":"e236f79c4c27","components/layout/Stack/Stack.d.ts":"e0445a9f9426","components/layout/Stack/Stack.prompt.md":"550f6a376de7","components/components/Text/Text.jsx":"402a7c387cc1","components/components/Text/Text.d.ts":"49e9cfdecd65","components/components/Text/Text.prompt.md":"9b38513aaa5f"},"inlinedExternals":[],"builtBy":"cc-design-sync"} */
"use strict";
var HKDS = (() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __esm = (fn, res, err) => function __init() {
    if (err) throw err[0];
    try {
      return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
    } catch (e) {
      throw err = [e], e;
    }
  };
  var __commonJS = (cb, mod) => function __require() {
    try {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    } catch (e) {
      throw mod = 0, e;
    }
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // <define:import.meta.env>
  var init_define_import_meta_env = __esm({
    "<define:import.meta.env>"() {
    }
  });

  // shim:react-shim
  var require_react_shim = __commonJS({
    "shim:react-shim"(exports, module) {
      init_define_import_meta_env();
      var R2 = window.React;
      function np(p2, k2) {
        var o = {};
        for (var x2 in p2) if (x2 !== "children") o[x2] = p2[x2];
        if (k2 !== void 0) o.key = k2;
        return o;
      }
      function jsx(t, p2, k2) {
        var c = p2 && p2.children;
        return c === void 0 ? R2.createElement(t, np(p2, k2)) : R2.createElement(t, np(p2, k2), c);
      }
      function jsxs(t, p2, k2) {
        return R2.createElement.apply(R2, [t, np(p2, k2)].concat(p2.children));
      }
      module.exports = R2;
      module.exports.jsx = jsx;
      module.exports.jsxs = jsxs;
      module.exports.jsxDEV = function(t, p2, k2, s) {
        return (s ? jsxs : jsx)(t, p2, k2);
      };
      module.exports.Fragment = R2.Fragment;
    }
  });

  // dist/index.js
  var index_exports = {};
  __export(index_exports, {
    Badge: () => se,
    Button: () => ne,
    Card: () => ie,
    Checkbox: () => ce,
    Dialog: () => de,
    Input: () => oe,
    Select: () => ue,
    Stack: () => le,
    Text: () => ve,
    ThemeProvider: () => te,
    cx: () => i,
    vars: () => ae
  });
  init_define_import_meta_env();
  var import_jsx_runtime = __toESM(require_react_shim(), 1);
  var import_react = __toESM(require_react_shim(), 1);
  var ae = { color: { bg: "var(--_1ukhvxl0)", surface: "var(--_1ukhvxl1)", surfaceHover: "var(--_1ukhvxl2)", text: "var(--_1ukhvxl3)", textMuted: "var(--_1ukhvxl4)", border: "var(--_1ukhvxl5)", borderStrong: "var(--_1ukhvxl6)", accent: "var(--_1ukhvxl7)", accentHover: "var(--_1ukhvxl8)", accentActive: "var(--_1ukhvxl9)", accentText: "var(--_1ukhvxla)", accent2: "var(--_1ukhvxlb)", accent2Hover: "var(--_1ukhvxlc)", accent2Text: "var(--_1ukhvxld)", danger: "var(--_1ukhvxle)", dangerText: "var(--_1ukhvxlf)", success: "var(--_1ukhvxlg)", warning: "var(--_1ukhvxlh)", focusRing: "var(--_1ukhvxli)", overlay: "var(--_1ukhvxlj)" }, font: { body: "var(--_1ukhvxlk)", mono: "var(--_1ukhvxll)" }, fontSize: { xs: "var(--_1ukhvxlm)", sm: "var(--_1ukhvxln)", md: "var(--_1ukhvxlo)", lg: "var(--_1ukhvxlp)", xl: "var(--_1ukhvxlq)", xxl: "var(--_1ukhvxlr)" }, fontWeight: { regular: "var(--_1ukhvxls)", medium: "var(--_1ukhvxlt)", bold: "var(--_1ukhvxlu)" }, lineHeight: { tight: "var(--_1ukhvxlv)", normal: "var(--_1ukhvxlw)" }, space: { none: "var(--_1ukhvxlx)", xs: "var(--_1ukhvxly)", sm: "var(--_1ukhvxlz)", md: "var(--_1ukhvxl10)", lg: "var(--_1ukhvxl11)", xl: "var(--_1ukhvxl12)", xxl: "var(--_1ukhvxl13)", xxxl: "var(--_1ukhvxl14)" }, radius: { none: "var(--_1ukhvxl15)", sm: "var(--_1ukhvxl16)", md: "var(--_1ukhvxl17)", lg: "var(--_1ukhvxl18)", full: "var(--_1ukhvxl19)" }, shadow: { sm: "var(--_1ukhvxl1a)", md: "var(--_1ukhvxl1b)", lg: "var(--_1ukhvxl1c)", glow: "var(--_1ukhvxl1d)" } };
  function i(...a) {
    return a.filter(Boolean).join(" ");
  }
  var g = "_1sz8i700";
  function te({ className: a, ...e }) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: i(g, a), ...e });
  }
  var f = "_2vkgi70";
  var w = { sm: "_2vkgi71", md: "_2vkgi72", lg: "_2vkgi73" };
  var p = { primary: "_2vkgi74", secondary: "_2vkgi75", ghost: "_2vkgi76", danger: "_2vkgi77" };
  var b = "_2vkgi78";
  var ne = (0, import_react.forwardRef)(function({
    variant: e = "primary",
    size: t = "md",
    fullWidth: n = false,
    className: v,
    type: o = "button",
    ...s
  }, c) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "button",
      {
        ref: c,
        type: o,
        className: i(
          f,
          w[t],
          p[e],
          n && b,
          v
        ),
        ...s
      }
    );
  });
  var N = "_21ed350";
  var z = { xs: "_21ed351", sm: "_21ed352", md: "_21ed353", lg: "_21ed354", xl: "_21ed355", xxl: "_21ed356" };
  var y = { regular: "_21ed357", medium: "_21ed358", bold: "_21ed359" };
  var L = { default: "_21ed35a", muted: "_21ed35b", accent: "_21ed35c", danger: "_21ed35d" };
  var j = { left: "_21ed35e", center: "_21ed35f", right: "_21ed35g" };
  function ve({
    as: a = "p",
    size: e = "md",
    weight: t = "regular",
    tone: n = "default",
    align: v,
    className: o,
    ...s
  }) {
    return (0, import_react.createElement)(a, {
      className: i(
        N,
        z[e],
        y[t],
        L[n],
        v && j[v],
        o
      ),
      ...s
    });
  }
  var B = "wsxt7m0";
  var C = { row: "wsxt7m1", column: "wsxt7m2" };
  var $ = { none: "wsxt7m3", xs: "wsxt7m4", sm: "wsxt7m5", md: "wsxt7m6", lg: "wsxt7m7", xl: "wsxt7m8", xxl: "wsxt7m9", xxxl: "wsxt7ma" };
  var M = { start: "wsxt7mb", center: "wsxt7mc", end: "wsxt7md", stretch: "wsxt7me" };
  var W = { start: "wsxt7mf", center: "wsxt7mg", end: "wsxt7mh", between: "wsxt7mi" };
  var S = "wsxt7mj";
  function le({
    as: a = "div",
    direction: e = "column",
    gap: t = "md",
    align: n = "stretch",
    justify: v = "start",
    wrap: o = false,
    className: s,
    ...c
  }) {
    return (0, import_react.createElement)(a, {
      className: i(
        B,
        C[e],
        $[t],
        M[n],
        W[v],
        o && S,
        s
      ),
      ...c
    });
  }
  var T = "mxhtgz0";
  var E = { sm: "mxhtgz1", md: "mxhtgz2" };
  var H = { neutral: "mxhtgz3", accent: "mxhtgz4", violet: "mxhtgz5", success: "mxhtgz6", warning: "mxhtgz7", danger: "mxhtgz8" };
  function se({
    tone: a = "neutral",
    size: e = "md",
    className: t,
    ...n
  }) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "span",
      {
        className: i(T, E[e], H[a], t),
        ...n
      }
    );
  }
  var I = "_1bv3nnf0";
  var R = { none: "_1bv3nnf1", sm: "_1bv3nnf2", md: "_1bv3nnf3", lg: "_1bv3nnf4" };
  var D = "_1bv3nnf5";
  function ie({
    as: a = "div",
    padding: e = "md",
    interactive: t = false,
    className: n,
    ...v
  }) {
    return (0, import_react.createElement)(a, {
      className: i(
        I,
        R[e],
        t && D,
        n
      ),
      ...v
    });
  }
  var q = "_1c91cij0";
  var oe = (0, import_react.forwardRef)(function({ invalid: e = false, className: t, ...n }, v) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "input",
      {
        ref: v,
        "aria-invalid": e || void 0,
        className: i(q, t),
        ...n
      }
    );
  });
  var A = "_1npy32d0";
  var P = "_1npy32d1";
  var F = "_1npy32d2";
  var G = "_1npy32d3";
  var ce = (0, import_react.forwardRef)(
    function({ label: e, className: t, ...n }, v) {
      return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: i(A, t), children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { ref: v, type: "checkbox", className: P, ...n }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: F, "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "svg",
          {
            className: G,
            width: "12",
            height: "12",
            viewBox: "0 0 12 12",
            fill: "none",
            children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "path",
              {
                d: "M2 6L5 9L10 3",
                stroke: "currentColor",
                strokeWidth: "2",
                strokeLinecap: "round",
                strokeLinejoin: "round"
              }
            )
          }
        ) }),
        e != null && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: e })
      ] });
    }
  );
  var J = "cntik40";
  var K = "cntik41";
  var O = "cntik42";
  var ue = (0, import_react.forwardRef)(function({ invalid: e = false, className: t, children: n, ...v }, o) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: J, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "select",
        {
          ref: o,
          "aria-invalid": e || void 0,
          className: i(K, t),
          ...v,
          children: n
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: O, "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", { width: "14", height: "14", viewBox: "0 0 14 14", fill: "none", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "path",
        {
          d: "M3.5 5L7 8.5L10.5 5",
          stroke: "currentColor",
          strokeWidth: "1.6",
          strokeLinecap: "round",
          strokeLinejoin: "round"
        }
      ) }) })
    ] });
  });
  var Q = "_1oow5ms0";
  var U = "_1oow5ms1";
  var V = "_1oow5ms2";
  var X = "_1oow5ms3";
  var Y = "_1oow5ms4";
  var Z = "_1oow5ms5";
  function de({
    open: a,
    onClose: e,
    title: t,
    footer: n,
    children: v,
    className: o
  }) {
    const s = (0, import_react.useRef)(null);
    (0, import_react.useEffect)(() => {
      const l = s.current;
      l && (a && !l.open ? l.showModal() : !a && l.open && l.close());
    }, [a]), (0, import_react.useEffect)(() => {
      const l = s.current;
      if (!l) return;
      const h = (_) => {
        _.preventDefault(), e();
      };
      return l.addEventListener("cancel", h), () => l.removeEventListener("cancel", h);
    }, [e]);
    const c = (l) => {
      l.target === s.current && e();
    };
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      "dialog",
      {
        ref: s,
        className: i(Q, o),
        onClick: c,
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: U, children: [
            t ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { className: V, children: t }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {}),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "button",
              {
                type: "button",
                className: X,
                onClick: e,
                "aria-label": "Close",
                children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", { width: "16", height: "16", viewBox: "0 0 16 16", fill: "none", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                  "path",
                  {
                    d: "M4 4L12 12M12 4L4 12",
                    stroke: "currentColor",
                    strokeWidth: "1.6",
                    strokeLinecap: "round"
                  }
                ) })
              }
            )
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: Y, children: v }),
          n && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: Z, children: n })
        ]
      }
    );
  }
  return __toCommonJS(index_exports);
})();
window.HKDS=HKDS.__dsMainNs?Object.assign({},HKDS,HKDS.__dsMainNs,{__dsMainNs:undefined}):HKDS;
