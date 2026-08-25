const vehicleSeed = [
  {
    id: 'VH-204',
    status: 'Active',
    speed: 66,
    battery: 82,
    lat: 43.6532,
    lon: -79.3832,
    route: [
      { lat: 43.65, lon: -79.39 },
      { lat: 43.658, lon: -79.372 },
      { lat: 43.668, lon: -79.36 },
      { lat: 43.676, lon: -79.35 },
      { lat: 43.688, lon: -79.34 }
    ]
  },
  {
    id: 'VH-318',
    status: 'Warning',
    speed: 48,
    battery: 51,
    lat: 43.6647,
    lon: -79.388,
    route: [
      { lat: 43.66, lon: -79.39 },
      { lat: 43.666, lon: -79.381 },
      { lat: 43.677, lon: -79.369 },
      { lat: 43.685, lon: -79.36 },
      { lat: 43.69, lon: -79.348 }
    ]
  },
  {
    id: 'VH-421',
    status: 'Active',
    speed: 72,
    battery: 91,
    lat: 43.676,
    lon: -79.41,
    route: [
      { lat: 43.67, lon: -79.42 },
      { lat: 43.678, lon: -79.405 },
      { lat: 43.686, lon: -79.392 },
      { lat: 43.692, lon: -79.377 },
      { lat: 43.703, lon: -79.368 }
    ]
  },
  {
    id: 'VH-892',
    status: 'Maintenance',
    speed: 18,
    battery: 34,
    lat: 43.6875,
    lon: -79.402,
    route: [
      { lat: 43.685, lon: -79.41 },
      { lat: 43.689, lon: -79.399 },
      { lat: 43.694, lon: -79.39 },
      { lat: 43.698, lon: -79.382 },
      { lat: 43.703, lon: -79.37 }
    ]
  },
  {
    id: 'VH-110',
    status: 'Active',
    speed: 81,
    battery: 76,
    lat: 43.712,
    lon: -79.374,
    route: [
      { lat: 43.708, lon: -79.382 },
      { lat: 43.714, lon: -79.374 },
      { lat: 43.719, lon: -79.366 },
      { lat: 43.724, lon: -79.355 },
      { lat: 43.731, lon: -79.347 }
    ]
  }
];

const state = {
  vehicles: structuredClone(vehicleSeed),
  selectedVehicleId: vehicleSeed[0].id,
  speedHistory: Array.from({ length: 12 }, (_, i) => 60 + Math.sin(i / 2) * 12),
  batteryHistory: Array.from({ length: 12 }, (_, i) => 78 - (i % 5)),
  lastUpdate: new Date()
};

const vehicleListEl = document.getElementById('vehicle-list');
const onlineCountEl = document.getElementById('online-count');
const avgSpeedEl = document.getElementById('avg-speed');
const avgBatteryEl = document.getElementById('avg-battery');
const activeRoutesEl = document.getElementById('active-routes');
const lastUpdateEl = document.getElementById('last-update');

const speedValueEl = document.getElementById('speed-value');
const speedStatusEl = document.getElementById('speed-status');
const batteryValueEl = document.getElementById('battery-value');
const batteryFillEl = document.getElementById('battery-fill');
const batteryStatusEl = document.getElementById('battery-status');
const latValueEl = document.getElementById('lat-value');
const lonValueEl = document.getElementById('lon-value');
const gpsStatusEl = document.getElementById('gps-status');

const routeLayerEl = document.getElementById('route-layer');
const markerLayerEl = document.getElementById('marker-layer');

const speedChartEl = document.getElementById('speed-chart');
const batteryChartEl = document.getElementById('battery-chart');

// Quick-win: extract map bounds and pixel sizes into constants
const MAP_BOUNDS = {
  minLat: 43.645,
  maxLat: 43.735,
  minLon: -79.425,
  maxLon: -79.338
};
const MAP_PX = { width: 620, height: 260 };

