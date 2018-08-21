export default (sequelize, { TEXT, SMALLINT, DATE, NOW }) => {
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
    counthelpful: SMALLINT,
    countunhelpful: SMALLINT,
    countcomment: SMALLINT,
    reviewtext: TEXT
  });

  Review.associate = ({ Unit, App }) => {
    Review.belongsTo(Unit, { foreignKey: "unitid" });
    Review.belongsTo(App, { foreignKey: "appid" });
    Review.belongsTo(Review, { foreignKey: "answerto" });
  };

  return Review;
};
