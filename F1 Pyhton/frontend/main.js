import Chart from 'chart.js/auto';
import zoomPlugin from 'chartjs-plugin-zoom';

Chart.register(zoomPlugin);

// Prodüksiyon için VITE_API_URL kullan, yoksa yerel adrese dön
const API_BASE = import.meta.env?.VITE_API_URL || 'http://localhost:8000/api';

// Arayüz Elementleri
const yearSelect = document.getElementById('year-select');
const raceSelect = document.getElementById('race-select');
const sessionSelect = document.getElementById('session-select');
const driver1Select = document.getElementById('driver1-select');
const driver2Select = document.getElementById('driver2-select');
const analyzeBtn = document.getElementById('analyze-btn');
const statusBar = document.getElementById('status-bar');
const loadingOverlay = document.getElementById('loading-overlay');

// Mobil Menü Elementleri
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const closeMenuBtn = document.getElementById('close-menu-btn');
const mainSidebar = document.getElementById('main-sidebar');
const mobileOverlay = document.getElementById('mobile-overlay');

// Grafik Örnekleri (Yenilemek için hafızada tutuyoruz)
let speedChartInstance = null;
let gearChartInstance = null;
let throttleChartInstance = null;
let rpmChartInstance = null;
let trackMapInstance = null;
let globalRaces = [];
let currentLang = 'tr';

const translations = {
  tr: {
    logo: 'Formula 1<br><span class="accent">Telemetry</span>',
    lbl_year: 'Yıl',
    lbl_race: 'Yarış (Grand Prix)',
    lbl_session: 'Seans (Session)',
    lbl_d1: 'Pilot 1 (Driver 1)',
    lbl_d2: 'Pilot 2 (Karşılaştırma)',
    btn_analyze: 'Telemetriyi Analiz Et',
    status_initial: 'Lütfen analiz etmek istediğiniz yarışı ve pilotu seçin.',
    status_loading_drivers: 'Pilotlar yükleniyor, lütfen bekleyin...',
    status_loading_telemetry: 'Telemetri verileri çekiliyor. (30-40 sn sürebilir)...',
    status_error_api: 'API Bağlantı Hatası: Python sunucusunun çalıştığından emin olun.',
    status_error_drivers: 'Pilotlar yüklenirken hata oluştu.',
    status_error_data: 'Veri hatası',
    wid_weather: '🌤️ Hava Durumu',
    w_air: 'Hava',
    w_track: 'Pist',
    w_humidity: 'Nem',
    w_wind: 'Rüzgar',
    loading_text: 'Veriler işleniyor (İlk yükleme 30-40 sn sürebilir)...',
    chart_track: '🏁 Pist Haritası (Kıyaslama)',
    chart_speed: 'Hız Telemetrisi (Speed km/h)',
    chart_gear: 'Vites (Gear)',
    chart_throttle: 'Gaz Pedalı (Throttle %)',
    chart_rpm: 'Motor Devri (RPM)',
    title_leaderboard: '🏆 Klasman',
    opt_loading: 'Yükleniyor...',
    opt_wait_year: 'Önce yıl seçin',
    opt_wait_race: 'Önce yarış seçin',
    opt_wait_session: 'Önce seans seçin',
    opt_select_year: 'Yıl Seçin',
    opt_select_race: 'Yarış Seçin',
    opt_select_session: 'Seans Seçin',
    opt_select_driver: 'Pilot Seçin',
    opt_none: 'Seçilmedi',
    axis_dist: 'Pist Mesafesi (m)',
    label_speed: 'Hız (km/h)',
    label_gear: 'Vites',
    label_throttle: 'Gaz (%)',
    label_rpm: 'RPM',
    label_trajectory: 'Yörünge',
    label_brake: 'Ort. Fren',
    label_apex: 'Apex Hızı'
  },
  en: {
    logo: 'Formula 1<br><span class="accent">Telemetry</span>',
    lbl_year: 'Year',
    lbl_race: 'Race (Grand Prix)',
    lbl_session: 'Session',
    lbl_d1: 'Driver 1',
    lbl_d2: 'Driver 2 (Comparison)',
    btn_analyze: 'Analyze Telemetry',
    status_initial: 'Please select the race and driver you want to analyze.',
    status_loading_drivers: 'Loading drivers, please wait...',
    status_loading_telemetry: 'Fetching telemetry data. (May take 30-40 sec)...',
    status_error_api: 'API Connection Error: Ensure Python server is running.',
    status_error_drivers: 'Error loading drivers.',
    status_error_data: 'Data error',
    wid_weather: '🌤️ Weather',
    w_air: 'Air',
    w_track: 'Track',
    w_humidity: 'Humidity',
    w_wind: 'Wind',
    loading_text: 'Processing data (Initial load may take 30-40 sec)...',
    chart_track: '🏁 Track Map (Comparison)',
    chart_speed: 'Speed Telemetry (km/h)',
    chart_gear: 'Gear',
    chart_throttle: 'Throttle (%)',
    chart_rpm: 'Engine RPM',
    title_leaderboard: '🏆 Standings',
    opt_loading: 'Loading...',
    opt_wait_year: 'Select year first',
    opt_wait_race: 'Select race first',
    opt_wait_session: 'Select session first',
    opt_select_year: 'Select Year',
    opt_select_race: 'Select Race',
    opt_select_session: 'Select Session',
    opt_select_driver: 'Select Driver',
    opt_none: 'None',
    axis_dist: 'Track Distance (m)',
    label_speed: 'Speed (km/h)',
    label_gear: 'Gear',
    label_throttle: 'Throttle (%)',
    label_rpm: 'RPM',
    label_trajectory: 'Trajectory',
    label_brake: 'Avg. Brake',
    label_apex: 'Apex Speed'
  }
};

