const OW_API_BASE_URL = "https://api.openweathermap.org/data/2.5";
const OW_API_KEY = OW_CONFIG.API_KEY;
const owBody = document.querySelector(".ow-body");
const owSearchForm = document.getElementById("ow-search-form");
const owCityInput = document.getElementById("ow-city-input");
const owUnitSelect = document.getElementById("ow-unit-select");
const owSearchButton = document.getElementById("ow-search-button");
const owThemeToggle = document.getElementById("ow-theme-toggle");
const owLoadingIndicator = document.getElementById("ow-loading-indicator");
const owErrorContainer = document.getElementById("ow-error-container");
const owCurrentLocationLabel = document.getElementById("ow-current-location-label");
const owCurrentBody = document.getElementById("ow-current-body");
let owLastSearch = {
    city: "",
    units: "metric"
};

let owTheme = "dark";
function owNormalizeInput(value) {
    if (typeof value !== "string") {
        return "";
    }
    return value
        .trim()
        .replace(/\s+/g, " ");
}

function owValidateCity(city) {
    const trimmed = owNormalizeInput(city);

    if (!trimmed) {
        return {
            valid: false,
            message: "Please enter a city name."
        };
    }

    const pattern = /^[a-zA-Z\s,.\-]+$/;
    if (!pattern.test(trimmed)) {
        return {
            valid: false,
            message: "City name contains invalid characters."
        };
    }

    if (trimmed.length < 2) {
        return {
            valid: false,
            message: "City name is too short."
        };
    }

    return {
        valid: true,
        message: ""
    };
}

function owGetUnitSymbol(units) {
    return units === "imperial" ? "°F" : "°C";
}

function owFormatTemp(value) {
    if (typeof value !== "number" || Number.isNaN(value)) {
        return "--";
    }
    return value.toFixed(1);
}

function owBuildUrl(endpoint, params) {
    const cleanEndpoint = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;
    const url = new URL(cleanEndpoint, `${OW_API_BASE_URL}/`);
    const query = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
            query.append(key, String(value));
        }
    });

    
    query.append("appid", OW_API_KEY);

    url.search = query.toString();
    return url.toString();
}

function owFormatForecastDate(dtTxt) {
    const date = new Date(dtTxt);
    const weekday = date.toLocaleDateString(undefined, { weekday: "short" });
    const options = { month: "short", day: "numeric" };
    const dayLabel = date.toLocaleDateString(undefined, options);

    return {
        dayLabel,
        weekday
    };
}

function owGetIconUrl(iconCode) {
    if (!iconCode) {
        return "";
    }
    return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
}

function owFirstOrNull(arr) {
    if (!Array.isArray(arr) || arr.length === 0) {
        return null;
    }
    return arr[0];
}

function owSetLoading(isLoading) {
    if (!owLoadingIndicator || !owSearchButton) {
        return;
    }

    if (isLoading) {
        owLoadingIndicator.classList.add("ow-loading-visible");
        owLoadingIndicator.setAttribute("aria-hidden", "false");

        owSearchButton.classList.add("ow-button-loading", "ow-button-disabled");
        owSearchButton.disabled = true;
        owSearchButton.setAttribute("aria-busy", "true");
    } else {
        owLoadingIndicator.classList.remove("ow-loading-visible");
        owLoadingIndicator.setAttribute("aria-hidden", "true");

        owSearchButton.classList.remove("ow-button-loading", "ow-button-disabled");
        owSearchButton.disabled = false;
        owSearchButton.setAttribute("aria-busy", "false");
    }
}

function owClearError() {
    if (!owErrorContainer) {
        return;
    }
    owErrorContainer.textContent = "";
}

function owShowError(message) {
    if (!owErrorContainer) {
        return;
    }

    const safeMessage = message || "Something went wrong. Please try again.";

    owErrorContainer.innerHTML = `
        <div class="ow-error-message">
            <i class="bi bi-exclamation-circle ow-error-icon" aria-hidden="true"></i>
            <span>${safeMessage}</span>
        </div>
    `;
}

