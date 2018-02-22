export default (sequelize, { TEXT, SMALLINT, DATE, NOW }) => {
  const Review = sequelize.define("reviews", {
    reviewdate: {
      type: DATE,
      defaultValue: NOW
    },
    stars: {
      type: SMALLINT,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: 1,
        max: 5
      }
    },
    reviewtext: TEXT
  });

  Review.associate = models => {
    Review.belongsTo(models.Unit, { foreignKey: "unitid" });
    Review.belongsTo(models.App, { foreignKey: "appid" });
    Review.belongsTo(models.Review, { foreignKey: "answerto" });
  };

  return Review;
};
