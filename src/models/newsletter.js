export default (sequelize, { DATE, NOW, STRING }) => {
  const Newsletter = sequelize.define("newsletter_data", {
    activesince: {
      type: DATE,
      defaultValue: NOW()
    },
    activeuntil: DATE,
    email: STRING
  });

  Newsletter.removeAttribute("id");

  return Newsletter;
};
