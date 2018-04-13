/*
This file contains a Higher Order Component which can be used to create
Authentication logic. The base function lets you stack several permissions,
they just have to wrapped around the component which shall be protected.
*/

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

// Check whether the user is authenticated
export const requiresAuth = createResolver(async (parent, args, { token }) => {
  if (!token) {
    throw new Error("Not authenticated!");
  }
});

// These functions can be nested. Here it checks first whether an user
// is authenticated and then if he has admin status.
export const requiresAdmin = requiresAuth.createResolver((parent, args, { token }) => {
  if (!token) {
    throw new Error("Admin not authenticated!");
  }
});