function changeLanguage(lang) {
  currentLang = lang;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (translations[lang][key]) {
      el.innerHTML = translations[lang][key];
    }
  });

  // Buton aktiflik durumu
  document.getElementById('lang-tr').classList.toggle('active', lang === 'tr');
  document.getElementById('lang-en').classList.toggle('active', lang === 'en');
  
  // Eğer grafikler varsa başlıklarını da güncellemek gerekebilir (Opsiyonel: Yeniden çizme tetiklenebilir)
}

document.getElementById('lang-tr').addEventListener('click', () => changeLanguage('tr'));
document.getElementById('lang-en').addEventListener('click', () => changeLanguage('en'));

function renderLeaderboard(drivers) {
  const lbContainer = document.getElementById('leaderboard-sidebar');
  const lbList = document.getElementById('leaderboard-list');
  
  if (!drivers || drivers.length === 0) {
    lbContainer.classList.add('hidden');
    return;
  }
  
  lbContainer.classList.remove('hidden');
  lbList.innerHTML = '';
  
  drivers.forEach(d => {
    const item = document.createElement('div');
    item.className = 'lb-item';
    item.style.setProperty('--t-color', d.color);
    
    const pos = d.position > 0 ? d.position : '-';
    const timeText = d.time ? `+${d.time}` : d.status;
    
    item.innerHTML = `
      <span class="lb-pos">${pos}</span>
      <span class="lb-name">${d.abbr} <small>${d.team}</small></span>
      <div class="lb-meta">
        <div class="lb-time">${timeText}</div>
      </div>
    `;
    lbList.appendChild(item);
  });
}

// Mobil Menü Fonksiyonları
function toggleMobileMenu(show) {
  if (show) {
    mainSidebar.classList.add('active');
    mobileOverlay.classList.add('active');
  } else {
    mainSidebar.classList.remove('active');
    mobileOverlay.classList.remove('active');
  }
}

if(mobileMenuBtn) mobileMenuBtn.addEventListener('click', () => toggleMobileMenu(true));
if(closeMenuBtn) closeMenuBtn.addEventListener('click', () => toggleMobileMenu(false));
if(mobileOverlay) mobileOverlay.addEventListener('click', () => toggleMobileMenu(false));

// Pencere Boyutu Değişimi (Grafikleri Tazele)
window.addEventListener('resize', () => {
  if (speedChartInstance) speedChartInstance.resize();
  if (gearChartInstance) gearChartInstance.resize();
  if (trackMapInstance) trackMapInstance.resize();
});

