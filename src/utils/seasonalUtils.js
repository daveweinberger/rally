/**
 * Helper to extract 0-indexed month from a date string.
 * Supports strings like "Wednesday, Jun 3", "Today", "Tomorrow".
 * Defaults to current month if unparseable.
 */
export function getMonthFromDateStr(dateStr) {
  if (!dateStr) return new Date().getMonth();
  const lower = dateStr.toLowerCase();
  
  if (lower.includes('today')) {
    return new Date().getMonth();
  }
  if (lower.includes('tomorrow')) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.getMonth();
  }

  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  for (let i = 0; i < 12; i++) {
    if (lower.includes(months[i])) {
      return i;
    }
  }
  return new Date().getMonth();
}

/**
 * Detects if the location is in the Southern Hemisphere.
 * Uses exact coordinate latitude (if lat is a number) or key Southern Hemisphere keywords.
 */
export function isSouthernHemisphere(lat, locationText) {
  if (typeof lat === 'number') {
    return lat < 0;
  }
  if (!locationText) return false;
  
  const lower = locationText.toLowerCase();
  const southernKeywords = [
    'australia', 'nz', 'new zealand', 'sydney', 'melbourne', 'auckland', 'christchurch', 
    'santiago', 'chile', 'argentina', 'bariloche', 'south africa', 'cape town', 'johannesburg',
    'perth', 'brisbane', 'adelaide', 'tasmania', 'queenstown', 'patagonia', 'andes', 'brazil',
    'rio de janeiro', 'sao paulo', 'buenos aires', 'lima', 'peru', 'bolivia', 'ecuador'
  ];
  return southernKeywords.some(kw => lower.includes(kw));
}

/**
 * Returns seasonal status of an activity based on month, hemisphere, and activity type.
 * Returns: 'in-season' | 'shoulder' | 'off-season'
 */
export function getActivitySeasonStatus(activity, dateStr, lat, locationText) {
  const month = getMonthFromDateStr(dateStr);
  const isSouthern = isSouthernHemisphere(lat, locationText);

  if (activity === 'Snowboarding/Skiing') {
    if (isSouthern) {
      // Southern Hemisphere: high winter is Jun-Sep, shoulder is May & Oct, off-season is Nov-Apr
      if ([5, 6, 7, 8].includes(month)) return 'in-season';
      if ([4, 9].includes(month)) return 'shoulder';
      return 'off-season';
    } else {
      // Northern Hemisphere: high winter is Nov-Mar, shoulder is Apr-May, off-season is Jun-Oct
      if ([10, 11, 0, 1, 2].includes(month)) return 'in-season';
      if ([3, 4].includes(month)) return 'shoulder';
      return 'off-season';
    }
  }

  if (activity === 'Kayaking') {
    if (isSouthern) {
      // Southern Hemisphere: high summer is Dec-Mar, shoulder is Nov & Apr, off-season is May-Oct
      if ([11, 0, 1, 2].includes(month)) return 'in-season';
      if ([10, 3].includes(month)) return 'shoulder';
      return 'off-season';
    } else {
      // Northern Hemisphere: high summer is Jun-Sep, shoulder is May & Oct, off-season is Nov-Apr
      if ([5, 6, 7, 8].includes(month)) return 'in-season';
      if ([4, 9].includes(month)) return 'shoulder';
      return 'off-season';
    }
  }

  return 'in-season';
}
