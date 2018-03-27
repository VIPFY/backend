export const getDate = () => {
  const time = new Date().getTime();
  return new Date(time).toString();
};