// Quick-win: cache frequently-used DOM nodes that were queried inside hot paths
const gaugeRingEl = document.querySelector('.gauge-ring');

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function formatTime(date) {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function getSelectedVehicle() {
  return state.vehicles.find((vehicle) => vehicle.id === state.selectedVehicleId) ?? state.vehicles[0];
}

function renderVehicleList() {
  vehicleListEl.innerHTML = '';

  state.vehicles.forEach((vehicle) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = `vehicle-item ${vehicle.id === state.selectedVehicleId ? 'active' : ''}`;
    item.innerHTML = `
      <div class="vehicle-meta">
        <span class="vehicle-id">${vehicle.id}</span>
        <span class="vehicle-tag ${vehicle.status === 'Active' ? 'active' : 'warning'}">${vehicle.status}</span>
      </div>
      <div class="vehicle-details">
        <span>${vehicle.speed} km/h</span>
        <span>${vehicle.battery}% battery</span>
      </div>
    `;
    item.addEventListener('click', () => {
      state.selectedVehicleId = vehicle.id;
      renderDashboard();
    });
    vehicleListEl.appendChild(item);
  });
}

function updateSummary() {
  const onlineCount = state.vehicles.filter((vehicle) => vehicle.status !== 'Maintenance').length;
  const averageSpeed = Math.round(
    state.vehicles.reduce((sum, vehicle) => sum + vehicle.speed, 0) / state.vehicles.length
  );
  const averageBattery = Math.round(
    state.vehicles.reduce((sum, vehicle) => sum + vehicle.battery, 0) / state.vehicles.length
  );
  const activeRoutes = state.vehicles.filter((vehicle) => vehicle.status === 'Active').length;

  onlineCountEl.textContent = String(onlineCount);
  avgSpeedEl.textContent = `${averageSpeed} km/h`;
  avgBatteryEl.textContent = `${averageBattery}%`;
  activeRoutesEl.textContent = String(activeRoutes);
  lastUpdateEl.textContent = formatTime(state.lastUpdate);
}

function updateTelemetryCard() {
  const vehicle = getSelectedVehicle();

  speedValueEl.textContent = String(vehicle.speed);
  batteryValueEl.textContent = `${vehicle.battery}%`;
  batteryFillEl.style.width = `${vehicle.battery}%`;
  latValueEl.textContent = vehicle.lat.toFixed(4);
  lonValueEl.textContent = vehicle.lon.toFixed(4);

  if (vehicle.speed > 75) {
    speedStatusEl.textContent = 'High';
    speedStatusEl.style.color = '#ff6b7f';
    speedStatusEl.style.background = 'rgba(255, 107, 127, 0.12)';
  } else if (vehicle.speed > 35) {
    speedStatusEl.textContent = 'Nominal';
    speedStatusEl.style.color = '#52d8ff';
    speedStatusEl.style.background = 'rgba(82, 216, 255, 0.15)';
  } else {
    speedStatusEl.textContent = 'Low';
    speedStatusEl.style.color = '#f3bf4d';
    speedStatusEl.style.background = 'rgba(243, 191, 77, 0.12)';
  }

  if (vehicle.battery < 30) {
    batteryStatusEl.textContent = 'Low';
    batteryStatusEl.style.color = '#ff6b7f';
    batteryStatusEl.style.background = 'rgba(255, 107, 127, 0.12)';
  } else if (vehicle.battery < 60) {
    batteryStatusEl.textContent = 'Moderate';
    batteryStatusEl.style.color = '#f3bf4d';
    batteryStatusEl.style.background = 'rgba(243, 191, 77, 0.12)';
  } else {
    batteryStatusEl.textContent = 'Healthy';
    batteryStatusEl.style.color = '#39d39f';
    batteryStatusEl.style.background = 'rgba(57, 211, 159, 0.12)';
  }

  gpsStatusEl.textContent = vehicle.status === 'Maintenance' ? 'Idle' : 'Tracking';
  gpsStatusEl.style.color = vehicle.status === 'Maintenance' ? '#f3bf4d' : '#39d39f';
  gpsStatusEl.style.background = vehicle.status === 'Maintenance' ? 'rgba(243, 191, 77, 0.12)' : 'rgba(57, 211, 159, 0.12)';

  // use cached gauge element
  if (gaugeRingEl) {
    const degrees = clamp(vehicle.speed / 100, 0, 1) * 300;
    gaugeRingEl.style.background = `conic-gradient(var(--cyan) 0deg ${degrees}deg, rgba(82, 216, 255, 0.12) ${degrees}deg 360deg)`;
  }
}

