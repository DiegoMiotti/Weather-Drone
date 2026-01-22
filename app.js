// Configuración actualizada
const config = {
    defaultLocation: { lat: -34.6037, lon: -58.3816, name: "Buenos Aires" },
    apiUrl: "https://api.open-meteo.com/v1/forecast",
    geocodingUrl: "https://geocoding-api.open-meteo.com/v1/search",
    kpIndexUrl: "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json",
    
    // Límites para DJI Mini 2 (actualizado con Kp)
    limits: {
        wind: 29,       // km/h - viento máximo sostenido
        gusts: 38,      // km/h - ráfagas máximas
        tempMin: 0,     // °C - temperatura mínima
        tempMax: 40,    // °C - temperatura máxima
        rain: 20,       // % - probabilidad de lluvia máxima
        clouds: 70,     // % - nubosidad máxima
        visibility: 3,  // km - visibilidad mínima
        kpIndex: 4      // Índice Kp máximo recomendado (0-9)
    }
};

// Estado actualizado
let state = {
    location: config.defaultLocation,
    weatherData: null,
    kpIndex: 2,  // Valor por defecto
    kpStatus: "bajo",
    currentHour: 0,
    searchTimeout: null,
    conditions: null  // Para almacenar condiciones evaluadas
};

// Elementos actualizados
const elements = {
    location: document.getElementById('current-location'),
    cityInput: document.getElementById('city-input'),
    searchBtn: document.getElementById('search-btn'),
    searchResults: document.getElementById('search-results'),
    statusBanner: document.getElementById('status-banner'),
    statusTitle: document.getElementById('status-title'),
    statusDesc: document.getElementById('status-desc'),
    tempValue: document.getElementById('temp-value'),
    windValue: document.getElementById('wind-value'),
    gustValue: document.getElementById('gust-value'),
    cloudValue: document.getElementById('cloud-value'),
    rainValue: document.getElementById('rain-value'),
    visValue: document.getElementById('vis-value'),
    hourSlider: document.getElementById('hour-slider'),
    selectedHour: document.getElementById('selected-hour'),
    currentHourDisplay: document.getElementById('current-hour'),
    updateTime: document.getElementById('update-time'),
    recommendationsList: document.getElementById('recommendations-list'),
    loadingModal: document.getElementById('loading-modal'),
    detailsModal: document.getElementById('details-modal'),
    closeModal: document.getElementById('close-modal'),
    modalContent: document.getElementById('modal-content'),
    detailsBtn: document.getElementById('details-btn')
};

// Inicialización actualizada
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    setupEventListeners();
});

function initApp() {
    // Cargar datos iniciales
    Promise.all([
        loadWeatherData(),
        loadKpIndex()
    ]).then(() => {
        updateWeatherDisplay();
    }).catch(error => {
        console.error('Error inicializando:', error);
        // Mostrar datos por defecto
        updateWeatherDisplay();
    });
    
    updateTime();
    setInterval(updateTime, 60000);
}

function setupEventListeners() {
    // Eventos existentes...
    elements.searchBtn.addEventListener('click', () => {
        searchCity(elements.cityInput.value.trim());
    });

    elements.cityInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchCity(elements.cityInput.value.trim());
        }
    });

    elements.cityInput.addEventListener('input', () => {
        clearTimeout(state.searchTimeout);
        state.searchTimeout = setTimeout(() => {
            const query = elements.cityInput.value.trim();
            if (query.length > 2) {
                searchCitySuggestions(query);
            } else {
                elements.searchResults.innerHTML = '';
            }
        }, 500);
    });

    elements.hourSlider.addEventListener('input', (e) => {
        state.currentHour = parseInt(e.target.value);
        updateWeatherDisplay();
        updateHourDisplay();
    });

    // Nuevos eventos para el modal
    if (elements.detailsBtn) {
        elements.detailsBtn.addEventListener('click', showDetailsModal);
    }
    
    if (elements.closeModal) {
        elements.closeModal.addEventListener('click', () => {
            elements.detailsModal.style.display = 'none';
        });
    }

    // Cerrar modal al hacer clic fuera
    window.addEventListener('click', (e) => {
        if (elements.detailsModal && e.target === elements.detailsModal) {
            elements.detailsModal.style.display = 'none';
        }
    });
}

