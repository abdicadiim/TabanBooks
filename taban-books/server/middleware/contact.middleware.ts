import { Request, Response, NextFunction } from "express";
import {
  normalizeContactPersonPayload,
  normalizeCustomerPayload,
  normalizeUnifiedContactPayload,
  normalizeVendorPayload,
  type ContactPayloadMode,
} from "../utils/contactPayload.js";

export const normalizeCustomerRequest =
  (mode: ContactPayloadMode = "create") =>
  (req: Request, _res: Response, next: NextFunction): void => {
    req.body = normalizeCustomerPayload(req.body, mode);
    next();
  };

export const normalizeVendorRequest =
  (mode: ContactPayloadMode = "create") =>
  (req: Request, _res: Response, next: NextFunction): void => {
    req.body = normalizeVendorPayload(req.body, mode);
    next();
  };

export const normalizeUnifiedContactRequest =
  (mode: ContactPayloadMode = "create") =>
  (req: Request, _res: Response, next: NextFunction): void => {
    req.body = normalizeUnifiedContactPayload(req.body, mode);
    next();
  };

export const normalizeContactPersonRequest = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  req.body = normalizeContactPersonPayload(req.body);
  next();
};

