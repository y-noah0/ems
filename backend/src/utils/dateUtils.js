/**
 * Ensures a date is stored in UTC format
 * @param {Date|String} date - Date to convert
 * @returns {Date} UTC date
 */
exports.toUTC = (date) => {
  if (!date) return null;
  
  const dateObj = date instanceof Date ? date : new Date(date);
  
  if (isNaN(dateObj.getTime())) {
    throw new Error('Invalid date format');
  }
  
  // Ensure the date is in UTC
  return new Date(Date.UTC(
    dateObj.getUTCFullYear(),
    dateObj.getUTCMonth(),
    dateObj.getUTCDate(),
    dateObj.getUTCHours(),
    dateObj.getUTCMinutes(),
    dateObj.getUTCSeconds()
  ));
};

/**
 * Compares if two dates are the same moment in time
 * @param {Date} date1 - First date
 * @param {Date} date2 - Second date
 * @returns {Boolean} True if dates are equal
 */
exports.datesAreEqual = (date1, date2) => {
  if (!date1 || !date2) return false;
  
  const d1 = date1 instanceof Date ? date1 : new Date(date1);
  const d2 = date2 instanceof Date ? date2 : new Date(date2);
  
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
    return false;
  }
  
  return d1.getTime() === d2.getTime();
};

/**
 * Get current date in UTC format
 * @returns {Date} Current UTC date
 */
exports.getCurrentUTC = () => {
  return new Date();
};