// This is a helper function to load the proper environment variables

export const selectEnv = environment => {
  switch (environment) {
    case "development":
      return ".env.dev";

    case "production":
      return ".env.prod";

    case "testing":
      return ".env.test";
  }
};
