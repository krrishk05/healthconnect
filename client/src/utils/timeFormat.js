export const convertTo12Hour = (time24) => {
  const [hours, minutes] = time24.split(':');
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes} ${period}`;
};

export const convertTo24Hour = (time12) => {
  const [time, period] = time12.split(' ');
  let [hours, minutes] = time.split(':');
  hours = parseInt(hours);
  
  if (period === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }
  
  return `${hours.toString().padStart(2, '0')}:${minutes}`;
}; 