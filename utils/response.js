// utils/response.js — standardised API response helpers

const success = (res, data, message = 'Success', statusCode = 200) =>
  res.status(statusCode).json({ success: true, message, data });

const created = (res, data, message = 'Created') =>
  success(res, data, message, 201);

const paginated = (res, data, pagination, message = 'Success') =>
  res.json({ success: true, message, data, pagination });

const fail = (res, message = 'Bad request', statusCode = 400, errors = null) =>
  res.status(statusCode).json({ success: false, message, ...(errors && { errors }) });

const notFound = (res, message = 'Resource not found') =>
  fail(res, message, 404);

const unauthorized = (res, message = 'Unauthorized') =>
  fail(res, message, 401);

module.exports = { success, created, paginated, fail, notFound, unauthorized };
