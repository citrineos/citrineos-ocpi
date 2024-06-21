import { IRestResponse } from "typed-rest-client";

export class UnsuccessfulRequestException extends Error {
  iRestResponse?: IRestResponse<any>;

  constructor(message: string, iRestResponse?: IRestResponse<any>) {
    super(message);
    this.name = "UnsuccessfulRequestException";
    this.iRestResponse = iRestResponse;
  }
}