// Başlangıç (Yılları Yükle)
async function init() {
  try {
    const res = await fetch(`${API_BASE}/years`);
    const years = await res.json();
    
    yearSelect.innerHTML = `<option value="">${translations[currentLang].opt_select_year}</option>`;
    years.forEach(y => {
      yearSelect.innerHTML += `<option value="${y}">${y}</option>`;
    });
    yearSelect.disabled = false;
  } catch (err) {
    statusBar.textContent = translations[currentLang].status_error_api;
    statusBar.style.color = 'var(--accent)';
  }
}

// Olay Dinleyicileri (Event Listeners)
yearSelect.addEventListener('change', async (e) => {
  const year = e.target.value;
  if (!year) return resetForm(1);
  
  raceSelect.innerHTML = `<option value="">${translations[currentLang].opt_loading}</option>`;
  raceSelect.disabled = true;
  resetForm(1);
  
  const res = await fetch(`${API_BASE}/races/${year}`);
  const fetchedRaces = await res.json();
  globalRaces = fetchedRaces;
  
  raceSelect.innerHTML = `<option value="">${translations[currentLang].opt_select_race}</option>`;
  fetchedRaces.forEach(r => {
    raceSelect.innerHTML += `<option value="${r.round}">${r.round} - ${r.event_name} (${r.country})</option>`;
  });
  raceSelect.disabled = false;
});

raceSelect.addEventListener('change', async (e) => {
  const round = e.target.value;
  const year = yearSelect.value;
  if (!round) return resetForm(2);
  
  sessionSelect.innerHTML = `<option value="">${translations[currentLang].opt_loading}</option>`;
  sessionSelect.disabled = true;
  resetForm(2);
  
  const res = await fetch(`${API_BASE}/sessions/${year}/${round}`);
  const data = await res.json();
  
  sessionSelect.innerHTML = `<option value="">${translations[currentLang].opt_select_session}</option>`;
  data.sessions.forEach(s => {
    sessionSelect.innerHTML += `<option value="${s.identifier}">${s.name}</option>`;
  });
  sessionSelect.disabled = false;
});

sessionSelect.addEventListener('change', async (e) => {
  const sessionId = e.target.value;
  const round = raceSelect.value;
  const year = yearSelect.value;
  if (!sessionId) return resetForm(3);
  
  driver1Select.innerHTML = `<option value="">${translations[currentLang].opt_loading}</option>`;
  driver2Select.innerHTML = `<option value="">${translations[currentLang].opt_loading}</option>`;
  driver1Select.disabled = true;
  driver2Select.disabled = true;
  
  statusBar.textContent = translations[currentLang].status_loading_drivers;
  statusBar.style.color = '';
  
  try {
    const res = await fetch(`${API_BASE}/drivers/${year}/${round}/${sessionId}`);
    const drivers = await res.json();
    
    // Klasmanı/Leaderboard'u güncelle
    renderLeaderboard(drivers);
    
    statusBar.textContent = translations[currentLang].status_initial;
    
    let optionsText = `<option value="">${translations[currentLang].opt_select_driver}</option>`;
    drivers.forEach(d => {
      optionsText += `<option value="${d.number}" data-color="${d.color}">${d.number} - ${d.abbr} (${d.name})</option>`;
    });
    
    driver1Select.innerHTML = optionsText;
    driver2Select.innerHTML = `<option value="">${translations[currentLang].opt_none}</option>` + optionsText;
    
    driver1Select.disabled = false;
    driver2Select.disabled = false;
  } catch(e) {
    statusBar.textContent = translations[currentLang].status_error_drivers;
    statusBar.style.color = 'var(--accent)';
  }
});

driver1Select.addEventListener('change', () => {
  analyzeBtn.disabled = !driver1Select.value;
});