function owClearResults() {
    if (owCurrentBody) {
        owCurrentBody.innerHTML = "";
    }
}

function owRenderCurrentWeather(data, units) {
    if (!owCurrentBody || !owCurrentLocationLabel) {
        return;
    }

    if (!data || typeof data !== "object") {
        owCurrentBody.innerHTML = "";
        owCurrentLocationLabel.textContent = "No current weather data available.";
        return;
    }

    const weatherInfo = owFirstOrNull(data.weather) || {};
    const mainInfo = data.main || {};
    const windInfo = data.wind || {};
    const sysInfo = data.sys || {};

    const cityName = data.name || "Unknown location";
    const country = sysInfo.country || "";
    const description = weatherInfo.description || "";
    const mainCondition = weatherInfo.main || "";
    const iconCode = weatherInfo.icon || "";

    const temp = owFormatTemp(mainInfo.temp);
    const feelsLike = owFormatTemp(mainInfo.feels_like);
    const humidity = mainInfo.humidity;
    const windSpeed = windInfo.speed;

    const unitSymbol = owGetUnitSymbol(units);
    const speedUnit = units === "imperial" ? "mph" : "m/s";

    owCurrentLocationLabel.textContent = `${cityName}${country ? ", " + country : ""}`;

    const iconUrl = owGetIconUrl(iconCode);

    owCurrentBody.innerHTML = `
        <div class="ow-current-main">
            <div class="ow-current-location">${cityName}${country ? ", " + country : ""}</div>
            <div class="ow-current-meta">
                Now • Updated in real-time from OpenWeather
            </div>

            <div class="ow-current-temperature-row">
                <div class="ow-current-temp-value">
                    ${temp}<span class="ow-current-temp-unit">${unitSymbol}</span>
                </div>
                <div class="ow-current-feels">
                    Feels like <strong>${feelsLike}${unitSymbol}</strong>
                </div>
            </div>

            <div class="ow-current-description">
                <span class="ow-condition-pill">${mainCondition || "N/A"}</span>
                <span>${description || ""}</span>
            </div>

            <div class="ow-current-extra">
                <div class="ow-current-extra-item">
                    <span class="ow-current-extra-label">Humidity</span>
                    <span class="ow-current-extra-value">${typeof humidity === "number" ? humidity + "%" : "--"}</span>
                </div>
                <div class="ow-current-extra-item">
                    <span class="ow-current-extra-label">Wind</span>
                    <span class="ow-current-extra-value">
                        ${typeof windSpeed === "number" ? windSpeed.toFixed(1) + " " + speedUnit : "--"}
                    </span>
                </div>
                <div class="ow-current-extra-item">
                    <span class="ow-current-extra-label">Weather</span>
                    <span class="ow-current-extra-value">${mainCondition || "N/A"}</span>
                </div>
                <div class="ow-current-extra-item">
                    <span class="ow-current-extra-label">Source</span>
                    <span class="ow-current-extra-value">OpenWeather API</span>
                </div>
            </div>
        </div>

        <div class="ow-current-icon-group">
            <div class="ow-current-icon-wrapper">
                ${
                    iconUrl
                        ? `<img src="${iconUrl}" alt="${description || mainCondition || "Weather icon"}" class="ow-current-icon">`
                        : `<i class="bi bi-cloud-sun-fill ow-current-icon" aria-hidden="true"></i>`
                }
            </div>
            <div class="ow-current-summary">
                <span>
                    <i class="bi bi-thermometer-half" aria-hidden="true"></i>
                    Real-time city weather
                </span>
                <span>
                    <i class="bi bi-graph-up" aria-hidden="true"></i>
                    Includes temperature, humidity, and wind
                </span>
            </div>
        </div>
    `;
}

async function owFetchCurrentWeather(city, units) {
    const url = owBuildUrl("/weather", {
        q: city,
        units: units
    });

    const response = await fetch(url);

    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const message =
            (errorData && errorData.message) ||
            `Failed to fetch current weather (status ${response.status}).`;
        throw new Error(message);
    }

    return response.json();
}

