export default (sequelize, { TEXT, DATE, NOW }) => {
  const Newsletter = sequelize.define("newsletter_data", {
    email: TEXT,
    activesince: {
      type: DATE,
      defaultValue: NOW
    },
    activeuntil: DATE
  });
  Newsletter.removeAttribute("id");

  return Newsletter;
};