function toMapPosition(lat, lon) {
  const { minLat, maxLat, minLon, maxLon } = MAP_BOUNDS;
  const { width, height } = MAP_PX;

  const x = ((lon - minLon) / (maxLon - minLon)) * width;
  const y = height - ((lat - minLat) / (maxLat - minLat)) * height;

  return { x, y };
}

function renderMap() {
  routeLayerEl.innerHTML = '';
  markerLayerEl.innerHTML = '';

  state.vehicles.forEach((vehicle) => {
    const points = vehicle.route.map(({ lat, lon }) => {
      const position = toMapPosition(lat, lon);
      return `${position.x},${position.y}`;
    }).join(' ');

    const route = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    route.setAttribute('points', points);
    route.setAttribute('class', 'route');
    if (vehicle.id === state.selectedVehicleId) {
      route.setAttribute('stroke-width', '6');
    }
    routeLayerEl.appendChild(route);

    const position = toMapPosition(vehicle.lat, vehicle.lon);
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    marker.setAttribute('class', `marker ${vehicle.id === state.selectedVehicleId ? 'active' : ''}`);
    marker.setAttribute('transform', `translate(${position.x}, ${position.y})`);
    marker.innerHTML = `
      <circle class="glow" r="14" />
      <circle class="pin" r="7" />
    `;
    markerLayerEl.appendChild(marker);
  });
}

function drawChart(canvas, values, color, label) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;

  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = 'rgba(146, 181, 255, 0.18)';
  ctx.lineWidth = 1;

  for (let i = 0; i <= 4; i++) {
    const y = (height / 4) * i;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  ctx.beginPath();
  values.forEach((value, index) => {
    const x = (index / (values.length - 1)) * width;
    const y = height - (value / 100) * height;
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.font = '11px Segoe UI';
  ctx.fillStyle = '#9ab4d8';
  ctx.fillText(label, 10, 18);
}

function updateCharts() {
  const vehicle = getSelectedVehicle();
  const speedTrend = [...state.speedHistory, vehicle.speed].slice(-12);
  const batteryTrend = [...state.batteryHistory, vehicle.battery].slice(-12);

  state.speedHistory = speedTrend;
  state.batteryHistory = batteryTrend;

  drawChart(speedChartEl, speedTrend, '#52d8ff', 'Speed');
  drawChart(batteryChartEl, batteryTrend, '#39d39f', 'Battery');
}

function renderDashboard() {
  renderVehicleList();
  updateSummary();
  updateTelemetryCard();
  renderMap();
  updateCharts();
}

function updateVehicleTelemetry() {
  state.vehicles = state.vehicles.map((vehicle) => {
    const dir = Math.random() > 0.5 ? 1 : -1;
    const speedShift = Math.floor(Math.random() * 12) * dir;
    const batteryShift = Math.random() * 5;

    const nextSpeed = clamp(vehicle.speed + speedShift, 8, 105);
    const nextBattery = clamp(vehicle.battery - batteryShift + (vehicle.status === 'Active' ? 0.6 : 0.2), 12, 100);
    const drift = 0.0008;

    const nextLat = clamp(vehicle.lat + (Math.random() - 0.5) * drift, 43.648, 43.733);
    const nextLon = clamp(vehicle.lon + (Math.random() - 0.5) * drift, -79.424, -79.34);

    return {
      ...vehicle,
      speed: Math.round(nextSpeed),
      battery: Number(nextBattery.toFixed(0)),
      lat: Number(nextLat.toFixed(4)),
      lon: Number(nextLon.toFixed(4))
    };
  });

  state.lastUpdate = new Date();
  renderDashboard();
}

renderDashboard();

// Timer wrapper so we can start/stop and add lifecycle handling (quick-win)
const TelemetryTimer = {
  id: null,
  intervalMs: 1800,
  start() {
    if (this.id) return;
    this.id = setInterval(updateVehicleTelemetry, this.intervalMs);
  },
  stop() {
    if (!this.id) return;
    clearInterval(this.id);
    this.id = null;
  }
};

// Pause updates when the document is hidden to save CPU
document.addEventListener('visibilitychange', () => {
  if (document.hidden) TelemetryTimer.stop(); else TelemetryTimer.start();
});

// Start the telemetry timer
TelemetryTimer.start();