async function owSearchWeather(rawCityInput, units) {
    const normalizedCity = owNormalizeInput(rawCityInput);
    const validation = owValidateCity(normalizedCity);

    owClearError();

    if (!validation.valid) {
        owShowError(validation.message);
        owClearResults();
        owCurrentLocationLabel.textContent = "Invalid input. Please correct and try again.";
        return;
    }

    owSetLoading(true);
    owClearResults();

    try {
        const currentWeather = await owFetchCurrentWeather(normalizedCity, units);

        if (!currentWeather) {
            owShowError("No results found for this city.");
            owCurrentLocationLabel.textContent = "No results found.";
            return;
        }

        owLastSearch = {
            city: normalizedCity,
            units: units
        };

        owRenderCurrentWeather(currentWeather, units);
    } catch (error) {
        const message =
            error && typeof error.message === "string"
                ? error.message
                : "Failed to load weather data. Please try again.";

        if (message.toLowerCase().includes("city not found")) {
            owShowError("No results found. Please check the city name.");
            owCurrentLocationLabel.textContent = "City not found.";
        } else {
            owShowError(message);
            owCurrentLocationLabel.textContent = "Unable to retrieve weather data.";
        }

        owClearResults();
    } finally {
        owSetLoading(false);
    }
}

function owApplyTheme(theme) {
    if (!owBody || !owThemeToggle) {
        return;
    }

    owTheme = theme;

    owBody.classList.remove("ow-theme-light", "ow-theme-dark");
    owBody.classList.add(theme === "light" ? "ow-theme-light" : "ow-theme-dark");

    const iconElement = owThemeToggle.querySelector(".ow-theme-icon");
    const textElement = owThemeToggle.querySelector(".ow-theme-text");

    if (iconElement && textElement) {
        if (theme === "light") {
            iconElement.className = "bi bi-brightness-high ow-theme-icon";
            textElement.textContent = "Light";
        } else {
            iconElement.className = "bi bi-moon-stars ow-theme-icon";
            textElement.textContent = "Dark";
        }
    }

    try {
        window.localStorage.setItem("ow-theme", theme);
    } catch (e) {
    }
}

function owInitTheme() {
    let theme = "dark";

    try {
        const stored = window.localStorage.getItem("ow-theme");
        if (stored === "light" || stored === "dark") {
            theme = stored;
        } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) {
            theme = "light";
        }
    } catch (e) {
    }

    owApplyTheme(theme);
}

function owHandleSearchSubmit(event) {
    event.preventDefault();

    if (!owCityInput || !owUnitSelect) {
        return;
    }

    const cityValue = owCityInput.value;
    const units = owUnitSelect.value === "imperial" ? "imperial" : "metric";

    owSearchWeather(cityValue, units);
}

function owHandleUnitsChange() {
    const units = owUnitSelect.value === "imperial" ? "imperial" : "metric";

    if (owLastSearch.city) {
        owSearchWeather(owLastSearch.city, units);
    }
}

function owHandleThemeToggle() {
    const nextTheme = owTheme === "dark" ? "light" : "dark";
    owApplyTheme(nextTheme);
}

function owHandleCityInputKeydown(event) {
    if (event.key === "Enter") {
        const normalized = owNormalizeInput(owCityInput.value);
        owCityInput.value = normalized;
    }
}

function owInitApp() {
    owInitTheme();

    if (owSearchForm) {
        owSearchForm.addEventListener("submit", owHandleSearchSubmit);
    }

    if (owUnitSelect) {
        owUnitSelect.addEventListener("change", owHandleUnitsChange);
    }

    if (owThemeToggle) {
        owThemeToggle.addEventListener("click", owHandleThemeToggle);
    }

    if (owCityInput) {
        owCityInput.addEventListener("keydown", owHandleCityInputKeydown);
    }

    owSetLoading(false);
    owClearError();
}

document.addEventListener("DOMContentLoaded", owInitApp);


