export default (sequelize, { TEXT, INTEGER, DATE }) => {
  const Review = sequelize.define(
    "review",
    {
      userid: {
        type: INTEGER,
        allowNull: false
      },
      appid: {
        type: INTEGER,
        allowNull: false
      },
      reviewdate: {
        type: DATE,
        allowNull: false
      },
      stars: {
        type: INTEGER
      },
      reviewtext: {
        type: TEXT
      }
    },
    { timestamps: false }
  );

  return Review;
};
