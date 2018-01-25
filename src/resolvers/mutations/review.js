import { requiresAuth } from "../../helpers/permissions";

export default {
  writeReview: requiresAuth.createResolver(
    async (parent, { userid, appid, stars, text }, { models }) => {
      const p1 = models.App.findById(appid);
      const p2 = models.User.findById(userid);
      const [app, user] = await Promise.all([p1, p2]);

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
            id: review.id
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

  rateReview: requiresAuth.createResolver(
    async (parent, { reviewid, userid, balance }, { models }) => {
      const p1 = models.User.findById(userid);
      const p2 = models.Review.findById(reviewid);
      const p3 = models.ReviewHelpful.findOne({
        where: {
          reviewid,
          userid
        }
      });
      const [commenter, review, changeRating] = await Promise.all([p1, p2, p3]);

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
            balance
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
            balance
          };
        } catch (err) {
          return {
            ok: false,
            error: err.message
          };
        }
      }
    }
  )
};
