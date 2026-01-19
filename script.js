// =======================
// RESPONSIVE SETUP
// =======================
const container = document.getElementById("map-container");

const width = container.clientWidth;
const height = window.innerHeight * 0.9;

let timerStarted = false;

const svg = d3.select("#map-container")
  .append("svg")
  .attr("viewBox", `0 0 ${width} ${height}`)
  .attr("preserveAspectRatio", "xMidYMid meet")
  .style("width", "100%")
  .style("height", "auto")
  .style("touch-action", "none");

// =======================
// FRAME
// =======================
const frameMargin = 10;
const frameWidth = width - frameMargin * 2;
const frameHeight = height - frameMargin * 2;

svg.append("rect")
  .attr("x", frameMargin)
  .attr("y", frameMargin)
  .attr("width", frameWidth)
  .attr("height", frameHeight)
  .attr("fill", "none")
  .attr("stroke", "black")
  .attr("stroke-width", 4)
  .attr("rx", 8);

// =======================
// PROJECTION (RESPONSIVE)
// =======================
const scale = width < 600 ? width * 3.6 : 3000;

const projection = d3.geoMercator()
  .center([35, 39])
  .scale(scale)
  .translate([width / 2, height / 2]);

const path = d3.geoPath().projection(projection);

// =======================
// TOUCH / MOUSE HELPER
// =======================
function getPoint(event) {
  const e = event.sourceEvent.touches
    ? event.sourceEvent.touches[0]
    : event.sourceEvent;
  return [e.clientX, e.clientY];
}

// =======================
// LOAD MAP
// =======================
d3.json("turkiye.geojson").then(data => {

  svg.selectAll(".base-province")
    .data(data.features)
    .enter()
    .append("path")
    .attr("d", path)
    .attr("fill", "#f0f0f0")
    .attr("stroke", "#bbb");

  svg.selectAll(".province-label")
    .data(data.features)
    .enter()
    .append("text")
    .attr("x", d => path.centroid(d)[0])
    .attr("y", d => path.centroid(d)[1])
    .text(d => d.properties.ilad)
    .attr("text-anchor", "middle")
    .attr("font-size", width < 600 ? "8px" : "9px")
    .attr("fill", "#444")
    .style("pointer-events", "none");

  const shuffled = data.features.sort(() => Math.random() - 0.5);

  const pieces = svg.selectAll(".piece")
    .data(shuffled)
    .enter()
    .append("g")
    .attr("class", "piece");

  const frameOffset = 45;
  const step = (2 * (frameWidth + frameHeight)) / shuffled.length;

  pieces.each(function(d, i) {
    let x, y;
    const dist = step * i;

    if (dist < frameWidth) {
      x = frameMargin + dist;
      y = frameMargin + frameOffset;
    } else if (dist < frameWidth + frameHeight) {
      x = frameMargin + frameWidth - frameOffset;
      y = frameMargin + (dist - frameWidth);
    } else if (dist < 2 * frameWidth + frameHeight) {
      x = frameMargin + frameWidth - (dist - frameWidth - frameHeight);
      y = frameMargin + frameHeight - frameOffset;
    } else {
      x = frameMargin + frameOffset;
      y = frameMargin + frameHeight - (dist - 2 * frameWidth - frameHeight);
    }

    const centroid = path.centroid(d);

    d3.select(this)
      .attr("transform", `translate(${x},${y}) scale(${width < 600 ? 1.15 : 1})`)
      .append("path")
      .attr("d", path(d))
      .attr("fill", "#ccc")
      .attr("stroke", "#333")
      .attr("transform", `translate(${-centroid[0]},${-centroid[1]})`)
      .style("cursor", "grab");
  });

  // =======================
  // GAME LOGIC
  // =======================
  let offsetX, offsetY;
  let correct = 0;
  const total = 81;
  const snapDistance = width < 600 ? 30 : 15;

  function updateScore() {
    document.getElementById("score").textContent = `${correct} / ${total}`;
  }

  const drag = d3.drag()
    .on("start", function(event) {
      if (d3.select(this).classed("fixed")) return;
      const [mx, my] = getPoint(event);
      const t = d3.select(this).attr("transform").match(/translate\(([^,]+),([^)]+)\)/);
      offsetX = mx - parseFloat(t[1]);
      offsetY = my - parseFloat(t[2]);
      d3.select(this).raise();
    })
    .on("drag", function(event, d) {
      if (d3.select(this).classed("fixed")) return;

      if (!timerStarted) {
        startTimer();
        timerStarted = true;
      }

      const [mx, my] = getPoint(event);
      let x = mx - offsetX;
      let y = my - offsetY;

      x = Math.max(frameMargin, Math.min(frameMargin + frameWidth, x));
      y = Math.max(frameMargin, Math.min(frameMargin + frameHeight, y));

      d3.select(this).attr("transform", `translate(${x},${y})`);
    })
    .on("end", function(event, d) {
      if (d3.select(this).classed("fixed")) return;

      const [cx, cy] = path.centroid(d);
      const t = d3.select(this).attr("transform").match(/translate\(([^,]+),([^)]+)\)/);
      const x = parseFloat(t[1]);
      const y = parseFloat(t[2]);

      if (Math.hypot(cx - x, cy - y) < snapDistance) {
        d3.select(this)
          .attr("transform", `translate(${cx},${cy})`)
          .classed("fixed", true);

        d3.select(this).select("path")
          .attr("fill", "#43a047")
          .attr("stroke", "#fff");

        correct++;
        updateScore();
      }
    });

  pieces.call(drag);
  updateScore();
});

// =======================
// TIMER
// =======================
let startTime, timerInterval;

function startTimer() {
  startTime = Date.now();
  timerInterval = setInterval(() => {
    const sec = Math.floor((Date.now() - startTime) / 1000);
    const m = String(Math.floor(sec / 60)).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");
    document.getElementById("timer").textContent = `Süre: ${m}:${s}`;
  }, 1000);
}
