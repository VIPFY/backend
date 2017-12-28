export default (sequelize, { TEXT, INTEGER, DATE }) => {
  const Review = sequelize.define("review", {
    reviewdate: {
      type: DATE,
      allowNull: false
    },
    stars: {
      type: INTEGER
    },
    reviewtext: TEXT,
    answerto: INTEGER
  });

  Review.associate = models => {
    Review.belongsTo(models.User, { foreignKey: "userid" });
    Review.belongsTo(models.App, { foreignKey: "appid" });
  };

  return Review;
};
