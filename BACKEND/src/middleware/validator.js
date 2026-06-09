export const validate = (schema, source = "body") => {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      throw new ApiError(400, result.error.issues[0].message);
    }

    req.validatedData = result.data;

    next();
  };
};
