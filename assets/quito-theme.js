/* Aplica el tema guardado antes del primer pintado para evitar un destello. */
(function () {
  var theme = "light";
  try { if (localStorage.getItem("quito-gis-theme") === "dark") theme = "dark"; } catch (e) {}
  document.documentElement.setAttribute("data-theme", theme);
})();
