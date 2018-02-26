export default (sequelize, { TEXT, SMALLINT, INTEGER, DATE, NOW }) => {
  const Review = sequelize.define("review_view", {
    reviewdate: {
      type: DATE,
      defaultValue: NOW
    },
    stars: {
      type: SMALLINT,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 5
      }
    },
    counthelpful: INTEGER,
    countunhelpful: INTEGER,
    countcomment: INTEGER,
    reviewtext: TEXT
  });

  Review.associate = models => {
    Review.belongsTo(models.Unit, { foreignKey: "unitid" });
    Review.belongsTo(models.App, { foreignKey: "appid" });
    Review.belongsTo(models.Review, { foreignKey: "answerto" });
    Review.belongsTo(models.Human, { foreignKey: "humanid" });
  };

  return Review;
};
