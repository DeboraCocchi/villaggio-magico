/**
 * @file SeasonalDaylight.js
 * Calcola alba/tramonto dinamici basati sulla stagione italiana (Roma ~41°N).
 * Usa formule astronomiche semplificate per determinare le ore di luce per il giorno dell'anno.
 */

/**
 * Determina il giorno dell'anno (1–365) da una data JavaScript.
 * @param {Date} date
 * @returns {number} 1–365
 */
function getDayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start;
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

/**
 * Mappa il giorno dell'anno (1–365) a una stagione italiana.
 * Solstizi/equinozi approssimativi:
 * - 80 (21 Mar): Equinozio primavera
 * - 172 (21 Jun): Solstizio estate
 * - 265 (22 Set): Equinozio autunno
 * - 355 (21 Dic): Solstizio inverno
 * @param {number} dayOfYear
 * @returns {'primavera'|'estate'|'autunno'|'inverno'}
 */
function getSeason(dayOfYear) {
  if (dayOfYear >= 80 && dayOfYear < 172) return 'primavera';
  if (dayOfYear >= 172 && dayOfYear < 265) return 'estate';
  if (dayOfYear >= 265 && dayOfYear < 355) return 'autunno';
  return 'inverno'; // 0–80 e 355–365
}

/**
 * Calcola alba/tramonto (in ore decimali 0–24) per Roma (41.9°N) usando formula semplificata.
 * Basata su NOAA Solar Calculations Spreadsheet (pubblico).
 * @param {number} dayOfYear 1–365
 * @returns {{sunrise: number, sunset: number}} Ore decimali (es. 6.5 = 6:30)
 */
function getSolarTimes(dayOfYear) {
  const latitude = 41.9;    // Roma, gradi Nord
  const longitude = 12.5;   // Roma, gradi Est
  const timezone = 1;       // UTC+1 (CET, o UTC+2 in CEST ma calcoliamo UTC+1 di base)

  const latRad = (latitude * Math.PI) / 180;

  // Calcola la declinazione solare (formula semplificata)
  // Gamma in radianti: 0 al solstizio invernale, π/2 all'equinozio di primavera, etc.
  const gamma = (2 * Math.PI * (dayOfYear - 1)) / 365;

  // Declinazione solare (radianti)
  const delta =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.00289 * Math.cos(3 * gamma) +
    0.00029 * Math.sin(3 * gamma);

  // Equazione del tempo (minuti)
  const eot =
    229.18 *
    (0.017 +
      0.4281 * Math.cos(gamma) -
      7.3515 * Math.sin(gamma) -
      3.3495 * Math.sin(2 * gamma) -
      0.1397 * Math.cos(3 * gamma));

  // Angolo solare al sorgere/tramonto (ora solare vera quando sole è all'orizzonte)
  // cosH = -tan(lat) * tan(delta)
  const cosH = -Math.tan(latRad) * Math.tan(delta);

  // Clamp in [-1, 1] per evitare NaN
  const cosHClamped = Math.max(-1, Math.min(1, cosH));

  // Se cosH > 1: sole sempre sotto (notte polare); se cosH < -1: sole sempre sopra (giorno polare)
  if (cosHClamped >= 1) {
    return { sunrise: 12, sunset: 12 }; // Notte polare (non accade a Roma)
  }
  if (cosHClamped <= -1) {
    return { sunrise: 0, sunset: 24 }; // Giorno polare (non accade a Roma)
  }

  // Angolo orario in radianti
  const H = Math.acos(cosHClamped);

  // Convertire da radianti a frazioni di 24h
  // π radianti = 12 ore, quindi H radianti = H * (12/π) ore
  const hourAngle = (H * 12) / Math.PI;

  // Tempo solare apparente al sorgere/tramonto (ore frazionarie)
  // 12 è il mezzogiorno solare
  const sunrise_hours = 12 - hourAngle - (eot / 60) / 15 - longitude / 15;
  const sunset_hours = 12 + hourAngle - (eot / 60) / 15 - longitude / 15;

  // Correggi il fuso orario
  const sunrise = sunrise_hours + timezone;
  const sunset = sunset_hours + timezone;

  // Normalizza a [0, 24]
  const sr = ((sunrise % 24) + 24) % 24;
  const ss = ((sunset % 24) + 24) % 24;

  return {
    sunrise: sr,
    sunset: ss,
  };
}

export const SeasonalDaylight = {
  /**
   * Restituisce la stagione corrente basata sulla data odierna.
   * @param {Date} [date] - Se non passato, usa la data corrente.
   * @returns {'primavera'|'estate'|'autunno'|'inverno'}
   */
  getCurrentSeason(date = new Date()) {
    const dayOfYear = getDayOfYear(date);
    return getSeason(dayOfYear);
  },

  /**
   * Restituisce alba e tramonto (in ore decimali) per Roma oggi.
   * @param {Date} [date] - Se non passato, usa la data corrente.
   * @returns {{sunrise: number, sunset: number}}
   */
  getTodaySolarTimes(date = new Date()) {
    const dayOfYear = getDayOfYear(date);
    return getSolarTimes(dayOfYear);
  },

  /**
   * Restituisce alba e tramonto per un giorno specifico dell'anno.
   * @param {number} dayOfYear 1–365
   * @returns {{sunrise: number, sunset: number}}
   */
  getSolarTimesForDay(dayOfYear) {
    return getSolarTimes(dayOfYear);
  },

  /**
   * Restituisce la stagione per un giorno specifico dell'anno.
   * @param {number} dayOfYear 1–365
   * @returns {'primavera'|'estate'|'autunno'|'inverno'}
   */
  getSeasonForDay(dayOfYear) {
    return getSeason(dayOfYear);
  },
};
