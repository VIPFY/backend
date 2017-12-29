export default (sequelize, { TEXT, INTEGER, DATE, NOW }) => {
  const Review = sequelize.define("review", {
    reviewdate: {
      type: DATE,
      defaultValue: NOW
    },
    stars: {
      type: INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: 1,
        max: 5
      }
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
