const isTimeSlotPassed = (date, endTime) => {
  const now = new Date();
  const slotDate = new Date(date);
  const [hours, minutes] = endTime.split(':');
  
  slotDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  return now > slotDate;
};

module.exports = { isTimeSlotPassed }; 