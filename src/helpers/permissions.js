//Higher order component
const createResolver = resolver => {
  const baseResolver = resolver;
  baseResolver.createResolver = childResolver => {
    const newResolver = async (parent, args, context, info) => {
      await resolver(parent, args, context, info);
      return childResolver(parent, args, context, info);
    };
    return createResolver(newResolver);
  };
  return baseResolver;
};

//Check whether the user is authenticated
export const requiresAuth = createResolver((parent, args, { user }) => {
  if (!user || !user.id) {
    throw new Error("Not authenticated!");
  }
});

//These functions can be nested. Here it checks first whether an user
//is authenticated and then if he has admin status.
export const requiresAdmin = requiresAuth.createResolver(
  (parent, args, context) => {
    if (!context.user.isAdmin) {
      throw new Error("Requires admin privileges");
    }
  }
);