analyzeBtn.addEventListener('click', async () => {
  const year = yearSelect.value;
  const round = raceSelect.value;
  const sessionId = sessionSelect.value;
  const d1 = driver1Select.value;
  const d2 = driver2Select.value;
  
  // Fetch edilen rengi almak
  const c1 = driver1Select.options[driver1Select.selectedIndex].getAttribute('data-color') || '#F9182C';
  const c2 = driver2Select.value ? (driver2Select.options[driver2Select.selectedIndex].getAttribute('data-color') || '#45a29e') : null;

  loadingOverlay.classList.remove('hidden');
  statusBar.textContent = translations[currentLang].status_loading_telemetry;
  statusBar.style.color = '';
  
  try {
    let url = `${API_BASE}/telemetry/${year}/${round}/${sessionId}?driver1=${d1}`;
    if (d2) url += `&driver2=${d2}`;
    
    const res = await fetch(url);
    if(!res.ok) throw new Error(translations[currentLang].status_error_data);
    const data = await res.json();
    
    // YENİ: Bilgi kartlarını ve widgetları doldur
    renderWidgets(data);
    
    // Grafikleri Güncelle
    renderCharts(data, [c1, c2]);
    
    // Mesaj güncelle
    let msg = `Analiz tamamlandı. (Pilot 1 En Hızlı Tur: ${data[0].lap_time})`;
    if(data.length > 1) msg += `, (Pilot 2: ${data[1].lap_time})`;
    statusBar.textContent = msg;
    statusBar.style.color = '#45a29e';
    
  } catch (err) {
    statusBar.textContent = 'Analiz sırasında hata oluştu. Muhtemelen seçilen seansta veya pilotlarda telemetri yok.';
    statusBar.style.color = 'var(--accent)';
  } finally {
    loadingOverlay.classList.add('hidden');
  }
});

function resetForm(level) {
  if (level <= 1) {
    raceSelect.innerHTML = '<option>Önce yıl seçin</option>';
    raceSelect.disabled = true;
  }
  if (level <= 2) {
    sessionSelect.innerHTML = '<option>Önce yarış seçin</option>';
    sessionSelect.disabled = true;
  }
  if (level <= 3) {
    driver1Select.innerHTML = '<option>Önce seans seçin</option>';
    driver2Select.innerHTML = '<option>Karşılaştırma için pilot seçin</option>';
    driver1Select.disabled = true;
    driver2Select.disabled = true;
    analyzeBtn.disabled = true;
  }
  document.getElementById('stats-ribbon').classList.add('hidden');
}

// --- Bilgi Kartları (Widgets) Mantığı ---
function renderWidgets(data) {
  const d1Info = data[0];
  const d2Info = data.length > 1 ? data[1] : null;

  const ribbon = document.getElementById('stats-ribbon');
  ribbon.classList.remove('hidden');

  // Hava Durumu (Kompakt)
  if (d1Info.weather) {
    document.getElementById('w-air').textContent = d1Info.weather.AirTemp ?? '-';
    document.getElementById('w-track').textContent = d1Info.weather.TrackTemp ?? '-';
  }

  // Pilot 1
  document.getElementById('d1-name').textContent = d1Info.driver;
  document.getElementById('d1-lap').textContent = d1Info.lap_time;
  if(d1Info.lap_details) {
    document.getElementById('d1-compound').textContent = d1Info.lap_details.Compound;
    document.getElementById('d1-tyrelife').textContent = d1Info.lap_details.TyreLife;
  }

  // Pilot 2 (Ribbon Mantığı)
  const d2Ribbon = document.getElementById('d2-ribbon');
  const d2Divider = document.getElementById('d2-divider');
  
  if (d2Info) {
    d2Ribbon.classList.remove('hidden');
    if(d2Divider) d2Divider.classList.remove('hidden');
    
    document.getElementById('d2-name').textContent = d2Info.driver;
    document.getElementById('d2-lap').textContent = d2Info.lap_time;
    if(d2Info.lap_details) {
      document.getElementById('d2-compound').textContent = d2Info.lap_details.Compound;
      document.getElementById('d2-tyrelife').textContent = d2Info.lap_details.TyreLife;
    }
  } else {
    d2Ribbon.classList.add('hidden');
    if(d2Divider) d2Divider.classList.add('hidden');
  }
}

