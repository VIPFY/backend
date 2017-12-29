import { requiresAuth } from "../../helpers/permissions";

export default {
  writeReview: requiresAuth.createResolver(
    async (parent, { userid, appid, stars, text }, { models }) => {
      const app = await models.App.findById(appid);
      const user = await models.User.findById(userid);

      if (!app || !user) {
        return {
          ok: false,
          error: "App or User doesn't exist!"
        };
      } else if (stars > 5 || stars < 1) {
        return {
          ok: false,
          error: "Rating must be between 1 and 5 stars!"
        };
      } else {
        try {
          const review = await models.Review.create({
            stars,
            reviewtext: text,
            userid,
            appid
          });
          return {
            ok: true,
            message: text
          };
        } catch (err) {
          return {
            ok: false,
            error: err.message
          };
        }
      }
    }
  ),

  rateReview: async (parent, { reviewid, userid, balance }, { models }) => {
    const commenter = await models.User.findById(userid);
    const review = await models.Review.findById(reviewid);
    const changeRating = await models.ReviewHelpful.findOne({
      where: {
        reviewid,
        userid
      }
    });

    if (!review) {
      return {
        ok: false,
        error: "Review doesn't exist!"
      };
    } else if (!commenter) {
      return {
        ok: false,
        error: "User doesn't exist!"
      };
    } else if (!changeRating) {
      try {
        const rate = await models.ReviewHelpful.create({
          balance,
          reviewid,
          userid
        });

        return {
          ok: true,
          message: "Review rated"
        };
      } catch (err) {
        return {
          ok: false,
          error: err.message
        };
      }
    } else {
      if (changeRating.balance == balance) {
        return {
          ok: false,
          error: `This is the same value: ${balance}`
        };
      }
      try {
        const changing = await models.ReviewHelpful.update(
          { balance },
          {
            where: {
              userid,
              reviewid
            }
          }
        );
        return {
          ok: true,
          message: "Rating changed"
        };
      } catch (err) {
        return {
          ok: false,
          error: err.message
        };
      }
    }
  }
};
