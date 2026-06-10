/**
 * Helper to adjust an itinerary timeline to match actual resolved driveTime.
 *
 * @param {Array<{time: string, action: string}>} itinerary
 * @param {number} driveTimeSeconds
 * @returns {Array<{time: string, action: string}>}
 */
export function adjustItinerary(itinerary, driveTimeSeconds) {
  if (!itinerary || itinerary.length < 2) {
    return itinerary;
  }

  if (driveTimeSeconds === undefined || driveTimeSeconds === null || typeof driveTimeSeconds !== 'number') {
    return itinerary;
  }

  const driveTimeMinutes = Math.round(driveTimeSeconds / 60);

  // Helper to parse time string "HH:MM" or "HH:MM AM/PM" to minutes from midnight
  const parseTimeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (!match) {
      const parts = timeStr.split(':').map(Number);
      return (parts[0] || 0) * 60 + (parts[1] || 0);
    }
    let [_, hours, minutes, ampm] = match;
    hours = parseInt(hours, 10);
    minutes = parseInt(minutes, 10);
    if (ampm) {
      const isPm = ampm.toUpperCase() === 'PM';
      if (isPm && hours < 12) hours += 12;
      if (!isPm && hours === 12) hours = 0;
    }
    return hours * 60 + minutes;
  };

  const formatMinutesToTime = (minutes) => {
    const normalized = ((minutes % 1440) + 1440) % 1440;
    const h = Math.floor(normalized / 60);
    const m = normalized % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const oldTimes = itinerary.map(item => parseTimeToMinutes(item.time));
  const newTimes = [...oldTimes];

  // 1. Depart time (index 0) remains the same
  // 2. Arrival time (index 1) = depart time + driveTimeMinutes
  newTimes[1] = oldTimes[0] + driveTimeMinutes;

  // 3. Shift all intermediate times by the difference
  const originalArrival = oldTimes[1];
  const newArrival = newTimes[1];
  const offset = newArrival - originalArrival;

  const n = itinerary.length;
  for (let i = 1; i < n - 1; i++) {
    newTimes[i] = oldTimes[i] + offset;
  }

  // 4. Return arrival time (index N-1) = return departure time (index N-2) + driveTimeMinutes
  newTimes[n - 1] = newTimes[n - 2] + driveTimeMinutes;

  return itinerary.map((item, idx) => ({
    ...item,
    time: formatMinutesToTime(newTimes[idx])
  }));
}
