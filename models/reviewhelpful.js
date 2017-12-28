export default (sequelize, { TEXT, INTEGER, DATE, NOW, BOOLEAN }) => {
  const ReviewHelpful = sequelize.define("reviewhelpful", {
    helpfuldate: {
      type: DATE,
      defaulValue: NOW
    },
    balance: BOOLEAN
  });

  ReviewHelpful.associate = models => {
    ReviewHelpful.belongsTo(models.User, { foreignKey: "userid" });
    ReviewHelpful.belongsTo(models.Review, { foreignKey: "reviewid" });
  };

  //Remove autogenerated primary key
  ReviewHelpful.removeAttribute("id");

  return ReviewHelpful;
};
