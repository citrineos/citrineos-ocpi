import { TokenDTO } from '../model/DTO/TokenDTO';
import { SingleTokenRequest } from '../model/OcpiToken';
import {TokenType} from "../model/TokenType";

export interface ITokensDatasource {
    getToken(
        tokenRequest: SingleTokenRequest,
    ): Promise<TokenDTO | undefined>;
    updateToken(tokenDto: TokenDTO): Promise<TokenDTO>;
    patchToken(
        countryCode: string,
        partyId: string,
        tokenUid: string,
        type: TokenType,
        partialToken: Partial<TokenDTO>,
    ): Promise<TokenDTO>;
}
