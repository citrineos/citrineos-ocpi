// import { Service } from 'typedi';
// import { ResponseUrlRepository } from '../repository/ResponseUrlRepository';
// import { AsyncReceiverApi } from '../trigger/AsyncReceiverApi';
// import { ActiveChargingProfileResult } from '../model/ActiveChargingProfileResult';
// import { ClearChargingProfileResult } from '../model/ChargingprofilesClearProfileResult';
// import { ChargingProfileResult } from '../model/ChargingProfileResult';
// import { NotFoundError } from 'routing-controllers';
// import { CommandResult } from '../model/CommandResult';
// import { OcpiParams } from '../trigger/util/OcpiParams';

// @Service()
// export class AsyncResponder {
//   constructor(
//     readonly responseUrlRepo: ResponseUrlRepository,
//     readonly asyncResponseApi: AsyncReceiverApi,
//   ) {}

//   async send(
//     correlationId: string,
//     data:
//       | ActiveChargingProfileResult
//       | ClearChargingProfileResult
//       | ChargingProfileResult
//       | CommandResult,
//     params?: OcpiParams,
//   ) {
//     const responseUrlEntity =
//       await this.responseUrlRepo.getResponseUrl(correlationId);
//     if (responseUrlEntity) {
//       params = params ?? responseUrlEntity.params;
//       if (!params) {
//         throw new NotFoundError(
//           `No OcpiParams found for correlationId: ${correlationId}`,
//         );
//       }

//       await this.asyncResponseApi.postAsyncResponse(
//         responseUrlEntity.responseUrl,
//         data,
//         params,
//       );
//     } else {
//       throw new NotFoundError(
//         'No response url found for correlationId: ' + correlationId,
//       );
//     }
//   }
// }
