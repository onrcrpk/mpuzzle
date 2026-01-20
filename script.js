const container = document.getElementById("map-container");
const rotateWarning = document.getElementById("rotate-warning");

/* =========================
   LANDSCAPE ZORUNLULUĞU
========================= */
function checkOrientation() {
  if (window.innerHeight > window.innerWidth) {
    rotateWarning.style.display = "flex";
    container.style.display = "none";
  } else {
    rotateWarning.style.display = "none";
    container.style.display = "block";
  }
}

window.addEventListener("resize", checkOrientation);
window.addEventListener("orientationchange", checkOrientation);
checkOrientation();

/* =========================
   BOYUT HESAPLAMA
========================= */
function getSize() {
  return {
    width: container.clientWidth,
    height: container.clientHeight || window.innerHeight
  };
}

let { width, height } = getSize();
let timerStarted = false;

/* =========================
   SVG
========================= */
const svg = d3.select("#map-container")
  .append("svg")
  .attr("viewBox", `0 0 ${width} ${height}`)
  .attr("preserveAspectRatio", "xMidYMid meet")
  .style("width", "100%")
  .style("height", "100%")
  .style("touch-action", "none");

/* =========================
   FRAME
========================= */
const frameMargin = 10;
const frameWidth = width - frameMargin * 2;
const frameHeight = height - frameMargin * 2;

svg.append("rect")
  .attr("x", frameMargin)
  .attr("y", frameMargin)
  .attr("width", frameWidth)
  .attr("height", frameHeight)
  .attr("fill", "none")
  .attr("stroke", "#000")
  .attr("stroke-width", 4)
  .attr("rx", 8);

/* =========================
   PROJECTION
========================= */
const scale = width < 700 ? width * 3.8 : 3000;

const projection = d3.geoMercator()
  .center([35, 39])
  .scale(scale)
  .translate([width / 2, height / 2]);

const path = d3.geoPath().projection(projection);

/* =========================
   TOUCH / MOUSE HELPER
========================= */
function getPoint(event) {
  const e = event.sourceEvent.touches
    ? event.sourceEvent.touches[0]
    : event.sourceEvent;

  const svgNode = svg.node();
  const pt = svgNode.createSVGPoint();
  pt.x = e.clientX;
  pt.y = e.clientY;

  const cursor = pt.matrixTransform(
    svgNode.getScreenCTM().inverse()
  );

  return [cursor.x, cursor.y];
}

/* =========================
   TIMER
========================= */
let startTime, timerInterval;

function startTimer() {
  startTime = Date.now();
  timerInterval = setInterval(() => {
    const s = Math.floor((Date.now() - startTime) / 1000);
    const m = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    document.getElementById("timer").textContent = `Süre: ${m}:${ss}`;
  }, 1000);
}

/* =========================
   LOAD MAP & GAME
========================= */
d3.json("turkiye.geojson").then(data => {

  /* BASE MAP */
  const baseGroup = svg.append("g");

  baseGroup.selectAll("path")
    .data(data.features)
    .enter()
    .append("path")
    .attr("d", path)
    .attr("fill", "#f0f0f0")
    .attr("stroke", "#bbb");

  /* PUZZLE PIECES */
  const shuffled = data.features.sort(() => Math.random() - 0.5);

  const pieces = svg.selectAll(".piece")
    .data(shuffled)
    .enter()
    .append("g")
    .attr("class", "piece");

  const step = (2 * (frameWidth + frameHeight)) / shuffled.length;
  const frameOffset = 45;

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
      .attr("transform", `translate(${x},${y}) scale(1.15)`)
      .append("path")
      .attr("d", path(d))
      .attr("fill", "#ccc")
      .attr("stroke", "#333")
      .attr("transform", `translate(${-centroid[0]},${-centroid[1]})`)
      .style("cursor", "grab");
  });

  /* GAME LOGIC */
  let offsetX, offsetY;
  let correct = 0;
  const total = 81;
  const snapDistance = width < 700 ? 50 : 15;

  function updateScore() {
    document.getElementById("score").textContent = `${correct} / ${total}`;
  }

  const drag = d3.drag()
    .on("start", function(event) {
      if (d3.select(this).classed("fixed")) return;

      if (navigator.vibrate) navigator.vibrate(10);

      const [mx, my] = getPoint(event);
      const t = d3.select(this)
        .attr("transform")
        .match(/translate\(([^,]+),([^)]+)\)/);

      offsetX = mx - parseFloat(t[1]);
      offsetY = my - parseFloat(t[2]);

      d3.select(this).raise();
    })

    .on("drag", function(event) {
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
      const t = d3.select(this)
        .attr("transform")
        .match(/translate\(([^,]+),([^)]+)\)/);

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
