var RadarCenLogger = (() => {
  const tag = (msg) => `%c[RadarCen] ${msg}`;

  let _debug = false;

  return {
    init(debug) {
      _debug = debug;
    },

    log(msg, ...rest) {
      if (_debug) console.log(tag(msg), "color:#00bcd4;", ...rest);
    },

    error(msg, ...rest) {
      if (_debug)
        console.error(
          tag(`❌ ${msg}`),
          "color:#f44336;font-weight:bold;",
          ...rest,
        );
    },

    success(msg) {
      if (_debug)
        console.log(tag(`✅ ${msg}`), "color:#4caf50;font-weight:bold;");
    },
  };
})();