// --- Grafik Çizim (Chart.js) Mantığı ---
function renderCharts(driversData, driverColors) {
  const canvasSpeed = document.getElementById('speed-chart');
  const canvasGear = document.getElementById('gear-chart');
  const canvasThrottle = document.getElementById('throttle-chart');
  const canvasRpm = document.getElementById('rpm-chart');
  const canvasTrack = document.getElementById('track-map-chart');
  
  // Önceki grafikleri temizle
  if (speedChartInstance) speedChartInstance.destroy();
  if (gearChartInstance) gearChartInstance.destroy();
  if (throttleChartInstance) throttleChartInstance.destroy();
  if (rpmChartInstance) rpmChartInstance.destroy();
  if (trackMapInstance) trackMapInstance.destroy();
  
  // --- PİST HARİTASI (OTOMATİK YÖN VE GÜRÜLTÜ FİLTRESİ) ---
  
  // 1. Koordinat Anormalliklerini (GPS Tünel Kopmalarını) Engellemek için Medyan Bulma
  let allXRaw = [], allYRaw = [];
  driversData.forEach(d => {
      d.telemetry.forEach(t => {
          if (t.X != null && t.Y != null && (t.X !== 0 || t.Y !== 0)) {
              allXRaw.push(t.X);
              allYRaw.push(t.Y);
          }
      });
  });
  allXRaw.sort((a,b) => a-b);
  allYRaw.sort((a,b) => a-b);
  const medianX = allXRaw[Math.floor(allXRaw.length / 2)] || 0;
  const medianY = allYRaw[Math.floor(allYRaw.length / 2)] || 0;

  // 2. Dar/Geniş Ekran Sığdırması İçin Rotasyon İhtiyacı Analizi
  let minRawX = Infinity, maxRawX = -Infinity;
  let minRawY = Infinity, maxRawY = -Infinity;
  driversData.forEach(d => {
      d.telemetry.forEach(t => {
          if (t.X != null && t.Y != null && (t.X !== 0 || t.Y !== 0)) {
              if (Math.abs(t.X - medianX) < 15000 && Math.abs(t.Y - medianY) < 15000) {
                 if(t.X < minRawX) minRawX = t.X;
                 if(t.X > maxRawX) maxRawX = t.X;
                 if(t.Y < minRawY) minRawY = t.Y;
                 if(t.Y > maxRawY) maxRawY = t.Y;
              }
          }
      });
  });
  const rawRangeX = maxRawX - minRawX;
  const rawRangeY = maxRawY - minRawY;
  
  // Monaco gibi dikey (Tall) olan pistleri, yatay (Wide) monitöre güzel sığsın diye yan yatırıyoruz (90 Derece Sola Döndür)
  const shouldRotate = rawRangeY > (rawRangeX * 1.1);

  function transformCoord(t) {
      if (!t || t.X == null || t.Y == null || (t.X === 0 && t.Y === 0)) return null;
      if (Math.abs(t.X - medianX) > 15000 || Math.abs(t.Y - medianY) > 15000) return null; // Uçan GPS hatalarını direkt sil!
      
      let x = t.X;
      let y = -t.Y; // Harita Düzeltmesi
      
      if (shouldRotate) {
          x = -t.Y;
          y = -t.X;
      }
      return { x, y };
  }

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  const getMappedLine = (telemetry) => {
      let line = [];
      telemetry.forEach(t => {
         const pt = transformCoord(t);
         if(pt) {
            line.push({ x: pt.x, y: pt.y, t: t, speed: t.Speed });
            if(pt.x < minX) minX = pt.x;
            if(pt.x > maxX) maxX = pt.x;
            if(pt.y < minY) minY = pt.y;
            if(pt.y > maxY) maxY = pt.y;
         }
      });
      return line;
  };

  const baseDriver = driversData[0];
  const trackLineData = getMappedLine(baseDriver.telemetry);

  // --- İZOMETRİK (1:1) MANUEL ÖLÇEKELEME ---
  // Konteyner piksel boyutlarını alıyoruz
  const rect = canvasTrack.parentElement.getBoundingClientRect();
  const cWidth = rect.width || 800;
  const cHeight = rect.height || 500;
  
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;
  const rangeX = maxX - minX;
  const rangeY = maxY - minY;

  // Hangi boyuta göre ölçekleme yapılacağını seç (En dar kenar hangisiyse)
  // %10 (1.1) ekstra boşluk payı ekliyoruz
  const finalScale = Math.max(rangeX / cWidth, rangeY / cHeight) * 1.1;
  const spanX = cWidth * finalScale;
  const spanY = cHeight * finalScale;
  
  const minXAxis = midX - spanX / 2;
  const maxXAxis = midX + spanX / 2;
  const minYAxis = midY - spanY / 2;
  const maxYAxis = midY + spanY / 2;
  
  // Viraj ve Fren Algoritması
  let brakingZones = [];
  let apexSpeeds = [];
  let inBrakeZone = false;
  let currentZonePoints = [];

  for (let i = 0; i < baseDriver.telemetry.length; i++) {
    const t = baseDriver.telemetry[i];
    const pt = transformCoord(t);
    if (!pt) continue;

    if (t.Brake > 0) {
      inBrakeZone = true;
      currentZonePoints.push(pt);
    } else {
      if (inBrakeZone && currentZonePoints.length >= 3) {
        const midPoint = currentZonePoints[Math.floor(currentZonePoints.length / 2)];
        brakingZones.push({ x: midPoint.x, y: midPoint.y });

        let minSpeed = 999;
        let apexPoint = null;
        for (let j = i; j < Math.min(i + 15, baseDriver.telemetry.length); j++) {
            if (baseDriver.telemetry[j].Speed < minSpeed) {
                minSpeed = baseDriver.telemetry[j].Speed;
                const altPt = transformCoord(baseDriver.telemetry[j]);
                if (altPt) {
                    apexPoint = { x: altPt.x, y: altPt.y, speed: Math.round(minSpeed) };
                }
            }
        }
        if (apexPoint && minSpeed < 240) apexSpeeds.push(apexPoint);
      }
      inBrakeZone = false;
      currentZonePoints = [];
    }
  }
  
  const trackDatasets = [
    {
      type: 'line',
      label: `Yörünge P${baseDriver.driver}`,
      data: trackLineData,
      borderColor: driverColors[0] || 'rgba(255, 255, 255, 1)',
      borderWidth: 2,
      pointRadius: 0,
      tension: 0.1,
      showLine: true,
      order: 4
    },
    {
      type: 'scatter',
      label: `Ort. Fren (P${baseDriver.driver})`,
      data: brakingZones,
      backgroundColor: '#F9182C',
      borderColor: '#F9182C',
      pointRadius: 4,
      pointHoverRadius: 6,
      order: 2
    },
    {
      type: 'scatter',
      label: `Apex Hızı (P${baseDriver.driver})`,
      data: apexSpeeds,
      backgroundColor: '#00ff88',
      borderColor: '#00ff88',
      pointRadius: 5,
      pointHoverRadius: 8,
      order: 1
    }
  ];

  if (driversData.length > 1) {
    const d2 = driversData[1];
    const d2LineData = getMappedLine(d2.telemetry);
    
    let d2BrakingZones = [];
    let d2ApexSpeeds = [];
    let d2_inBrakeZone = false;
    let d2_currentZonePoints = [];

    for (let i = 0; i < d2.telemetry.length; i++) {
        const t = d2.telemetry[i];
        const pt = transformCoord(t);
        if(!pt) continue;

        if (t.Brake > 0) {
            d2_inBrakeZone = true;
            d2_currentZonePoints.push(pt);
        } else {
            if (d2_inBrakeZone && d2_currentZonePoints.length >= 3) {
                const midPoint = d2_currentZonePoints[Math.floor(d2_currentZonePoints.length / 2)];
                d2BrakingZones.push({ x: midPoint.x, y: midPoint.y });

                let minSpeed = 999;
                let apexPoint = null;
                for (let j = i; j < Math.min(i + 15, d2.telemetry.length); j++) {
                    if (d2.telemetry[j].Speed < minSpeed) {
                        minSpeed = d2.telemetry[j].Speed;
                        const altPt = transformCoord(d2.telemetry[j]);
                        if(altPt) {
                            apexPoint = { x: altPt.x, y: altPt.y, speed: Math.round(minSpeed) };
                        }
                    }
                }
                if (apexPoint && minSpeed < 240) d2ApexSpeeds.push(apexPoint);
            }
            d2_inBrakeZone = false;
            d2_currentZonePoints = [];
        }
    }
    
    trackDatasets.push(
      {
        type: 'line',
        label: `Yörünge P${d2.driver}`,
        data: d2LineData,
        borderColor: driverColors[1],
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.1,
        showLine: true,
        order: 5 
      },
      {
        type: 'scatter',
        label: `Ort. Fren (P${d2.driver})`,
        data: d2BrakingZones,
        backgroundColor: '#00d2ff', // Neon Mavi
        borderColor: '#00d2ff',
        pointRadius: 3,
        pointHoverRadius: 5,
        order: 3
      },
      {
        type: 'scatter',
        label: `Apex Hızı (P${d2.driver})`,
        data: d2ApexSpeeds,
        backgroundColor: '#ffb300', // Turuncu P2 Apex
        borderColor: '#ffb300',
        pointRadius: 4,
        pointHoverRadius: 7,
        order: 1
      }
    );
  }
  
  trackMapInstance = new Chart(canvasTrack, {
    data: { datasets: trackDatasets },
    options: {
      responsive: true,
      maintainAspectRatio: false, // Konteyneri doldur
      plugins: {
        legend: { labels: { color: '#f5f5f5', font: {family: "'Outfit', sans-serif"} } },
        tooltip: {
          enabled: true,
          callbacks: {
            label: function(context) {
              const dataset = context.dataset;
              const dataPoint = dataset.data[context.dataIndex];
              if(dataset.label.includes('Apex')) {
                  const labelPrefix = translations[currentLang].label_apex;
                  return `${labelPrefix}: ${dataPoint.speed} km/h`;
              }
              return dataset.label;
            }
          }
        }
      },
      scales: {
        x: { type: 'linear', display: false, min: minXAxis, max: maxXAxis },
        y: { type: 'linear', display: false, min: minYAxis, max: maxYAxis }
      },
      animation: false
    }
  });

  // --- HIZ, VİTES, GAZ, RPM GRAFİKLERİ ---
  const labels = driversData[0].telemetry.map(t => Math.round(t.Distance));

  const speedDatasets = driversData.map((d, i) => ({
    label: `${translations[currentLang].label_speed} (P${d.driver})`,
    data: d.telemetry.map(t => t.Speed),
    borderColor: driverColors[i],
    borderWidth: 2,
    pointRadius: 0,
    tension: 0.1
  }));

  const gearDatasets = driversData.map((d, i) => ({
    label: `${translations[currentLang].label_gear} (P${d.driver})`,
    data: d.telemetry.map(t => t.nGear),
    borderColor: driverColors[i],
    borderWidth: 2,
    pointRadius: 0,
    stepped: true
  }));

  const throttleDatasets = driversData.map((d, i) => ({
    label: `${translations[currentLang].label_throttle} (P${d.driver})`,
    data: d.telemetry.map(t => t.Throttle),
    borderColor: driverColors[i],
    borderWidth: 2,
    pointRadius: 0,
    fill: true,
    backgroundColor: driverColors[i] + '33' // 20% opacity
  }));

  const rpmDatasets = driversData.map((d, i) => ({
    label: `${translations[currentLang].label_rpm} (P${d.driver})`,
    data: d.telemetry.map(t => t.RPM),
    borderColor: driverColors[i],
    borderWidth: 2,
    pointRadius: 0,
    tension: 0.1
  }));

  const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#f5f5f5', font: {family: "'Outfit', sans-serif"} } },
      tooltip: { mode: 'index', intersect: false }
    },
    hover: { mode: 'nearest', intersect: true },
    scales: {
      x: { 
        ticks: { color: '#adb5bd', maxTicksLimit: 20 },
        grid: { color: 'rgba(255,255,255,0.05)' },
        title: { display: true, text: translations[currentLang].axis_dist, color: '#adb5bd' }
      },
      y: { ticks: { color: '#adb5bd' }, grid: { color: 'rgba(255,255,255,0.05)' } }
    }
  };

  speedChartInstance = new Chart(canvasSpeed, { type: 'line', data: { labels, datasets: speedDatasets }, options: baseOptions });
  gearChartInstance = new Chart(canvasGear, { type: 'line', data: { labels, datasets: gearDatasets }, options: baseOptions });
  throttleChartInstance = new Chart(canvasThrottle, { type: 'line', data: { labels, datasets: throttleDatasets }, options: baseOptions });
  rpmChartInstance = new Chart(canvasRpm, { type: 'line', data: { labels, datasets: rpmDatasets }, options: baseOptions });
}

// Uygulamayı Başlat
init();