// FUNCIONES FALTANTES - AÑADIR ESTAS

function showLoading() {
    if (elements.loadingModal) {
        elements.loadingModal.style.display = 'flex';
    }
}

function hideLoading() {
    if (elements.loadingModal) {
        elements.loadingModal.style.display = 'none';
    }
}

function updateTime() {
    if (elements.updateTime) {
        const now = new Date();
        const timeString = now.toLocaleTimeString('es-AR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        elements.updateTime.textContent = timeString;
    }
}

function updateHourDisplay() {
    if (elements.selectedHour && elements.currentHourDisplay) {
        const hour = state.currentHour;
        const hourString = hour.toString().padStart(2, '0') + ':00';
        elements.selectedHour.textContent = hourString;
        elements.currentHourDisplay.textContent = hourString;
    }
}

function getCurrentHourData() {
    if (!state.weatherData || !state.weatherData.hourly) {
        // Datos por defecto para testing
        return {
            temp: 22,
            wind: 12,
            gusts: 15,
            clouds: 30,
            rain: 5,
            visibility: 10
        };
    }
    
    const hourly = state.weatherData.hourly;
    const hourIndex = Math.min(state.currentHour, hourly.temperature_2m.length - 1);
    
    return {
        temp: Math.round(hourly.temperature_2m[hourIndex] || 0),
        wind: Math.round(hourly.windspeed_10m[hourIndex] || 0),
        gusts: Math.round(hourly.windgusts_10m[hourIndex] || 0),
        clouds: Math.round(hourly.cloudcover[hourIndex] || 0),
        rain: Math.round(hourly.precipitation_probability[hourIndex] || 0),
        visibility: ((hourly.visibility[hourIndex] || 10000) / 1000).toFixed(1)
    };
}

async function searchCity(cityName) {
    if (!cityName) return;

    try {
        showLoading();
        
        const url = new URL(config.geocodingUrl);
        url.searchParams.append('name', cityName);
        url.searchParams.append('count', 5);
        url.searchParams.append('language', 'es');
        url.searchParams.append('format', 'json');

        const response = await fetch(url);
        const data = await response.json();

        if (data.results && data.results.length > 0) {
            const result = data.results[0];
            state.location = {
                lat: result.latitude,
                lon: result.longitude,
                name: result.name
            };
            
            if (elements.location) {
                elements.location.textContent = result.name;
            }
            
            if (elements.cityInput) {
                elements.cityInput.value = '';
            }
            
            if (elements.searchResults) {
                elements.searchResults.innerHTML = '';
            }
            
            // Recargar datos meteorológicos
            await Promise.all([
                loadWeatherData(),
                loadKpIndex()
            ]);
            
        } else {
            alert('Ciudad no encontrada. Intenta con otro nombre.');
        }
    } catch (error) {
        console.error('Error buscando ciudad:', error);
        alert('Error al buscar la ciudad. Verifica tu conexión.');
    } finally {
        hideLoading();
    }
}

async function searchCitySuggestions(query) {
    try {
        const url = new URL(config.geocodingUrl);
        url.searchParams.append('name', query);
        url.searchParams.append('count', 5);
        url.searchParams.append('language', 'es');
        url.searchParams.append('format', 'json');

        const response = await fetch(url);
        const data = await response.json();

        if (data.results && data.results.length > 0 && elements.searchResults) {
            showSearchResults(data.results);
        } else if (elements.searchResults) {
            elements.searchResults.innerHTML = '';
        }
    } catch (error) {
        console.error('Error buscando sugerencias:', error);
        if (elements.searchResults) {
            elements.searchResults.innerHTML = '';
        }
    }
}

function showSearchResults(results) {
    if (!elements.searchResults) return;
    
    elements.searchResults.innerHTML = '';
    
    results.forEach(result => {
        const div = document.createElement('div');
        div.className = 'result-item';
        div.innerHTML = `
            <strong>${result.name}</strong>
            <div style="font-size: 0.9em; opacity: 0.8;">
                ${result.admin1 ? result.admin1 + ', ' : ''}${result.country}
            </div>
        `;
        
        div.addEventListener('click', () => {
            state.location = {
                lat: result.latitude,
                lon: result.longitude,
                name: result.name
            };
            
            if (elements.location) {
                elements.location.textContent = result.name;
            }
            
            if (elements.cityInput) {
                elements.cityInput.value = '';
            }
            
            elements.searchResults.innerHTML = '';
            
            // Recargar datos
            Promise.all([
                loadWeatherData(),
                loadKpIndex()
            ]).then(() => {
                updateWeatherDisplay();
            });
        });
        
        elements.searchResults.appendChild(div);
    });
}

// Nueva función para cargar índice Kp
async function loadKpIndex() {
    try {
        // Usar proxy para evitar problemas CORS
        const proxyUrl = 'https://api.allorigins.win/raw?url=';
        const response = await fetch(proxyUrl + encodeURIComponent(config.kpIndexUrl));
        const data = await response.json();
        
        if (Array.isArray(data) && data.length > 1) {
            // El JSON tiene formato: [["time", "kp"], ["2024-01-01 00:00", "2"]]
            // Tomamos los últimos valores válidos
            const kpValues = data.slice(1)
                .map(item => {
                    if (Array.isArray(item) && item.length > 1) {
                        return parseFloat(item[1]);
                    }
                    return null;
                })
                .filter(kp => kp !== null && !isNaN(kp) && kp >= 0);
            
            if (kpValues.length > 0) {
                // Promedio de las últimas 3 horas
                const recentKp = kpValues.slice(-3);
                state.kpIndex = recentKp.reduce((a, b) => a + b, 0) / recentKp.length;
                
                // Determinar estado del Kp
                if (state.kpIndex <= 3) state.kpStatus = "bajo";
                else if (state.kpIndex <= 5) state.kpStatus = "moderado";
                else if (state.kpIndex <= 7) state.kpStatus = "alto";
                else state.kpStatus = "tormenta";
                
                console.log('Índice Kp cargado:', state.kpIndex, state.kpStatus);
            }
        }
    } catch (error) {
        console.error('Error cargando índice Kp:', error);
        // Valores por defecto
        state.kpIndex = 2;
        state.kpStatus = "bajo";
    }
}

// Función actualizada para evaluar condiciones (con Kp)
function evaluateConditions(data) {
    const conditions = {
        safe: true,
        warnings: [],
        dangers: [],
        details: []
    };

    // TEMPERATURA
    if (data.temp < config.limits.tempMin) {
        conditions.dangers.push(`Temperatura muy baja (${data.temp}°C)`);
        conditions.details.push({
            type: 'danger',
            title: 'Temperatura baja',
            message: `La temperatura de ${data.temp}°C está por debajo del mínimo recomendado (${config.limits.tempMin}°C) para el DJI Mini 2. Puede afectar la batería y el rendimiento.`,
            icon: 'fas fa-temperature-low'
        });
        conditions.safe = false;
    } else if (data.temp > config.limits.tempMax) {
        conditions.dangers.push(`Temperatura muy alta (${data.temp}°C)`);
        conditions.details.push({
            type: 'danger',
            title: 'Temperatura alta',
            message: `La temperatura de ${data.temp}°C excede el máximo recomendado (${config.limits.tempMax}°C). El dron puede sobrecalentarse y la batería se degradará más rápido.`,
            icon: 'fas fa-temperature-high'
        });
        conditions.safe = false;
    } else if (data.temp < 5 || data.temp > 35) {
        conditions.warnings.push(`Temperatura en límites (${data.temp}°C)`);
        conditions.details.push({
            type: 'warning',
            title: 'Temperatura extrema',
            message: `La temperatura de ${data.temp}°C está cerca de los límites de operación. Monitorea la temperatura de la batería.`,
            icon: 'fas fa-thermometer-half'
        });
    }

    // VIENTO
    if (data.wind > config.limits.wind) {
        conditions.dangers.push(`Viento fuerte (${data.wind} km/h)`);
        conditions.details.push({
            type: 'danger',
            title: 'Viento excesivo',
            message: `Viento de ${data.wind} km/h excede el límite del DJI Mini 2 (${config.limits.wind} km/h). El dron puede perder estabilidad y tener dificultades para regresar.`,
            icon: 'fas fa-wind'
        });
        conditions.safe = false;
    } else if (data.wind > config.limits.wind * 0.7) {
        conditions.warnings.push(`Viento moderado (${data.wind} km/h)`);
        conditions.details.push({
            type: 'warning',
            title: 'Viento moderado',
            message: `Viento de ${data.wind} km/h. Vuela con precaución, mantén el dron a la vista y considera reducir la distancia máxima.`,
            icon: 'fas fa-wind'
        });
    }

    // RÁFAGAS
    if (data.gusts > config.limits.gusts) {
        conditions.dangers.push(`Ráfagas fuertes (${data.gusts} km/h)`);
        conditions.details.push({
            type: 'danger',
            title: 'Ráfagas peligrosas',
            message: `Ráfagas de hasta ${data.gusts} km/h. Son impredecibles y pueden voltear el dron o causar pérdida de control.`,
            icon: 'fas fa-tachometer-alt'
        });
        conditions.safe = false;
    } else if (data.gusts > config.limits.gusts * 0.7) {
        conditions.warnings.push(`Ráfagas moderadas (${data.gusts} km/h)`);
        conditions.details.push({
            type: 'warning',
            title: 'Ráfagas presentes',
            message: `Ráfagas de ${data.gusts} km/h detectadas. Mantén una altura segura y evita vuelos sobre obstáculos.`,
            icon: 'fas fa-tachometer-alt'
        });
    }

    // LLUVIA
    if (data.rain > config.limits.rain) {
        conditions.dangers.push(`Probabilidad de lluvia alta (${data.rain}%)`);
        conditions.details.push({
            type: 'danger',
            title: 'Riesgo de lluvia',
            message: `Probabilidad de lluvia del ${data.rain}%. El DJI Mini 2 NO es resistente al agua. La lluvia puede dañar los motores y componentes electrónicos permanentemente.`,
            icon: 'fas fa-tint'
        });
        conditions.safe = false;
    } else if (data.rain > 0) {
        conditions.warnings.push(`Posibilidad de lluvia (${data.rain}%)`);
        conditions.details.push({
            type: 'warning',
            title: 'Posible lluvia',
            message: `${data.rain}% de probabilidad de lluvia. Prepárate para aterrizar rápidamente si comienza a llover.`,
            icon: 'fas fa-cloud-rain'
        });
    }

    // NUBES
    if (data.clouds > config.limits.clouds) {
        conditions.warnings.push(`Mucha nubosidad (${data.clouds}%)`);
        conditions.details.push({
            type: 'warning',
            title: 'Nubosidad alta',
            message: `Cobertura de nubes del ${data.clouds}%. Puede afectar la señal GPS y la estabilidad del vuelo. Mantén el dron a la vista.`,
            icon: 'fas fa-cloud'
        });
    }

    // VISIBILIDAD
    if (data.visibility < config.limits.visibility) {
        conditions.dangers.push(`Visibilidad reducida (${data.visibility} km)`);
        conditions.details.push({
            type: 'danger',
            title: 'Visibilidad limitada',
            message: `Visibilidad de ${data.visibility} km. Dificulta mantener el dron a la vista y aumenta el riesgo de colisiones. Vuelo no recomendado.`,
            icon: 'fas fa-eye'
        });
        conditions.safe = false;
    } else if (data.visibility < 5) {
        conditions.warnings.push(`Visibilidad moderada (${data.visibility} km)`);
        conditions.details.push({
            type: 'warning',
            title: 'Visibilidad reducida',
            message: `Visibilidad de ${data.visibility} km. Mantén el dron cerca y usa luces si vuelas al atardecer.`,
            icon: 'fas fa-eye'
        });
    }

    // ÍNDICE Kp (ACTIVIDAD GEOMAGNÉTICA)
    if (state.kpIndex > 6) {
        conditions.dangers.push(`Alta actividad geomagnética (Kp=${state.kpIndex.toFixed(1)})`);
        conditions.details.push({
            type: 'danger',
            title: 'Tormenta geomagnética',
            message: `Índice Kp de ${state.kpIndex.toFixed(1)} (${state.kpStatus}). Puede causar interferencias en GPS, pérdida de señal y lecturas erróneas de la brújula. NO VUELES.`,
            icon: 'fas fa-satellite'
        });
        conditions.safe = false;
    } else if (state.kpIndex > 4) {
        conditions.warnings.push(`Actividad geomagnética moderada (Kp=${state.kpIndex.toFixed(1)})`);
        conditions.details.push({
            type: 'warning',
            title: 'Alteraciones magnéticas',
            message: `Índice Kp de ${state.kpIndex.toFixed(1)}. Puede haber interferencias en GPS. Calibrar la brújula antes de volar y verificar la señal GPS constantemente.`,
            icon: 'fas fa-compass'
        });
    } else if (state.kpIndex > 2) {
        conditions.details.push({
            type: 'safe',
            title: 'Actividad geomagnética baja',
            message: `Índice Kp de ${state.kpIndex.toFixed(1)}. Condiciones normales para GPS y brújula.`,
            icon: 'fas fa-satellite'
        });
    }

    return conditions;
}

// Función para mostrar el modal de detalles
function showDetailsModal() {
    if (!state.conditions || !elements.modalContent || !elements.detailsModal) return;
    
    let html = '';
    
    if (state.conditions.dangers.length > 0) {
        html += `
            <div class="alert-danger">
                <h4><i class="fas fa-exclamation-circle"></i> CONDICIONES PELIGROSAS</h4>
                <p>No vueles tu DJI Mini 2 por las siguientes razones:</p>
                <ul class="condition-list">
                    ${state.conditions.details
                        .filter(d => d.type === 'danger')
                        .map(d => `
                            <li class="danger">
                                <i class="${d.icon}"></i>
                                <div>
                                    <strong>${d.title}</strong>
                                    <p>${d.message}</p>
                                </div>
                            </li>
                        `).join('')}
                </ul>
            </div>
        `;
    }
    
    if (state.conditions.warnings.length > 0) {
        html += `
            <div class="alert-warning">
                <h4><i class="fas fa-exclamation-triangle"></i> PRECAUCIONES</h4>
                <p>Vuela con cuidado considerando:</p>
                <ul class="condition-list">
                    ${state.conditions.details
                        .filter(d => d.type === 'warning')
                        .map(d => `
                            <li class="warning">
                                <i class="${d.icon}"></i>
                                <div>
                                    <strong>${d.title}</strong>
                                    <p>${d.message}</p>
                                </div>
                            </li>
                        `).join('')}
                </ul>
            </div>
        `;
    }
    
    if (state.conditions.safe && state.conditions.details.some(d => d.type === 'safe')) {
        html += `
            <div class="alert-safe">
                <h4><i class="fas fa-check-circle"></i> CONDICIONES FAVORABLES</h4>
                <ul class="condition-list">
                    ${state.conditions.details
                        .filter(d => d.type === 'safe')
                        .map(d => `
                            <li class="safe">
                                <i class="${d.icon}"></i>
                                <div>
                                    <strong>${d.title}</strong>
                                    <p>${d.message}</p>
                                </div>
                            </li>
                        `).join('')}
                </ul>
            </div>
        `;
    }
    
    // Información adicional sobre Kp
    html += `
        <div class="kp-info-modal">
            <h4><i class="fas fa-info-circle"></i> Sobre el Índice Kp</h4>
            <p>El índice Kp mide la actividad geomagnética (0-9). Valores altos pueden afectar:</p>
            <ul>
                <li><i class="fas fa-satellite"></i> <strong>GPS:</strong> Precisión reducida</li>
                <li><i class="fas fa-compass"></i> <strong>Brújula:</strong> Calibración necesaria</li>
                <li><i class="fas fa-wifi"></i> <strong>Señal:</strong> Posibles interferencias</li>
            </ul>
            <p class="small-text">Datos del NOAA - Actualizado cada 3 horas</p>
        </div>
    `;
    
    elements.modalContent.innerHTML = html;
    elements.detailsModal.style.display = 'flex';
}

function updateStatusBanner(conditions) {
    if (!elements.statusBanner || !elements.statusTitle || !elements.statusDesc) return;
    
    const banner = elements.statusBanner;
    const title = elements.statusTitle;
    const desc = elements.statusDesc;

    // Mostrar/ocultar botón de detalles
    if (elements.detailsBtn) {
        if (!conditions.safe || conditions.warnings.length > 0) {
            elements.detailsBtn.style.display = 'flex';
        } else {
            elements.detailsBtn.style.display = 'none';
        }
    }

    if (!conditions.safe || conditions.dangers.length > 0) {
        // PELIGRO
        banner.className = 'status-banner danger';
        title.textContent = 'NO VOLAR';
        desc.textContent = 'Condiciones peligrosas para el dron';
    } else if (conditions.warnings.length > 0) {
        // PRECAUCIÓN
        banner.className = 'status-banner caution';
        title.textContent = 'VOLAR CON PRECAUCIÓN';
        desc.textContent = 'Algunas condiciones no son óptimas';
    } else {
        // SEGURO
        banner.className = 'status-banner safe';
        title.textContent = 'CONDICIONES ÓPTIMAS';
        desc.textContent = 'Ideal para volar tu DJI Mini 2';
    }
}

function updateRecommendations(conditions) {
    if (!elements.recommendationsList) return;
    
    let html = '';

    // Agregar advertencias de peligro
    conditions.dangers.forEach(danger => {
        html += `<p class="recommendation negative"><i class="fas fa-times-circle"></i> ${danger}</p>`;
    });

    // Agregar advertencias
    conditions.warnings.forEach(warning => {
        html += `<p class="recommendation warning"><i class="fas fa-exclamation-triangle"></i> ${warning}</p>`;
    });

    // Si todo está bien, mostrar mensajes positivos
    if (conditions.safe && conditions.warnings.length === 0 && conditions.dangers.length === 0) {
        html = `
            <p class="recommendation positive"><i class="fas fa-check"></i> Condiciones óptimas para vuelo</p>
            <p class="recommendation positive"><i class="fas fa-check"></i> Viento dentro de límites seguros</p>
            <p class="recommendation positive"><i class="fas fa-check"></i> Buena visibilidad</p>
            <p class="recommendation positive"><i class="fas fa-check"></i> Temperatura adecuada</p>
        `;
    } else if (conditions.safe) {
        html += `<p class="recommendation positive"><i class="fas fa-check"></i> Vuelo posible con precauciones</p>`;
    }

    elements.recommendationsList.innerHTML = html;
}

// Función actualizada para mostrar el índice Kp
function updateKpDisplay() {
    // Buscar o crear el elemento Kp en el grid
    let kpElement = document.querySelector('.grid-item.kp-item');
    
    if (!kpElement) {
        // Crear nuevo elemento si no existe
        const weatherGrid = document.querySelector('.weather-grid');
        if (!weatherGrid) return;
        
        kpElement = document.createElement('div');
        kpElement.className = 'grid-item kp-item';
        kpElement.innerHTML = `
            <div class="grid-icon">
                <i class="fas fa-satellite"></i>
            </div>
            <div class="grid-content">
                <h3>Actividad Geomagnética (Kp) 
                    <span class="tooltip">
                        <i class="fas fa-question-circle"></i>
                        <span class="tooltip-text">Mide interferencias en GPS y brújula. Valores altos (>4) pueden afectar el vuelo del dron.</span>
                    </span>
                </h3>
                <div class="kp-indicator">
                    <div class="kp-value">${state.kpIndex.toFixed(1)}</div>
                    <div class="kp-scale">
                        <div class="kp-marker" style="left: ${(state.kpIndex / 9) * 100}%"></div>
                    </div>
                </div>
                <div class="kp-info">
                    Estado: <strong>${state.kpStatus.toUpperCase()}</strong>
                    ${state.kpIndex > config.limits.kpIndex ? 
                        '<span style="color:#f44336"> (Alto riesgo)</span>' : 
                        state.kpIndex > 3 ? 
                        '<span style="color:#FF9800"> (Precaución)</span>' : 
                        '<span style="color:#4CAF50"> (Normal)</span>'}
                </div>
            </div>
        `;
        weatherGrid.appendChild(kpElement);
    } else {
        // Actualizar elemento existente
        const kpValue = kpElement.querySelector('.kp-value');
        const kpMarker = kpElement.querySelector('.kp-marker');
        const statusElem = kpElement.querySelector('.kp-info strong');
        const statusText = kpElement.querySelector('.kp-info');
        
        if (kpValue) kpValue.textContent = state.kpIndex.toFixed(1);
        if (kpMarker) kpMarker.style.left = `${(state.kpIndex / 9) * 100}%`;
        if (statusElem) statusElem.textContent = state.kpStatus.toUpperCase();
        
        // Actualizar color del estado
        if (statusText) {
            if (state.kpIndex > config.limits.kpIndex) {
                statusText.innerHTML = `Estado: <strong>${state.kpStatus.toUpperCase()}</strong><span style="color:#f44336"> (Alto riesgo)</span>`;
            } else if (state.kpIndex > 3) {
                statusText.innerHTML = `Estado: <strong>${state.kpStatus.toUpperCase()}</strong><span style="color:#FF9800"> (Precaución)</span>`;
            } else {
                statusText.innerHTML = `Estado: <strong>${state.kpStatus.toUpperCase()}</strong><span style="color:#4CAF50"> (Normal)</span>`;
            }
        }
    }
}

// Actualizar updateWeatherDisplay para incluir Kp
function updateWeatherDisplay() {
    const hourData = getCurrentHourData();
    
    // Evaluar condiciones
    state.conditions = evaluateConditions(hourData);
    
    // Actualizar valores de la UI
    if (elements.tempValue) elements.tempValue.textContent = `${hourData.temp}°C`;
    if (elements.windValue) elements.windValue.textContent = `${hourData.wind} km/h`;
    if (elements.gustValue) elements.gustValue.textContent = `${hourData.gusts} km/h`;
    if (elements.cloudValue) elements.cloudValue.textContent = `${hourData.clouds}%`;
    if (elements.rainValue) elements.rainValue.textContent = `${hourData.rain}%`;
    if (elements.visValue) elements.visValue.textContent = `${hourData.visibility} km`;

    // Actualizar estado y Kp
    updateStatusBanner(state.conditions);
    updateKpDisplay();
    updateRecommendations(state.conditions);
    updateHourDisplay();
}

// Actualizar loadWeatherData para cargar también Kp
async function loadWeatherData() {
    try {
        showLoading();
        
        const url = new URL(config.apiUrl);
        url.searchParams.append('latitude', state.location.lat);
        url.searchParams.append('longitude', state.location.lon);
        url.searchParams.append('hourly', 'temperature_2m,windspeed_10m,windgusts_10m,cloudcover,precipitation_probability,visibility');
        url.searchParams.append('timezone', 'auto');
        url.searchParams.append('forecast_days', 2);

        console.log('Cargando datos de:', url.toString());
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        state.weatherData = await response.json();
        console.log('Datos cargados correctamente');
        
    } catch (error) {
        console.error('Error cargando datos:', error);
        // Mostrar datos por defecto
        state.weatherData = {
            hourly: {
                temperature_2m: [22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0, -1],
                windspeed_10m: Array(24).fill(12),
                windgusts_10m: Array(24).fill(15),
                cloudcover: Array(24).fill(30),
                precipitation_probability: Array(24).fill(5),
                visibility: Array(24).fill(10000)
            }
        };
        
        alert('Error al cargar datos en tiempo real. Mostrando datos de ejemplo.');
    } finally {
        hideLoading();
    }
}

// Agregar estilos adicionales al modal si no existen
function injectAdditionalStyles() {
    if (document.querySelector('#additional-styles')) return;
    
    const additionalStyles = `
        .alert-danger, .alert-warning, .alert-safe {
            padding: 15px;
            border-radius: 10px;
            margin-bottom: 20px;
        }
        
        .alert-danger {
            background: rgba(244, 67, 54, 0.1);
            border: 1px solid rgba(244, 67, 54, 0.3);
        }
        
        .alert-warning {
            background: rgba(255, 152, 0, 0.1);
            border: 1px solid rgba(255, 152, 0, 0.3);
        }
        
        .alert-safe {
            background: rgba(76, 175, 80, 0.1);
            border: 1px solid rgba(76, 175, 80, 0.3);
        }
        
        .kp-info-modal {
            background: rgba(0, 180, 216, 0.1);
            padding: 15px;
            border-radius: 10px;
            margin-top: 20px;
        }
        
        .kp-info-modal ul {
            margin: 10px 0;
            padding-left: 20px;
        }
        
        .kp-info-modal li {
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .small-text {
            font-size: 0.8rem;
            opacity: 0.7;
            margin-top: 10px;
        }
        
        .modal-body h4 {
            color: #90e0ef;
            margin: 15px 0 10px 0;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .modal-body h4:first-child {
            margin-top: 0;
        }
        
        .condition-list {
            list-style: none;
            margin: 15px 0;
            padding: 0;
        }
        
        .condition-list li {
            padding: 10px;
            margin-bottom: 8px;
            border-radius: 8px;
            display: flex;
            align-items: flex-start;
            gap: 10px;
        }
        
        .condition-list li.danger {
            background: rgba(244, 67, 54, 0.2);
            border-left: 4px solid #f44336;
        }
        
        .condition-list li.warning {
            background: rgba(255, 152, 0, 0.2);
            border-left: 4px solid #FF9800;
        }
        
        .condition-list li.safe {
            background: rgba(76, 175, 80, 0.2);
            border-left: 4px solid #4CAF50;
        }
        
        .condition-list li i {
            margin-top: 3px;
        }
        
        .condition-list li div {
            flex: 1;
        }
        
        .condition-list li p {
            margin: 5px 0 0 0;
            opacity: 0.9;
            font-size: 0.9rem;
        }
    `;
    
    const styleSheet = document.createElement("style");
    styleSheet.id = "additional-styles";
    styleSheet.textContent = additionalStyles;
    document.head.appendChild(styleSheet);
}

// Inyectar estilos al cargar
document.addEventListener('DOMContentLoaded', injectAdditionalStyles);