import { ErrorRequestHandler } from "express";
import { HTTPSTATUS } from "../config/http.config";

export const errorHandler: ErrorRequestHandler = (err, req, res, next): any => {
  console.error(`Error Occured on PATH: ${req.path}`, err);
  if (err instanceof SyntaxError) {
    return res.status(HTTPSTATUS.BAD_RESQUEST).json({
      message: "Invalid JSON format. Please check your request body.",
    });
  }
  return res.status(HTTPSTATUS.INTERNAL_SERVER_ERROR).json({
    message: "Internal Server Error",
    error: err?.message || "Unknown error occurred",
  });
};
