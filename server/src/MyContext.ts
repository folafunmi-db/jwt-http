import { Request, Response } from "express";

export interface MyContext {
  payload?: any;
	req: Request;
	res: Response;
}
