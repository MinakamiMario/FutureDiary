// utils/formatters.js
// Hulpfuncties voor het formatteren van data in de app

// Formatteer een datum naar YYYY-MM-DD formaat
export const formatDateToYYYYMMDD = date => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    '0',
  )}-${String(d.getDate()).padStart(2, '0')}`;
};

// Krijg de huidige datum in YYYY-MM-DD formaat
export const getCurrentDateYYYYMMDD = () => {
  return formatDateToYYYYMMDD(new Date());
};

// Formatteer een datum naar een leesbaar formaat (bijv. "Maandag 1 januari 2023")
export const formatDateToReadable = date => {
  const d = new Date(date);
  return d.toLocaleDateString('nl-NL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

// Formatteer een datum naar tijd (bijv. "14:30")
export const formatTimeFromDate = date => {
  const d = new Date(date);
  return d.toLocaleTimeString('nl-NL', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Formatteer een afstand in meters naar een leesbaar formaat
export const formatDistance = meters => {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  } else {
    return `${(meters / 1000).toFixed(1)} km`;
  }
};

// Formatteer een tijdsduur in minuten naar een leesbaar formaat
export const formatDuration = minutes => {
  if (minutes < 60) {
    return `${Math.round(minutes)} minuten`;
  } else {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);

    if (remainingMinutes === 0) {
      return hours === 1 ? '1 uur' : `${hours} uur`;
    } else {
      return `${hours} uur en ${remainingMinutes} minuten`;
    }
  }
};

// Formatteer een tijdsduur in uren naar een leesbaar formaat (voor slaap, etc.)
export const formatHours = hours => {
  if (hours < 1) {
    const minutes = Math.round(hours * 60);
    return `${minutes} minuten`;
  } else {
    const wholeHours = Math.floor(hours);
    const remainingMinutes = Math.round((hours % 1) * 60);

    if (remainingMinutes === 0) {
      return wholeHours === 1 ? '1 uur' : `${wholeHours} uur`;
    } else {
      return `${wholeHours} uur ${remainingMinutes} minuten`;
    }
  }
};

// Formatteer een tijdsduur in seconden naar een leesbaar formaat (voor gespreksduur)
export const formatCallDuration = seconds => {
  if (seconds < 60) {
    return `${seconds} seconden`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (remainingSeconds === 0) {
      return `${minutes} minuten`;
    } else {
      return `${minutes} min ${remainingSeconds} sec`;
    }
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (minutes === 0) {
      return `${hours} uur`;
    } else {
      return `${hours} uur ${minutes} min`;
    }
  }
};

// Verkrijg startdatum en einddatum voor een specifieke periode
export const getDateRangeForPeriod = (period, referenceDate = new Date()) => {
  const refDate = new Date(referenceDate);
  let startDate, endDate;

  switch (period) {
    case 'day':
      startDate = new Date(refDate);
      startDate.setHours(0, 0, 0, 0);

      endDate = new Date(refDate);
      endDate.setHours(23, 59, 59, 999);
      break;

    case 'week':
      // Vind de eerste dag van de week (maandag)
      const day = refDate.getDay();
      const diff = refDate.getDate() - day + (day === 0 ? -6 : 1); // Aanpassing voor zondag

      startDate = new Date(refDate);
      startDate.setDate(diff);
      startDate.setHours(0, 0, 0, 0);

      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
      break;

    case 'month':
      startDate = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
      startDate.setHours(0, 0, 0, 0);

      endDate = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0);
      endDate.setHours(23, 59, 59, 999);
      break;

    case 'year':
      startDate = new Date(refDate.getFullYear(), 0, 1);
      startDate.setHours(0, 0, 0, 0);

      endDate = new Date(refDate.getFullYear(), 11, 31);
      endDate.setHours(23, 59, 59, 999);
      break;

    default:
      startDate = new Date(refDate);
      startDate.setHours(0, 0, 0, 0);

      endDate = new Date(refDate);
      endDate.setHours(23, 59, 59, 999);
  }

  return {startDate, endDate};
};

// Hulpfunctie om te bepalen of een datum vandaag is
export const isToday = date => {
  const today = new Date();
  const d = new Date(date);

  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
};

// Hulpfunctie om te bepalen of een datum gisteren was
export const isYesterday = date => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const d = new Date(date);

  return (
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear()
  );
};

// Formatteer een datum relatief (bijv. "Vandaag", "Gisteren", of datum)
export const formatRelativeDate = date => {
  if (isToday(date)) {
    return 'Vandaag';
  } else if (isYesterday(date)) {
    return 'Gisteren';
  } else {
    return formatDateToReadable(date);
  }
};
