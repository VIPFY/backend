export default (sequelize, { DATE, NOW }) => {
  const Newsletter = sequelize.define("newsletter_data", {
    activesince: {
      type: DATE,
      defaultValue: NOW()
    },
    activeuntil: DATE
  });

  // Newsletter.associate = ({ Email }) => Newsletter.belongsTo(Email, { foreignKey: "email" });

  Newsletter.removeAttribute("id");

  return Newsletter;
};
