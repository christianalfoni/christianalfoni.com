export const createReadableDate = (() => {

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

  return function createReadableDate(date: string) {
    const parts = date.split('.')
    
    return `${[months[Number(parts[1]) - 1]]} ${parts[0]}. ${parts[2]}`
  }

})()

export const sortByPublished = (a: { published: string }, b: { published: string }) => {
  return createDate(b.published).getTime() - createDate(a.published).getTime()
}

export const createDate = (stringDate: string) => {
  const dateParts = stringDate.split('.')
  const date = new Date()

  date.setFullYear(Number(dateParts[2]));
  date.setMonth(Number(dateParts[1]) - 1);
  date.setDate(Number(dateParts[0]));

  return date
}